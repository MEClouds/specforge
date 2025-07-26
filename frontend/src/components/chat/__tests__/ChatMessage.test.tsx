import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChatMessage from '../ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../../types';

const mockUserMessage: ChatMessageType = {
  id: '1',
  conversationId: 'conv-1',
  persona: null,
  content: 'Hello, I want to build a todo app',
  timestamp: new Date('2024-01-01T10:00:00Z'),
  type: 'user',
};

const mockAIMessage: ChatMessageType = {
  id: '2',
  conversationId: 'conv-1',
  persona: {
    id: 'pm-1',
    name: 'Sarah',
    role: 'product-manager',
    avatar: '👔',
    color: '#8B5CF6',
    expertise: ['Product Strategy', 'User Research'],
  },
  content: 'That sounds great! Can you tell me more about your target users?',
  timestamp: new Date('2024-01-01T10:01:00Z'),
  type: 'ai',
};

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    render(<ChatMessage message={mockUserMessage} />);

    expect(
      screen.getByText('Hello, I want to build a todo app')
    ).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument(); // User avatar
  });

  it('renders AI message correctly', () => {
    render(<ChatMessage message={mockAIMessage} />);

    expect(
      screen.getByText(
        'That sounds great! Can you tell me more about your target users?'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
    expect(screen.getByText('👔')).toBeInTheDocument();
    expect(screen.getByText('10:01 AM')).toBeInTheDocument();
  });

  it('shows typing indicator when isTyping is true', () => {
    render(<ChatMessage message={mockAIMessage} isTyping={true} />);

    expect(screen.getByText('typing...')).toBeInTheDocument();
    expect(screen.queryByText('That sounds great!')).not.toBeInTheDocument();
  });

  it('applies correct styling for user messages', () => {
    const { container } = render(<ChatMessage message={mockUserMessage} />);

    const messageContainer = container.querySelector('.justify-end');
    expect(messageContainer).toBeInTheDocument();

    const messageBubble = container.querySelector('.bg-primary-600');
    expect(messageBubble).toBeInTheDocument();
  });

  it('applies correct styling for AI messages', () => {
    const { container } = render(<ChatMessage message={mockAIMessage} />);

    const messageContainer = container.querySelector('.justify-start');
    expect(messageContainer).toBeInTheDocument();

    const messageBubble = container.querySelector('.bg-white');
    expect(messageBubble).toBeInTheDocument();
  });

  it('displays persona-specific colors', () => {
    const techLeadMessage = {
      ...mockAIMessage,
      persona: {
        ...mockAIMessage.persona!,
        role: 'tech-lead' as const,
      },
    };

    const { container } = render(<ChatMessage message={techLeadMessage} />);

    const personaAvatar = container.querySelector('.bg-blue-100');
    expect(personaAvatar).toBeInTheDocument();
  });

  it('handles different persona roles correctly', () => {
    const roles = [
      'product-manager',
      'tech-lead',
      'ux-designer',
      'devops',
      'scrum-master',
    ] as const;

    roles.forEach((role) => {
      const message = {
        ...mockAIMessage,
        persona: {
          ...mockAIMessage.persona!,
          role,
        },
      };

      const { unmount } = render(<ChatMessage message={message} />);

      // Check that persona-specific styling is applied
      const roleClass = role
        .replace('-', ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      expect(screen.getByText(roleClass)).toBeInTheDocument();

      unmount();
    });
  });

  it('formats timestamp correctly', () => {
    const messageWithSpecificTime = {
      ...mockUserMessage,
      timestamp: new Date('2024-01-01T14:30:00Z'),
    };

    render(<ChatMessage message={messageWithSpecificTime} />);

    expect(screen.getByText('02:30 PM')).toBeInTheDocument();
  });

  it('preserves whitespace in message content', () => {
    const messageWithWhitespace = {
      ...mockUserMessage,
      content: 'Line 1\n\nLine 2\n  Indented line',
    };

    const { container } = render(
      <ChatMessage message={messageWithWhitespace} />
    );

    const messageContent = container.querySelector('.whitespace-pre-wrap');
    expect(messageContent).toBeInTheDocument();
    expect(messageContent?.textContent).toBe(
      'Line 1\n\nLine 2\n  Indented line'
    );
  });
});
