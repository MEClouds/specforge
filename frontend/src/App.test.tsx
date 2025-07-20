import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Vite + React')).toBeInTheDocument();
  });

  it('has a working counter button', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /count is/i });
    expect(button).toBeInTheDocument();
  });
});
