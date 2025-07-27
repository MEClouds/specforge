import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from '../Card';

describe('Card', () => {
  it('renders basic card', () => {
    render(<Card>Card content</Card>);

    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow');
  });

  it('renders with title', () => {
    render(<Card title="Card Title">Card content</Card>);

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with subtitle', () => {
    render(
      <Card title="Card Title" subtitle="Card subtitle">
        Card content
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card subtitle')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    const actions = <button type="button">Action Button</button>;

    render(
      <Card title="Card Title" actions={actions}>
        Card content
      </Card>
    );

    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Action Button' })
    ).toBeInTheDocument();
  });

  it('applies different variants', () => {
    const { rerender } = render(<Card variant="outlined">Outlined card</Card>);
    expect(screen.getByText('Outlined card')).toHaveClass('border-2');

    rerender(<Card variant="elevated">Elevated card</Card>);
    expect(screen.getByText('Elevated card')).toHaveClass('shadow-lg');

    rerender(<Card variant="flat">Flat card</Card>);
    expect(screen.getByText('Flat card')).toHaveClass('shadow-none');
  });

  it('applies different sizes', () => {
    const { rerender } = render(<Card size="sm">Small card</Card>);
    expect(screen.getByText('Small card')).toHaveClass('p-4');

    rerender(<Card size="lg">Large card</Card>);
    expect(screen.getByText('Large card')).toHaveClass('p-8');
  });

  it('handles clickable cards', () => {
    const handleClick = vi.fn();
    render(
      <Card onClick={handleClick} clickable>
        Clickable card
      </Card>
    );

    const card = screen.getByText('Clickable card');
    expect(card).toHaveClass('cursor-pointer', 'hover:shadow-md');

    card.click();
    expect(handleClick).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Card loading>Card content</Card>);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Card content')).not.toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<Card error="Something went wrong">Card content</Card>);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Card content')).not.toBeInTheDocument();
  });

  it('renders with image', () => {
    render(
      <Card
        image={{
          src: '/test-image.jpg',
          alt: 'Test image',
        }}
      >
        Card with image
      </Card>
    );

    const image = screen.getByRole('img', { name: 'Test image' });
    expect(image).toHaveAttribute('src', '/test-image.jpg');
    expect(screen.getByText('Card with image')).toBeInTheDocument();
  });

  it('renders with footer', () => {
    const footer = <div>Card footer</div>;

    render(<Card footer={footer}>Card content</Card>);

    expect(screen.getByText('Card content')).toBeInTheDocument();
    expect(screen.getByText('Card footer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Card content</Card>);

    const card = screen.getByText('Card content');
    expect(card).toHaveClass('custom-class');
  });

  it('handles disabled state', () => {
    render(<Card disabled>Disabled card</Card>);

    const card = screen.getByText('Disabled card');
    expect(card).toHaveClass('opacity-50', 'pointer-events-none');
  });

  it('renders with badge', () => {
    render(<Card badge={{ text: 'New', color: 'blue' }}>Card with badge</Card>);

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Card with badge')).toBeInTheDocument();
  });

  it('renders with dividers', () => {
    render(
      <Card title="Card Title" dividers>
        Card content
      </Card>
    );

    const card = screen.getByText('Card Title').closest('div');
    expect(card?.querySelector('.border-b')).toBeInTheDocument();
  });

  it('handles hover effects', () => {
    render(<Card hover>Hoverable card</Card>);

    const card = screen.getByText('Hoverable card');
    expect(card).toHaveClass('transition-shadow', 'hover:shadow-lg');
  });

  it('renders with custom padding', () => {
    render(<Card padding="none">No padding card</Card>);

    const card = screen.getByText('No padding card');
    expect(card).toHaveClass('p-0');
  });

  it('supports full width', () => {
    render(<Card fullWidth>Full width card</Card>);

    const card = screen.getByText('Full width card');
    expect(card).toHaveClass('w-full');
  });
});
