import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import ConversationFlowManager from '../ConversationFlowManager';
import type { Conversation, ChatMessage } from '../../../types';

// Mock the hooks
vi.mock('../../../hooks/useConversation', () => ({
  default: vi.fn(),
}));

vi.mock('../../../hooks/useWebSocket', () => ({
  default: vi.fn(),
}));

const mockUseConversation = vi.mocked(
  await import('../../../hooks/useConversation')
).default;
const mockUseWebSocket = vi.mocked(
  await import('../../../hooks/useWebSocket')
).default;

const mockConversation: Conversation = {
  id: 'conv-1',
  title: 'Test Conversation',
  description: 'Test description',
  status: 'active',
  appIdea: 'A task management app',
  targetUsers: ['developers'],
  complexity: 'moderate',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    conversationId: 'conv-1',
    persona: null,
    content: 'I want to build a task management app',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    type: 'user',
  },
  {
    id: '2',
    conversationId: 'conv-1',
    persona: {
      id: 'pm-1',
      name: 'Sarah',
      role: 'product-manager',
      avatar: '👔',
      color: '#8B5CF6',
      expertise: ['Product Strategy'],
    },
    content: 'That sounds great! Can you tell me more about your target users?',
    timestamp: new Date('2024-01-01T10:01:00Z'),
    type: 'ai',
  },
];

