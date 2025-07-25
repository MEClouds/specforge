import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Home from './pages/Home';

describe('App', () => {
  it('renders home page without crashing', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('Welcome to SpecForge')).toBeInTheDocument();
  });

  it('renders the home page with main features', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText('AI Team Conversation')).toBeInTheDocument();
    expect(screen.getByText('Professional Specifications')).toBeInTheDocument();
    expect(screen.getByText('Start New Conversation')).toBeInTheDocument();
  });
});
