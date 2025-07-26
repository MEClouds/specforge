import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatInput from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = vi.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  it('renders with default placeholder', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    expect(
      screen.getByPlaceholderText('Describe your app idea...')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <ChatInput
        onSendMessage={mockOnSendMessage}
        placeholder="Custom placeholder"
      />
    );

    expect(
      screen.getByPlaceholderText('Custom placeholder')
    ).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(textarea, 'Hello world');
    await user.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
    expect(textarea).toHaveValue('');
  });

  it('sends message when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');

    await user.type(textarea, 'Hello world');
    await user.keyboard('{Enter}');

    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
  });

  it('adds new line when Shift+Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');

    await user.type(textarea, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'Line 2');

    expect(textarea).toHaveValue('Line 1\nLine 2');
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('trims whitespace from messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(textarea, '  Hello world  ');
    await user.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.click(sendButton);

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('does not send whitespace-only messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(textarea, '   ');
    await user.click(sendButton);

    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('disables input and button when disabled prop is true', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('shows AI thinking indicator when disabled', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} />);

    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('disables send button when message is empty', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(sendButton).toBeDisabled();
  });

  it('enables send button when message has content', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(sendButton).toBeDisabled();

    await user.type(textarea, 'Hello');

    expect(sendButton).not.toBeDisabled();
  });

  it('shows character count for long messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');
    const longMessage = 'a'.repeat(501);

    await user.type(textarea, longMessage);

    expect(screen.getByText('501/2000')).toBeInTheDocument();
  });

  it('auto-resizes textarea based on content', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4');

    // Check that the textarea has content and the height style is set
    expect(textarea.value).toContain('Line 1\nLine 2\nLine 3\nLine 4');
    expect(textarea.style.height).toBeTruthy();
  });

  it('handles composition events correctly', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');

    // Simulate composition start (e.g., IME input)
    fireEvent.compositionStart(textarea);
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    // Should not send message during composition
    expect(mockOnSendMessage).not.toHaveBeenCalled();

    // Simulate composition end
    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter' });

    // Should send message after composition ends
    expect(mockOnSendMessage).toHaveBeenCalledWith('test');
  });

  it('focuses textarea on mount when not disabled', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    const textarea = screen.getByRole('textbox');

    expect(textarea).toHaveFocus();
  });

  it('does not focus textarea when disabled', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} />);

    const textarea = screen.getByRole('textbox');

    expect(textarea).not.toHaveFocus();
  });

  it('shows helpful hints', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);

    expect(
      screen.getByText('Press Enter to send, Shift+Enter for new line')
    ).toBeInTheDocument();
  });
});