describe('ConversationFlowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseConversation.mockReturnValue({
      conversation: mockConversation,
      messages: mockMessages,
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      createConversation: vi.fn(),
      loadConversation: vi.fn(),
    });

    mockUseWebSocket.mockReturnValue({
      isConnected: true,
      isTyping: false,
      typingPersona: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      joinConversation: vi.fn(),
    });
  });

  it('renders conversation interface when conversation exists', () => {
    render(<ConversationFlowManager conversationId="conv-1" />);

    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    expect(
      screen.getByText('I want to build a task management app')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'That sounds great! Can you tell me more about your target users?'
      )
    ).toBeInTheDocument();
  });

  it('shows loading state when conversation is loading', () => {
    mockUseConversation.mockReturnValue({
      conversation: null,
      messages: [],
      isLoading: true,
      error: null,
      sendMessage: vi.fn(),
      createConversation: vi.fn(),
      loadConversation: vi.fn(),
    });

    render(<ConversationFlowManager conversationId="conv-1" />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading conversation...')).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    mockUseConversation.mockReturnValue({
      conversation: null,
      messages: [],
      isLoading: false,
      error: 'Failed to load conversation',
      sendMessage: vi.fn(),
      createConversation: vi.fn(),
      loadConversation: vi.fn(),
    });

    render(<ConversationFlowManager conversationId="conv-1" />);

    expect(screen.getByText('Error loading conversation')).toBeInTheDocument();
    expect(screen.getByText('Failed to load conversation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows conversation starter when no conversation exists', () => {
    mockUseConversation.mockReturnValue({
      conversation: null,
      messages: [],
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      createConversation: vi.fn(),
      loadConversation: vi.fn(),
    });

    render(<ConversationFlowManager />);

    expect(
      screen.getByText('Start Your AI Team Conversation')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Describe your app idea...')
    ).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    const mockSendMessage = vi.fn();
    mockUseConversation.mockReturnValue({
      conversation: mockConversation,
      messages: mockMessages,
      isLoading: false,
      error: null,
      sendMessage: mockSendMessage,
      createConversation: vi.fn(),
      loadConversation: vi.fn(),
    });

    const user = userEvent.setup();
    render(<ConversationFlowManager conversationId="conv-1" />);

    const chatInput = screen.getByPlaceholderText('Type your message...');
    await user.type(chatInput, 'The target users are developers');

    const sendButton = screen.getByRole('button', { name: 'Send' });
    await user.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith(
      'The target users are developers'
    );
  });

  it('shows typing indicator when AI is typing', () => {
    mockUseWebSocket.mockReturnValue({
      isConnected: true,
      isTyping: true,
      typingPersona: {
        id: 'pm-1',
        name: 'Sarah',
        role: 'product-manager',
        avatar: '👔',
        color: '#8B5CF6',
        expertise: ['Product Strategy'],
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      joinConversation: vi.fn(),
    });

    render(<ConversationFlowManager conversationId="conv-1" />);

    expect(screen.getByText('Sarah is typing...')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    mockUseWebSocket.mockReturnValue({
      isConnected: false,
      isTyping: false,
      typingPersona: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      joinConversation: vi.fn(),
    });

    render(<ConversationFlowManager conversationId="conv-1" />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('handles conversation creation', async () => {
    const mockCreateConversation = vi.fn().mockResolvedValue(mockConversation);
    mockUseConversation.mockReturnValue({
      conversation: null,
      messages: [],
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      createConversation: mockCreateConversation,
      loadConversation: vi.fn(),
    });

    const user = userEvent.setup();
    render(<ConversationFlowManager />);

    const textarea = screen.getByPlaceholderText('Describe your app idea...');
    await user.type(textarea, 'A task management app for remote teams');

    const startButton = screen.getByRole('button', {
      name: 'Start Conversation',
    });
    await user.click(startButton);

    expect(mockCreateConversation).toHaveBeenCalledWith({
      appIdea: 'A task management app for remote teams',
      targetUsers: [],
      complexity: undefined,
    });
  });

  it('shows specifications ready state', () => {
    const completedConversation = {
      ...mockConversation,
      status: 'completed' as const,
    };

    mockUseConversation.mockReturnValue({
      conversation: completedConversation,
      messages: mockMessages,
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      createConversation: vi.fn(),
      loadConversation: vi.fn(),
    });

    render(<ConversationFlowManager conversationId="conv-1" />);

    expect(screen.getByText('Specifications Ready')).toBeInTheDocument();
    expect(screen.getByText('Preview Specifications')).toBeInTheDocument();
  });

  it('handles retry on error', async () => {
    const mockLoadConversation = vi.fn();
    mockUseConversation.mockReturnValue({
      conversation: null,
      messages: [],
      isLoading: false,
      error: 'Failed to load conversation',
      sendMessage: vi.fn(),
      createConversation: vi.fn(),
      loadConversation: mockLoadConversation,
    });

    const user = userEvent.setup();
    render(<ConversationFlowManager conversationId="conv-1" />);

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    await user.click(retryButton);

    expect(mockLoadConversation).toHaveBeenCalledWith('conv-1');
  });

  it('shows conflict resolution when personas disagree', () => {
    const messagesWithConflict = [
      ...mockMessages,
      {
        id: '3',
        conversationId: 'conv-1',
        persona: {
          id: 'tl-1',
          name: 'Alex',
          role: 'tech-lead',
          avatar: '💻',
          color: '#3B82F6',
          expertise: ['Architecture'],
        },
        content: 'I disagree with the Product Manager approach...',
        timestamp: new Date('2024-01-01T10:02:00Z'),
        type: 'ai',
        metadata: { hasConflict: true },
      },
    ];

    mockUseConversation.mockReturnValue({
      conversation: mockConversation,
      messages: messagesWithConflict,
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      createConversation: vi.fn(),
      loadConversation: vi.fn(),
    });

    render(<ConversationFlowManager conversationId="conv-1" />);

    expect(screen.getByTestId('conflict-resolution')).toBeInTheDocument();
  });

  it('handles WebSocket connection and disconnection', () => {
    const mockConnect = vi.fn();
    const mockDisconnect = vi.fn();
    const mockJoinConversation = vi.fn();

    mockUseWebSocket.mockReturnValue({
      isConnected: true,
      isTyping: false,
      typingPersona: null,
      connect: mockConnect,
      disconnect: mockDisconnect,
      sendMessage: vi.fn(),
      joinConversation: mockJoinConversation,
    });

    const { unmount } = render(
      <ConversationFlowManager conversationId="conv-1" />
    );

    expect(mockConnect).toHaveBeenCalled();
    expect(mockJoinConversation).toHaveBeenCalledWith('conv-1');

    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
