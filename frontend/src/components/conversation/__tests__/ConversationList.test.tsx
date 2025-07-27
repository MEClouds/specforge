import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ConversationList from '../ConversationList';
import type { Conversation } from '../../../types';

const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Task Management App',
    description: 'A task management app for remote teams',
    status: 'completed',
    appIdea: 'I want to build a task management app for remote teams',
    targetUsers: ['developers', 'project managers'],
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
    targetUsers: ['small business owners'],
    complexity: 'complex',
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:30:00Z'),
  },
  {
    id: 'conv-3',
    title: 'Weather App',
    description: 'A simple weather application',
    status: 'archived',
    appIdea: 'Simple weather app for mobile users',
    targetUsers: ['general users'],
    complexity: 'simple',
    createdAt: new Date('2024-01-03T10:00:00Z'),
    updatedAt: new Date('2024-01-03T10:15:00Z'),
  },
];

const mockOnSelect = vi.fn();
const mockOnDelete = vi.fn();

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ConversationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conversation list', () => {
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Task Management App')).toBeInTheDocument();
    expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
    expect(screen.getByText('Weather App')).toBeInTheDocument();
  });

  it('shows conversation status badges', () => {
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('shows conversation complexity', () => {
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Simple')).toBeInTheDocument();
  });

  it('shows target users', () => {
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('developers')).toBeInTheDocument();
    expect(screen.getByText('project managers')).toBeInTheDocument();
    expect(screen.getByText('small business owners')).toBeInTheDocument();
    expect(screen.getByText('general users')).toBeInTheDocument();
  });

  it('handles conversation selection', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const conversationItem = screen
      .getByText('Task Management App')
      .closest('div');
    await user.click(conversationItem!);

    expect(mockOnSelect).toHaveBeenCalledWith(mockConversations[0]);
  });

  it('handles conversation deletion', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Should show confirmation dialog
    expect(screen.getByText('Delete Conversation')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this conversation?')
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledWith('conv-1');
  });

  it('cancels conversation deletion', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete Conversation')).not.toBeInTheDocument();
  });

  it('shows empty state when no conversations', () => {
    renderWithRouter(
      <ConversationList
        conversations={[]}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Start your first conversation to generate specifications'
      )
    ).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithRouter(
      <ConversationList
        conversations={[]}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading conversations...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithRouter(
      <ConversationList
        conversations={[]}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        error="Failed to load conversations"
      />
    );

    expect(screen.getByText('Error loading conversations')).toBeInTheDocument();
    expect(
      screen.getByText('Failed to load conversations')
    ).toBeInTheDocument();
  });

  it('filters conversations by status', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const statusFilter = screen.getByLabelText('Filter by status');
    await user.selectOptions(statusFilter, 'active');

    expect(screen.getByText('E-commerce Platform')).toBeInTheDocument();
    expect(screen.queryByText('Task Management App')).not.toBeInTheDocument();
    expect(screen.queryByText('Weather App')).not.toBeInTheDocument();
  });

  it('filters conversations by complexity', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const complexityFilter = screen.getByLabelText('Filter by complexity');
    await user.selectOptions(complexityFilter, 'simple');

    expect(screen.getByText('Weather App')).toBeInTheDocument();
    expect(screen.queryByText('Task Management App')).not.toBeInTheDocument();
    expect(screen.queryByText('E-commerce Platform')).not.toBeInTheDocument();
  });

  it('searches conversations by title', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search conversations...');
    await user.type(searchInput, 'task');

    expect(screen.getByText('Task Management App')).toBeInTheDocument();
    expect(screen.queryByText('E-commerce Platform')).not.toBeInTheDocument();
    expect(screen.queryByText('Weather App')).not.toBeInTheDocument();
  });

  it('sorts conversations by date', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'oldest');

    const conversationItems = screen.getAllByTestId('conversation-item');
    expect(conversationItems[0]).toHaveTextContent('Task Management App');
    expect(conversationItems[2]).toHaveTextContent('Weather App');
  });

  it('shows formatted dates', () => {
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 2, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 3, 2024')).toBeInTheDocument();
  });

  it('highlights selected conversation', () => {
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
        selectedId="conv-1"
      />
    );

    const selectedItem = screen.getByText('Task Management App').closest('div');
    expect(selectedItem).toHaveClass('ring-2', 'ring-primary-500');
  });

  it('shows conversation descriptions', () => {
    renderWithRouter(
      <ConversationList
        conversations={mockConversations}
        onSelect={mockOnSelect}
        onDelete={mockOnDelete}
      />
    );

    expect(
      screen.getByText('A task management app for remote teams')
    ).toBeInTheDocument();
    expect(
      screen.getByText('An e-commerce platform for small businesses')
    ).toBeInTheDocument();
    expect(
      screen.getByText('A simple weather application')
    ).toBeInTheDocument();
  });
});
