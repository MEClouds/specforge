import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ConnectionStatus from '../ConnectionStatus';

describe('ConnectionStatus', () => {
  it('shows connected status', () => {
    render(<ConnectionStatus isConnected={true} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass(
      'bg-green-500'
    );
  });

  it('shows disconnected status', () => {
    render(<ConnectionStatus isConnected={false} />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass(
      'bg-red-500'
    );
  });

  it('shows connecting status', () => {
    render(<ConnectionStatus isConnected={false} isConnecting={true} />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass(
      'bg-yellow-500'
    );
  });

  it('shows reconnecting status', () => {
    render(<ConnectionStatus isConnected={false} isReconnecting={true} />);

    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toHaveClass(
      'bg-yellow-500'
    );
  });

  it('shows retry button when disconnected', async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    render(<ConnectionStatus isConnected={false} onRetry={handleRetry} />);

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(handleRetry).toHaveBeenCalled();
  });

  it('hides retry button when connecting', () => {
    render(
      <ConnectionStatus
        isConnected={false}
        isConnecting={true}
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument();
  });

  it('shows last connected time', () => {
    const lastConnected = new Date('2024-01-01T10:00:00Z');

    render(
      <ConnectionStatus isConnected={false} lastConnected={lastConnected} />
    );

    expect(screen.getByText(/Last connected:/)).toBeInTheDocument();
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument();
  });

  it('shows connection quality indicator', () => {
    render(<ConnectionStatus isConnected={true} quality="excellent" />);

    expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('quality-indicator')).toHaveClass(
      'text-green-500'
    );
  });

  it('shows poor connection quality', () => {
    render(<ConnectionStatus isConnected={true} quality="poor" />);

    expect(screen.getByTestId('quality-indicator')).toHaveClass('text-red-500');
  });

  it('shows connection details on hover', async () => {
    const user = userEvent.setup();

    render(
      <ConnectionStatus
        isConnected={true}
        details={{
          latency: 45,
          server: 'us-east-1',
          protocol: 'websocket',
        }}
      />
    );

    const indicator = screen.getByTestId('connection-indicator');
    await user.hover(indicator);

    expect(screen.getByText('Latency: 45ms')).toBeInTheDocument();
    expect(screen.getByText('Server: us-east-1')).toBeInTheDocument();
    expect(screen.getByText('Protocol: websocket')).toBeInTheDocument();
  });

  it('shows error message when connection fails', () => {
    render(<ConnectionStatus isConnected={false} error="Connection timeout" />);

    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('shows compact view', () => {
    render(<ConnectionStatus isConnected={true} compact />);

    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    expect(screen.getByTestId('connection-indicator')).toBeInTheDocument();
  });

  it('shows animated pulse when connecting', () => {
    render(<ConnectionStatus isConnected={false} isConnecting={true} />);

    const indicator = screen.getByTestId('connection-indicator');
    expect(indicator).toHaveClass('animate-pulse');
  });

  it('handles auto-retry functionality', () => {
    vi.useFakeTimers();
    const handleRetry = vi.fn();

    render(
      <ConnectionStatus
        isConnected={false}
        onRetry={handleRetry}
        autoRetry={true}
        retryInterval={5000}
      />
    );

    expect(screen.getByText(/Auto-retry in \d+s/)).toBeInTheDocument();

    vi.advanceTimersByTime(5000);
    expect(handleRetry).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('shows connection attempts count', () => {
    render(
      <ConnectionStatus isConnected={false} attemptCount={3} maxAttempts={5} />
    );

    expect(screen.getByText('Attempt 3 of 5')).toBeInTheDocument();
  });

  it('disables retry after max attempts', () => {
    render(
      <ConnectionStatus
        isConnected={false}
        attemptCount={5}
        maxAttempts={5}
        onRetry={vi.fn()}
      />
    );

    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeDisabled();
    expect(screen.getByText('Max retry attempts reached')).toBeInTheDocument();
  });

  it('shows different connection types', () => {
    const { rerender } = render(
      <ConnectionStatus isConnected={true} type="websocket" />
    );
    expect(screen.getByText('WebSocket Connected')).toBeInTheDocument();

    rerender(<ConnectionStatus isConnected={true} type="http" />);
    expect(screen.getByText('HTTP Connected')).toBeInTheDocument();
  });

  it('applies custom styling', () => {
    render(<ConnectionStatus isConnected={true} className="custom-class" />);

    const container = screen.getByTestId('connection-status');
    expect(container).toHaveClass('custom-class');
  });
});
