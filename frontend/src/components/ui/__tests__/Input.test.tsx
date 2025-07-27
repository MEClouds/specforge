import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import Input from '../Input';

describe('Input', () => {
  it('renders basic input', () => {
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('w-full', 'px-3', 'py-2', 'border');
  });

  it('handles value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input placeholder="Enter text" onChange={handleChange} />);

    const input = screen.getByPlaceholderText('Enter text');
    await user.type(input, 'Hello');

    expect(handleChange).toHaveBeenCalledTimes(5); // One for each character
  });

  it('shows error state', () => {
    render(<Input placeholder="Enter text" error="This field is required" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toHaveClass('border-red-500');
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('shows success state', () => {
    render(<Input placeholder="Enter text" success={true} />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toHaveClass('border-green-500');
  });

  it('renders with label', () => {
    render(<Input label="Username" placeholder="Enter username" />);

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<Input label="Username" required placeholder="Enter username" />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<Input placeholder="Enter text" disabled />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Input placeholder="Small" size="sm" />);
    expect(screen.getByPlaceholderText('Small')).toHaveClass(
      'px-2',
      'py-1',
      'text-sm'
    );

    rerender(<Input placeholder="Large" size="lg" />);
    expect(screen.getByPlaceholderText('Large')).toHaveClass(
      'px-4',
      'py-3',
      'text-lg'
    );
  });

  it('renders different variants', () => {
    const { rerender } = render(
      <Input placeholder="Outlined" variant="outlined" />
    );
    expect(screen.getByPlaceholderText('Outlined')).toHaveClass('border-2');

    rerender(<Input placeholder="Filled" variant="filled" />);
    expect(screen.getByPlaceholderText('Filled')).toHaveClass('bg-gray-50');
  });

  it('shows loading state', () => {
    render(<Input placeholder="Enter text" loading />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    const SearchIcon = () => <span data-testid="search-icon">🔍</span>;
    render(<Input placeholder="Search" icon={<SearchIcon />} />);

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('handles focus and blur events', async () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    const user = userEvent.setup();

    render(
      <Input
        placeholder="Enter text"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );

    const input = screen.getByPlaceholderText('Enter text');

    await user.click(input);
    expect(handleFocus).toHaveBeenCalled();

    await user.tab();
    expect(handleBlur).toHaveBeenCalled();
  });

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute(
      'type',
      'email'
    );

    rerender(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute(
      'type',
      'password'
    );
  });

  it('shows character count when maxLength is provided', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" maxLength={10} showCharCount />);

    const input = screen.getByPlaceholderText('Enter text');
    await user.type(input, 'Hello');

    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });

  it('prevents input when maxLength is reached', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" maxLength={5} />);

    const input = screen.getByPlaceholderText('Enter text');
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello');
  });

  it('applies custom className', () => {
    render(<Input placeholder="Enter text" className="custom-class" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Input ref={ref} placeholder="Enter text" />);

    expect(ref).toHaveBeenCalled();
  });
});
