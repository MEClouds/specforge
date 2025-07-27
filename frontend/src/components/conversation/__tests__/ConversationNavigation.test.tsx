import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ConversationNavigation from '../ConversationNavigation';
import type { Conversation } from '../../../types';

const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Task Management App',
    description: 'A task management app for remote teams',
    status: 'completed',
    appIdea: 'I want to build a task management app for remote teams',
    targetUsers: ['developers'],
    complexity: 'moderate',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T11:00:00Z'),
  },
  {
    id: 'conv-2',
    title: 'E-commerce Platform',
    description: 'An e-commerce platform for small businesses',
    status: 'active',
    appIdea: 'I want to create an e-commerce platform',
    targetUsers: ['business owners'],
    complexity: 'complex',
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:30:00Z'),
  },
];

const mockOnNewConversation = vi.fn();

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ConversationNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation with conversations', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Task Management App')).toBeInTheDocument();
    expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
  });

  it('shows new conversation button', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    expect(
      screen.getByRole('button', { name: 'New Conversation' })
    ).toBeInTheDocument();
  });

  it('handles new conversation click', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    const newButton = screen.getByRole('button', { name: 'New Conversation' });
    await user.click(newButton);

    expect(mockOnNewConversation).toHaveBeenCalled();
  });

  it('highlights current conversation', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    const currentItem = screen.getByText('Task Management App').closest('a');
    expect(currentItem).toHaveClass('bg-primary-50', 'text-primary-700');
  });

  it('shows conversation status indicators', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    expect(screen.getByText('✓')).toBeInTheDocument(); // Completed status
    expect(screen.getByText('●')).toBeInTheDocument(); // Active status
  });

  it('shows conversation links', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    const taskLink = screen.getByRole('link', { name: /Task Management App/ });
    expect(taskLink).toHaveAttribute('href', '/conversation/conv-1');

    const ecommerceLink = screen.getByRole('link', {
      name: /E-commerce Platform/,
    });
    expect(ecommerceLink).toHaveAttribute('href', '/conversation/conv-2');
  });

  it('shows empty state when no conversations', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={[]}
        currentConversationId={null}
        onNewConversation={mockOnNewConversation}
      />
    );

    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    expect(
      screen.getByText('Start your first conversation')
    ).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={[]}
        currentConversationId={null}
        onNewConversation={mockOnNewConversation}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows conversation count', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    expect(screen.getByText('2 conversations')).toBeInTheDocument();
  });

  it('truncates long conversation titles', () => {
    const longTitleConversation = {
      ...mockConversations[0],
      title:
        'This is a very long conversation title that should be truncated to fit in the navigation',
    };

    renderWithRouter(
      <ConversationNavigation
        conversations={[longTitleConversation]}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    const titleElement = screen.getByText(
      /This is a very long conversation title/
    );
    expect(titleElement).toHaveClass('truncate');
  });

  it('shows recent conversations first', () => {
    const recentConversations = [
      {
        ...mockConversations[1],
        updatedAt: new Date('2024-01-03T10:00:00Z'),
      },
      {
        ...mockConversations[0],
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      },
    ];

    renderWithRouter(
      <ConversationNavigation
        conversations={recentConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    const conversationItems = screen.getAllByRole('link');
    expect(conversationItems[0]).toHaveTextContent('E-commerce Platform');
    expect(conversationItems[1]).toHaveTextContent('Task Management App');
  });

  it('shows keyboard shortcuts hint', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
  });

  it('handles keyboard shortcut for new conversation', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    await user.keyboard('{Control>}n{/Control}');

    expect(mockOnNewConversation).toHaveBeenCalled();
  });

  it('shows conversation timestamps', () => {
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    expect(screen.getByText('Jan 1')).toBeInTheDocument();
    expect(screen.getByText('Jan 2')).toBeInTheDocument();
  });

  it('collapses and expands navigation', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationNavigation
        conversations={mockConversations}
        currentConversationId="conv-1"
        onNewConversation={mockOnNewConversation}
      />
    );

    const collapseButton = screen.getByRole('button', {
      name: 'Collapse navigation',
    });
    await user.click(collapseButton);

    expect(screen.queryByText('Task Management App')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Expand navigation' })
    ).toBeInTheDocument();
  });
});
