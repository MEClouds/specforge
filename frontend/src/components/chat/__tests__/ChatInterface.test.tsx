import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from '../ChatInterface';
import { useAppStore } from '../../../store';
import { useWebSocket } from '../../../hooks/useWebSocket';

// Mock the store
vi.mock('../../../store', () => ({
  useAppStore: vi.fn(),
}));

// Mock the useWebSocket hook
vi.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

// Mock child components
vi.mock('../MessageList', () => ({
  default: ({ messages, typingPersona }: any) => (
    <div data-testid="message-list">
      Messages: {messages.length}
      {typingPersona && (
        <div data-testid="typing-indicator">Typing: {typingPersona}</div>
      )}
    </div>
  ),
}));

vi.mock('../ChatInput', () => ({
  default: ({ onSendMessage, disabled, placeholder }: any) => (
    <div data-testid="chat-input">
      <input
        data-testid="message-input"
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === 'test message') {
            onSendMessage('test message');
          }
        }}
      />
    </div>
  ),
}));

vi.mock('../PersonaIndicator', () => ({
  default: ({ activePersonas, currentTypingPersona }: any) => (
    <div data-testid="persona-indicator">
      Active: {activePersonas.length}
      {currentTypingPersona && <div>Typing: {currentTypingPersona}</div>}
    </div>
  ),
}));

vi.mock('../../ui/ConnectionStatus', () => ({
  default: ({ status, onReconnect }: any) => (
    <div data-testid="connection-status">
      Status: {status}
      {onReconnect && (
        <button onClick={onReconnect} data-testid="reconnect-button">
          Reconnect
        </button>
      )}
    </div>
  ),
}));

describe('ChatInterface', () => {
  const mockStore = {
    conversation: {
      messages: [],
      activePersonas: [],
      isGenerating: false,
      current: {
        id: 'test-conversation',
        appIdea: 'Test app',
        targetUsers: ['developers'],
        complexity: 'moderate',
      },
    },
    ui: {
      isTyping: false,
      currentTypingPersona: null,
    },
  };

  const mockWebSocket = {
    connectionStatus: 'connected' as const,
    isConnected: true,
    sendMessage: vi.fn(),
    requestAIResponse: vi.fn(),
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
    reconnect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue(mockStore);
    (useWebSocket as any).mockReturnValue(mockWebSocket);
  });

  it('should render all components when connected', () => {
    render(<ChatInterface conversationId="test-conversation" />);

    expect(screen.getByTestId('persona-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument(); // Hidden when connected
  });

  it('should show connection status when not connected', () => {
    (useWebSocket as any).mockReturnValue({
      ...mockWebSocket,
      connectionStatus: 'disconnected',
      isConnected: false,
    });

    render(<ChatInterface conversationId="test-conversation" />);

    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    expect(screen.getByText('Status: disconnected')).toBeInTheDocument();
  });

  it('should handle message sending', () => {
    render(<ChatInterface conversationId="test-conversation" />);

    const input = screen.getByTestId('message-input');
    fireEvent.change(input, { target: { value: 'test message' } });

    expect(mockWebSocket.sendMessage).toHaveBeenCalledWith('test message');
  });

  it('should disable input when not connected', () => {
    (useWebSocket as any).mockReturnValue({
      ...mockWebSocket,
      connectionStatus: 'disconnected',
      isConnected: false,
    });

    render(<ChatInterface conversationId="test-conversation" />);

    const input = screen.getByTestId('message-input');
    expect(input).toBeDisabled();
  });

  it('should disable input when generating', () => {
    (useAppStore as any).mockReturnValue({
      ...mockStore,
      conversation: {
        ...mockStore.conversation,
        isGenerating: true,
      },
    });

    render(<ChatInterface conversationId="test-conversation" />);

    const input = screen.getByTestId('message-input');
    expect(input).toBeDisabled();
  });

  it('should show typing indicator', () => {
    (useAppStore as any).mockReturnValue({
      ...mockStore,
      ui: {
        isTyping: true,
        currentTypingPersona: 'product-manager',
      },
    });

    render(<ChatInterface conversationId="test-conversation" />);

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    expect(screen.getAllByText('Typing: product-manager')).toHaveLength(2); // One in PersonaIndicator, one in MessageList
  });

  it('should handle reconnection', () => {
    (useWebSocket as any).mockReturnValue({
      ...mockWebSocket,
      connectionStatus: 'disconnected',
      isConnected: false,
    });

    render(<ChatInterface conversationId="test-conversation" />);

    const reconnectButton = screen.getByTestId('reconnect-button');
    fireEvent.click(reconnectButton);

    expect(mockWebSocket.reconnect).toHaveBeenCalled();
  });

  it('should show appropriate placeholder based on connection status', () => {
    // Test connecting state
    (useWebSocket as any).mockReturnValue({
      ...mockWebSocket,
      connectionStatus: 'connecting',
      isConnected: false,
    });

    const { rerender } = render(
      <ChatInterface conversationId="test-conversation" />
    );
    expect(
      screen.getByPlaceholderText('Connecting to server...')
    ).toBeInTheDocument();

    // Test reconnecting state
    (useWebSocket as any).mockReturnValue({
      ...mockWebSocket,
      connectionStatus: 'reconnecting',
      isConnected: false,
    });

    rerender(<ChatInterface conversationId="test-conversation" />);
    expect(screen.getByPlaceholderText('Reconnecting...')).toBeInTheDocument();

    // Test disconnected state
    (useWebSocket as any).mockReturnValue({
      ...mockWebSocket,
      connectionStatus: 'disconnected',
      isConnected: false,
    });

    rerender(<ChatInterface conversationId="test-conversation" />);
    expect(
      screen.getByPlaceholderText('Disconnected from server')
    ).toBeInTheDocument();
  });

  it('should request AI response when user sends message', async () => {
    const mockStoreWithMessages = {
      ...mockStore,
      conversation: {
        ...mockStore.conversation,
        messages: [
          {
            id: '1',
            conversationId: 'test-conversation',
            content: 'Hello',
            type: 'user',
            persona: null,
            timestamp: new Date(),
          },
        ],
      },
    };

    (useAppStore as any).mockReturnValue(mockStoreWithMessages);

    render(<ChatInterface conversationId="test-conversation" />);

    // Wait for the effect to trigger AI response request
    await waitFor(() => {
      expect(mockWebSocket.requestAIResponse).toHaveBeenCalled();
    });
  });
});
