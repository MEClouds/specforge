import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import ConversationStarter from '../ConversationStarter';

const mockOnStart = vi.fn();

describe('ConversationStarter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the conversation starter form', () => {
    render(<ConversationStarter onStart={mockOnStart} />);

    expect(
      screen.getByText('Start Your AI Team Conversation')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Describe your app idea...')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start Conversation' })
    ).toBeInTheDocument();
  });

  it('shows validation error for empty input', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    const startButton = screen.getByRole('button', {
      name: 'Start Conversation',
    });
    await user.click(startButton);

    expect(
      screen.getByText('Please describe your app idea')
    ).toBeInTheDocument();
    expect(mockOnStart).not.toHaveBeenCalled();
  });

  it('shows validation error for too short input', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    const textarea = screen.getByPlaceholderText('Describe your app idea...');
    await user.type(textarea, 'app');

    const startButton = screen.getByRole('button', {
      name: 'Start Conversation',
    });
    await user.click(startButton);

    expect(
      screen.getByText(
        'Please provide more details about your app idea (minimum 20 characters)'
      )
    ).toBeInTheDocument();
    expect(mockOnStart).not.toHaveBeenCalled();
  });

  it('calls onStart with valid input', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    const textarea = screen.getByPlaceholderText('Describe your app idea...');
    const appIdea =
      'I want to build a task management app for remote teams with real-time collaboration features';
    await user.type(textarea, appIdea);

    const startButton = screen.getByRole('button', {
      name: 'Start Conversation',
    });
    await user.click(startButton);

    expect(mockOnStart).toHaveBeenCalledWith({
      appIdea,
      targetUsers: [],
      complexity: undefined,
    });
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    const textarea = screen.getByPlaceholderText('Describe your app idea...');
    await user.type(textarea, 'Hello world');

    expect(screen.getByText('11 / 1000')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<ConversationStarter onStart={mockOnStart} isLoading={true} />);

    const startButton = screen.getByRole('button', { name: 'Starting...' });
    expect(startButton).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('disables form when isLoading is true', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} isLoading={true} />);

    const textarea = screen.getByPlaceholderText('Describe your app idea...');
    expect(textarea).toBeDisabled();

    const startButton = screen.getByRole('button', { name: 'Starting...' });
    expect(startButton).toBeDisabled();

    await user.click(startButton);
    expect(mockOnStart).not.toHaveBeenCalled();
  });

  it('handles target users selection', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    // Add target user
    const addUserButton = screen.getByText('Add Target User');
    await user.click(addUserButton);

    const userInput = screen.getByPlaceholderText(
      'e.g., developers, students, business owners'
    );
    await user.type(userInput, 'developers');

    const addButton = screen.getByRole('button', { name: 'Add' });
    await user.click(addButton);

    expect(screen.getByText('developers')).toBeInTheDocument();

    // Fill app idea and submit
    const textarea = screen.getByPlaceholderText('Describe your app idea...');
    await user.type(textarea, 'A task management app for remote teams');

    const startButton = screen.getByRole('button', {
      name: 'Start Conversation',
    });
    await user.click(startButton);

    expect(mockOnStart).toHaveBeenCalledWith({
      appIdea: 'A task management app for remote teams',
      targetUsers: ['developers'],
      complexity: undefined,
    });
  });

  it('handles complexity selection', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    // Select complexity
    const complexitySelect = screen.getByLabelText('Project Complexity');
    await user.selectOptions(complexitySelect, 'moderate');

    // Fill app idea and submit
    const textarea = screen.getByPlaceholderText('Describe your app idea...');
    await user.type(textarea, 'A task management app for remote teams');

    const startButton = screen.getByRole('button', {
      name: 'Start Conversation',
    });
    await user.click(startButton);

    expect(mockOnStart).toHaveBeenCalledWith({
      appIdea: 'A task management app for remote teams',
      targetUsers: [],
      complexity: 'moderate',
    });
  });

  it('removes target users when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    // Add target user
    const addUserButton = screen.getByText('Add Target User');
    await user.click(addUserButton);

    const userInput = screen.getByPlaceholderText(
      'e.g., developers, students, business owners'
    );
    await user.type(userInput, 'developers');

    const addButton = screen.getByRole('button', { name: 'Add' });
    await user.click(addButton);

    expect(screen.getByText('developers')).toBeInTheDocument();

    // Remove the user
    const removeButton = screen.getByRole('button', {
      name: 'Remove developers',
    });
    await user.click(removeButton);

    expect(screen.queryByText('developers')).not.toBeInTheDocument();
  });

  it('prevents adding duplicate target users', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    // Add first user
    const addUserButton = screen.getByText('Add Target User');
    await user.click(addUserButton);

    const userInput = screen.getByPlaceholderText(
      'e.g., developers, students, business owners'
    );
    await user.type(userInput, 'developers');

    const addButton = screen.getByRole('button', { name: 'Add' });
    await user.click(addButton);

    // Try to add same user again
    await user.clear(userInput);
    await user.type(userInput, 'developers');
    await user.click(addButton);

    // Should only have one instance
    const userTags = screen.getAllByText('developers');
    expect(userTags).toHaveLength(1);
  });

  it('shows example prompts', () => {
    render(<ConversationStarter onStart={mockOnStart} />);

    expect(
      screen.getByText('Need inspiration? Try these examples:')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Task management app for remote teams')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Social media platform for pet owners')
    ).toBeInTheDocument();
    expect(
      screen.getByText('E-commerce marketplace for handmade goods')
    ).toBeInTheDocument();
  });

  it('fills textarea when example is clicked', async () => {
    const user = userEvent.setup();
    render(<ConversationStarter onStart={mockOnStart} />);

    const exampleButton = screen.getByText(
      'Task management app for remote teams'
    );
    await user.click(exampleButton);

    const textarea = screen.getByPlaceholderText('Describe your app idea...');
    expect(textarea).toHaveValue('Task management app for remote teams');
  });
});
