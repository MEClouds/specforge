import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ConflictResolution from '../ConflictResolution';
import type { ChatMessage } from '../../../types';

const mockConflictingMessages: ChatMessage[] = [
  {
    id: '1',
    conversationId: 'conv-1',
    persona: {
      id: 'pm-1',
      name: 'Sarah',
      role: 'product-manager',
      avatar: '👔',
      color: '#8B5CF6',
      expertise: ['Product Strategy'],
    },
    content:
      'We should focus on rapid MVP development to get to market quickly.',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    type: 'ai',
  },
  {
    id: '2',
    conversationId: 'conv-1',
    persona: {
      id: 'tl-1',
      name: 'Alex',
      role: 'tech-lead',
      avatar: '💻',
      color: '#3B82F6',
      expertise: ['Architecture'],
    },
    content:
      'I disagree. We need to build a solid architecture foundation first, even if it takes longer.',
    timestamp: new Date('2024-01-01T10:01:00Z'),
    type: 'ai',
  },
];

const mockOnResolve = vi.fn();

describe('ConflictResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conflict resolution interface', () => {
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
      />
    );

    expect(
      screen.getByText('The team is discussing different approaches')
    ).toBeInTheDocument();
    expect(screen.getByText('Sarah (Product Manager)')).toBeInTheDocument();
    expect(screen.getByText('Alex (Tech Lead)')).toBeInTheDocument();
    expect(
      screen.getByText('We should focus on rapid MVP development')
    ).toBeInTheDocument();
    expect(
      screen.getByText('I disagree. We need to build a solid architecture')
    ).toBeInTheDocument();
  });

  it('shows resolution options', () => {
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
      />
    );

    expect(
      screen.getByText('How would you like to proceed?')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Go with Product Manager approach' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Go with Tech Lead approach' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Find a compromise' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Let me provide more context' })
    ).toBeInTheDocument();
  });

  it('handles resolution selection', async () => {
    const user = userEvent.setup();
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
      />
    );

    const pmButton = screen.getByRole('button', {
      name: 'Go with Product Manager approach',
    });
    await user.click(pmButton);

    expect(mockOnResolve).toHaveBeenCalledWith({
      type: 'choose-persona',
      personaId: 'pm-1',
      reasoning: 'User chose to proceed with Product Manager approach',
    });
  });

  it('handles compromise selection', async () => {
    const user = userEvent.setup();
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
      />
    );

    const compromiseButton = screen.getByRole('button', {
      name: 'Find a compromise',
    });
    await user.click(compromiseButton);

    expect(mockOnResolve).toHaveBeenCalledWith({
      type: 'compromise',
      reasoning: 'User requested a compromise between different approaches',
    });
  });

  it('handles provide context selection', async () => {
    const user = userEvent.setup();
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
      />
    );

    const contextButton = screen.getByRole('button', {
      name: 'Let me provide more context',
    });
    await user.click(contextButton);

    expect(mockOnResolve).toHaveBeenCalledWith({
      type: 'provide-context',
      reasoning: 'User wants to provide additional context to resolve conflict',
    });
  });

  it('shows persona avatars and colors correctly', () => {
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('👔')).toBeInTheDocument();
    expect(screen.getByText('💻')).toBeInTheDocument();
  });

  it('handles multiple conflicting personas', () => {
    const multipleConflictMessages = [
      ...mockConflictingMessages,
      {
        id: '3',
        conversationId: 'conv-1',
        persona: {
          id: 'ux-1',
          name: 'Maya',
          role: 'ux-designer',
          avatar: '🎨',
          color: '#F59E0B',
          expertise: ['User Experience'],
        },
        content:
          'Both approaches miss the user experience perspective. We need user research first.',
        timestamp: new Date('2024-01-01T10:02:00Z'),
        type: 'ai',
      },
    ];

    render(
      <ConflictResolution
        conflictingMessages={multipleConflictMessages}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Maya (UX Designer)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Go with UX Designer approach' })
    ).toBeInTheDocument();
  });

  it('shows loading state when isResolving is true', () => {
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
        isResolving={true}
      />
    );

    expect(screen.getByText('Resolving conflict...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    // Buttons should be disabled
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('displays conflict summary', () => {
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Conflict Summary:')).toBeInTheDocument();
    expect(
      screen.getByText('Product Manager wants to prioritize speed to market')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tech Lead wants to prioritize technical foundation')
    ).toBeInTheDocument();
  });

  it('handles empty conflicting messages gracefully', () => {
    render(
      <ConflictResolution conflictingMessages={[]} onResolve={mockOnResolve} />
    );

    expect(
      screen.getByText('No conflicting messages found')
    ).toBeInTheDocument();
  });

  it('shows conflict resolution tips', () => {
    render(
      <ConflictResolution
        conflictingMessages={mockConflictingMessages}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('💡 Tips for resolution:')).toBeInTheDocument();
    expect(
      screen.getByText('Consider your project timeline and priorities')
    ).toBeInTheDocument();
    expect(
      screen.getByText("Think about your team's expertise and resources")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Remember that compromises often lead to better solutions'
      )
    ).toBeInTheDocument();
  });

  it('formats persona roles correctly', () => {
    const devopsMessage = {
      id: '4',
      conversationId: 'conv-1',
      persona: {
        id: 'do-1',
        name: 'Jordan',
        role: 'devops' as const,
        avatar: '⚙️',
        color: '#10B981',
        expertise: ['Infrastructure'],
      },
      content: 'We need to consider deployment complexity.',
      timestamp: new Date('2024-01-01T10:03:00Z'),
      type: 'ai' as const,
    };

    render(
      <ConflictResolution
        conflictingMessages={[...mockConflictingMessages, devopsMessage]}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Jordan (DevOps)')).toBeInTheDocument();
  });
});
