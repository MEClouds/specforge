import React, { useEffect } from 'react';
import { useAppStore } from '../store';
import { useToast } from '../contexts/ToastContext';
import ErrorDisplay from './ui/ErrorDisplay';
import { isRetryableError, type AppError } from '../utils/errorHandling';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({
  children,
}) => {
  const {
    ui: { error },
    setError,
  } = useAppStore();
  const { showError } = useToast();

  // Handle global unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      showError('An unexpected error occurred. Please try again.');
      setError(error.message);

      // Prevent the default browser behavior
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);

      showError('An unexpected error occurred. Please refresh the page.');
      setError(event.error?.message || 'Unknown error');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      window.removeEventListener('error', handleError);
    };
  }, [showError, setError]);

  const handleRetry = () => {
    setError(null);
    // Optionally trigger a page refresh or specific retry logic
    window.location.reload();
  };

  const handleDismiss = () => {
    setError(null);
  };

  return (
    <>
      {children}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <ErrorDisplay
            error={error}
            onRetry={
              isRetryableError(new Error(error)) ? handleRetry : undefined
            }
            onDismiss={handleDismiss}
            variant="card"
            context={{ action: 'global_error' }}
          />
        </div>
      )}
    </>
  );
};

export default GlobalErrorHandler;
