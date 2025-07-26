import React from 'react';
import { cn } from '../../utils/cn';
import Button from './Button';
import {
  getUserFriendlyErrorMessage,
  isRetryableError,
  type AppError,
} from '../../utils/errorHandling';

interface ErrorDisplayProps {
  error: Error | AppError | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'card' | 'banner';
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
  context?: {
    action: string;
    component?: string;
  };
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
  size = 'md',
  showDetails = false,
  className,
  context,
}) => {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  const appError = errorObj as AppError;
  const userMessage = getUserFriendlyErrorMessage(appError, context);
  const canRetry = isRetryableError(appError) && onRetry;

  const sizeClasses = {
    sm: 'text-sm p-3',
    md: 'text-base p-4',
    lg: 'text-lg p-6',
  };

  const variantClasses = {
    inline: 'bg-red-50 border border-red-200 rounded-md',
    card: 'bg-white border border-red-200 rounded-lg shadow-sm',
    banner: 'bg-red-50 border-l-4 border-red-400',
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div
      className={cn(variantClasses[variant], sizeClasses[size], className)}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className={cn('text-red-400', iconSize[size])}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-red-800 font-medium">
            {context?.action
              ? `Failed to ${context.action.replace('_', ' ')}`
              : 'Error'}
          </h3>
          <p className="text-red-700 mt-1">{userMessage}</p>

          {showDetails && import.meta.env.DEV && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                Technical Details
              </summary>
              <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded border">
                <p>
                  <strong>Message:</strong> {errorObj.message}
                </p>
                {appError.code && (
                  <p>
                    <strong>Code:</strong> {appError.code}
                  </p>
                )}
                {appError.statusCode && (
                  <p>
                    <strong>Status:</strong> {appError.statusCode}
                  </p>
                )}
                {appError.requestId && (
                  <p>
                    <strong>Request ID:</strong> {appError.requestId}
                  </p>
                )}
                {errorObj.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Stack Trace</summary>
                    <pre className="mt-1 text-xs overflow-auto max-h-32">
                      {errorObj.stack}
                    </pre>
                  </details>
                )}
              </div>
            </details>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex space-x-2">
          {canRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Try Again
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-400 hover:text-red-600 focus:outline-none"
              aria-label="Dismiss error"
            >
              <svg
                className={cn(iconSize[size])}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;
