import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Layout', () => {
  it('renders main layout structure', () => {
    renderWithRouter(
      <Layout>
        <div>Main content</div>
      </Layout>
    );

    expect(screen.getByText('SpecForge')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('shows navigation menu', () => {
    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Conversations' })
    ).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/conversations' },
      writable: true,
    });

    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const conversationsLink = screen.getByRole('link', {
      name: 'Conversations',
    });
    expect(conversationsLink).toHaveClass('bg-primary-100', 'text-primary-700');
  });

  it('shows user menu when authenticated', () => {
    renderWithRouter(
      <Layout user={{ name: 'John Doe', email: 'john@example.com' }}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'User menu' })
    ).toBeInTheDocument();
  });

  it('shows sign in button when not authenticated', () => {
    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('toggles mobile menu', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    await user.click(menuButton);

    expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
  });

  it('shows breadcrumbs when provided', () => {
    const breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Conversations', href: '/conversations' },
      { label: 'Current Conversation' },
    ];

    renderWithRouter(
      <Layout breadcrumbs={breadcrumbs}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Current Conversation')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithRouter(
      <Layout loading>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithRouter(
      <Layout error="Something went wrong">
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('handles sidebar toggle', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout showSidebar>
        <div>Content</div>
      </Layout>
    );

    const toggleButton = screen.getByRole('button', { name: 'Toggle sidebar' });
    await user.click(toggleButton);

    expect(screen.getByTestId('sidebar')).toHaveClass('hidden');
  });

  it('shows footer', () => {
    renderWithRouter(
      <Layout showFooter>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText('© 2024 SpecForge')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithRouter(
      <Layout className="custom-layout">
        <div>Content</div>
      </Layout>
    );

    const layout = screen.getByTestId('layout');
    expect(layout).toHaveClass('custom-layout');
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    await user.keyboard('{Alt>}{Shift>}h{/Shift}{/Alt}');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
  });

  it('shows notification badge', () => {
    renderWithRouter(
      <Layout notifications={3}>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByTestId('notification-badge')).toBeInTheDocument();
  });

  it('handles theme toggle', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const themeButton = screen.getByRole('button', { name: 'Toggle theme' });
    await user.click(themeButton);

    expect(document.documentElement).toHaveClass('dark');
  });

  it('shows search bar when enabled', () => {
    renderWithRouter(
      <Layout showSearch>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('handles responsive design', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    renderWithRouter(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveClass('md:block');
  });
});
