import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageList from '../MessageList';
import type { ChatMessage } from '../../../types';

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, itemData, itemCount }) => {
    // Render all items for testing
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      const ItemComponent = children;
      items.push(
        <div key={i}>
          <ItemComponent index={i} style={{}} data={itemData} />
        </div>
      );
    }
    return <div data-testid="virtual-list">{items}</div>;
  }),
}));

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    conversationId: 'conv-1',
    persona: null,
    content: 'Hello, I want to build a todo app',
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
      expertise: ['Product Strategy', 'User Research'],
    },
    content: 'That sounds great! Can you tell me more about your target users?',
    timestamp: new Date('2024-01-01T10:01:00Z'),
    type: 'ai',
  },
];

describe('MessageList', () => {
  it('renders empty state when no messages', () => {
    render(<MessageList messages={[]} />);

    expect(screen.getByText('Start Your Conversation')).toBeInTheDocument();
    expect(
      screen.getByText(/Describe your app idea and our AI team/)
    ).toBeInTheDocument();
  });

  it('renders messages when provided', () => {
    render(<MessageList messages={mockMessages} />);

    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(
      screen.getByText('Hello, I want to build a todo app')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'That sounds great! Can you tell me more about your target users?'
      )
    ).toBeInTheDocument();
  });

  it('shows typing indicator when typingPersona is provided', () => {
    render(<MessageList messages={mockMessages} typingPersona="tech-lead" />);

    expect(screen.getByText('typing...')).toBeInTheDocument();
  });

  it('includes typing message in item count', () => {
    const { container } = render(
      <MessageList messages={mockMessages} typingPersona="tech-lead" />
    );

    const virtualList = container.querySelector('[data-testid="virtual-list"]');
    expect(virtualList?.children).toHaveLength(3); // 2 messages + 1 typing indicator
  });

  it('does not show typing indicator when no typingPersona', () => {
    render(<MessageList messages={mockMessages} />);

    expect(screen.queryByText('typing...')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MessageList messages={mockMessages} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows empty state even with typing persona but no messages', () => {
    render(<MessageList messages={[]} typingPersona="product-manager" />);

    // Should show typing indicator instead of empty state
    expect(screen.getByText('typing...')).toBeInTheDocument();
    expect(
      screen.queryByText('Start Your Conversation')
    ).not.toBeInTheDocument();
  });

  it('creates proper typing message structure', () => {
    render(<MessageList messages={[]} typingPersona="product-manager" />);

    expect(screen.getAllByText('Product Manager')).toHaveLength(2); // Name and role badge
    expect(screen.getByText('typing...')).toBeInTheDocument();
  });

  it('handles different persona types for typing indicator', () => {
    const personas = [
      'product-manager',
      'tech-lead',
      'ux-designer',
      'devops',
      'scrum-master',
    ];

    personas.forEach((persona) => {
      const { unmount } = render(
        <MessageList messages={[]} typingPersona={persona} />
      );

      const expectedName = persona
        .replace('-', ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      expect(screen.getAllByText(expectedName)).toHaveLength(2); // Name and role badge

      unmount();
    });
  });

  it('renders with flex-1 class for proper layout', () => {
    const { container } = render(<MessageList messages={mockMessages} />);

    expect(container.firstChild).toHaveClass('flex-1');
  });

  it('shows proper empty state icon', () => {
    const { container } = render(<MessageList messages={[]} />);

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
