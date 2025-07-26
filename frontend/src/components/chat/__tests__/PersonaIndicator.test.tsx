import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PersonaIndicator from '../PersonaIndicator';
import type { AIPersona } from '../../../types';

const mockPersonas: AIPersona[] = [
  {
    id: 'pm-1',
    name: 'Sarah',
    role: 'product-manager',
    avatar: '👔',
    color: '#8B5CF6',
    expertise: ['Product Strategy', 'User Research', 'Market Analysis'],
  },
  {
    id: 'tl-1',
    name: 'Alex',
    role: 'tech-lead',
    avatar: '💻',
    color: '#3B82F6',
    expertise: ['System Architecture', 'Code Review', 'Technical Planning'],
  },
  {
    id: 'ux-1',
    name: 'Maya',
    role: 'ux-designer',
    avatar: '🎨',
    color: '#EC4899',
    expertise: ['User Experience', 'Interface Design', 'Prototyping'],
  },
];

describe('PersonaIndicator', () => {
  it('renders nothing when no active personas', () => {
    const { container } = render(<PersonaIndicator activePersonas={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders AI team members label', () => {
    render(<PersonaIndicator activePersonas={mockPersonas} />);

    expect(screen.getByText('AI Team Members:')).toBeInTheDocument();
  });

  it('renders all active personas', () => {
    render(<PersonaIndicator activePersonas={mockPersonas} />);

    expect(screen.getByText('Product Manager')).toBeInTheDocument();
    expect(screen.getByText('Tech Lead')).toBeInTheDocument();
    expect(screen.getByText('Ux Designer')).toBeInTheDocument();
  });

  it('shows persona avatars', () => {
    render(<PersonaIndicator activePersonas={mockPersonas} />);

    expect(screen.getByText('👔')).toBeInTheDocument();
    expect(screen.getByText('💻')).toBeInTheDocument();
    expect(screen.getByText('🎨')).toBeInTheDocument();
  });

  it('shows ready status when no one is typing', () => {
    render(<PersonaIndicator activePersonas={mockPersonas} />);

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows typing status when someone is typing', () => {
    render(
      <PersonaIndicator
        activePersonas={mockPersonas}
        currentTypingPersona="product-manager"
      />
    );

    expect(
      screen.getByText('Product Manager is typing...')
    ).toBeInTheDocument();
    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
  });

  it('highlights typing persona', () => {
    const { container } = render(
      <PersonaIndicator
        activePersonas={mockPersonas}
        currentTypingPersona="product-manager"
      />
    );

    const typingPersona = container.querySelector('.bg-primary-50');
    expect(typingPersona).toBeInTheDocument();
  });

  it('shows typing animation for active persona', () => {
    const { container } = render(
      <PersonaIndicator
        activePersonas={mockPersonas}
        currentTypingPersona="tech-lead"
      />
    );

    const typingDots = container.querySelectorAll('.animate-pulse');
    expect(typingDots.length).toBeGreaterThan(0);
  });

  it('shows expertise tags', () => {
    render(<PersonaIndicator activePersonas={mockPersonas} />);

    // Should show first 2 expertise areas for each persona
    expect(screen.getByText('Product Strategy')).toBeInTheDocument();
    expect(screen.getByText('User Research')).toBeInTheDocument();
    expect(screen.getByText('System Architecture')).toBeInTheDocument();
    expect(screen.getByText('Code Review')).toBeInTheDocument();
    expect(screen.getByText('User Experience')).toBeInTheDocument();
    expect(screen.getByText('Interface Design')).toBeInTheDocument();

    // Should not show third expertise area
    expect(screen.queryByText('Market Analysis')).not.toBeInTheDocument();
    expect(screen.queryByText('Technical Planning')).not.toBeInTheDocument();
    expect(screen.queryByText('Prototyping')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PersonaIndicator
        activePersonas={mockPersonas}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows online indicator for typing persona', () => {
    const { container } = render(
      <PersonaIndicator
        activePersonas={mockPersonas}
        currentTypingPersona="ux-designer"
      />
    );

    const onlineIndicator = container.querySelector('.bg-green-400');
    expect(onlineIndicator).toBeInTheDocument();
  });

  it('handles persona role formatting correctly', () => {
    const personaWithHyphenatedRole: AIPersona = {
      id: 'sm-1',
      name: 'Jordan',
      role: 'scrum-master',
      avatar: '📋',
      color: '#F59E0B',
      expertise: ['Agile Methodology'],
    };

    render(<PersonaIndicator activePersonas={[personaWithHyphenatedRole]} />);

    expect(screen.getByText('Scrum Master')).toBeInTheDocument();
  });

  it('applies correct persona-specific colors', () => {
    const { container } = render(
      <PersonaIndicator activePersonas={mockPersonas} />
    );

    // Check for persona-specific background colors
    expect(container.querySelector('.bg-purple-500')).toBeInTheDocument(); // product-manager
    expect(container.querySelector('.bg-blue-500')).toBeInTheDocument(); // tech-lead
    expect(container.querySelector('.bg-pink-500')).toBeInTheDocument(); // ux-designer
  });

  it('shows correct typing persona name in status', () => {
    render(
      <PersonaIndicator
        activePersonas={mockPersonas}
        currentTypingPersona="tech-lead"
      />
    );

    expect(screen.getByText('Tech Lead is typing...')).toBeInTheDocument();
  });

  it('handles empty expertise array gracefully', () => {
    const personaWithoutExpertise: AIPersona = {
      id: 'test-1',
      name: 'Test',
      role: 'product-manager',
      avatar: '👔',
      color: '#8B5CF6',
      expertise: [],
    };

    render(<PersonaIndicator activePersonas={[personaWithoutExpertise]} />);

    expect(screen.getByText('Product Manager')).toBeInTheDocument();
    // Should not crash and should still render the persona
  });
});
