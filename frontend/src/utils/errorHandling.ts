/**
 * Error handling utilities for user-friendly error messages and retry logic
 */

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  requestId?: string;
  retryable?: boolean;
  userMessage?: string;
}

export interface ErrorContext {
  action: string;
  component?: string;
  userId?: string;
  conversationId?: string;
  additionalData?: Record<string, any>;
}

/**
 * Creates a user-friendly error message based on the error type and context
 */
export function getUserFriendlyErrorMessage(
  error: Error | AppError,
  context?: ErrorContext
): string {
  const appError = error as AppError;

  // If we have a custom user message, use it
  if (appError.userMessage) {
    return appError.userMessage;
  }

  // Handle specific error codes
  if (appError.code) {
    switch (appError.code) {
      case 'NETWORK_ERROR':
      case 'CONNECTION_ERROR':
        return 'Unable to connect to the server. Please check your internet connection and try again.';

      case 'TIMEOUT_ERROR':
        return 'The request took too long to complete. Please try again.';

      case 'RATE_LIMIT_ERROR':
        return 'Too many requests. Please wait a moment before trying again.';

      case 'AI_SERVICE_ERROR':
        return 'AI service is temporarily unavailable. Please try again in a few moments.';

      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';

      case 'NOT_FOUND':
        return context?.action === 'load_conversation'
          ? 'Conversation not found. It may have been deleted.'
          : 'The requested resource was not found.';

      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';

      case 'CONFLICT':
        return 'This action conflicts with the current state. Please refresh and try again.';

      case 'SERVICE_ERROR':
        return 'Service is temporarily unavailable. Please try again later.';

      case 'MAX_RECONNECT_ATTEMPTS':
        return 'Unable to maintain connection to the server. Please refresh the page.';

      default:
        break;
    }
  }

  // Handle HTTP status codes
  if (appError.statusCode) {
    switch (appError.statusCode) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in and try again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return context?.action === 'load_conversation'
          ? 'Conversation not found.'
          : 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with the current state. Please refresh and try again.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server is temporarily unavailable. Please try again in a few moments.';
      default:
        break;
    }
  }

  // Handle common error message patterns
  const message = error.message.toLowerCase();

  if (message.includes('fetch') || message.includes('network')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Request timed out. Please try again.';
  }

  if (message.includes('abort')) {
    return 'Request was cancelled. Please try again.';
  }

  if (message.includes('ai') && message.includes('unavailable')) {
    return 'AI service is temporarily unavailable. Please try again later.';
  }

  // Context-specific messages
  if (context?.action) {
    switch (context.action) {
      case 'create_conversation':
        return 'Failed to create conversation. Please try again.';
      case 'load_conversation':
        return 'Failed to load conversation. Please try again.';
      case 'send_message':
        return 'Failed to send message. Please try again.';
      case 'generate_specifications':
        return 'Failed to generate specifications. Please try again.';
      case 'download_specifications':
        return 'Failed to download specifications. Please try again.';
      default:
        break;
    }
  }

  // Fallback to original message if it's user-friendly, otherwise use generic message
  if (
    error.message &&
    error.message.length < 100 &&
    !error.message.includes('Error:')
  ) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: Error | AppError): boolean {
  const appError = error as AppError;

  // Explicitly marked as retryable
  if (appError.retryable !== undefined) {
    return appError.retryable;
  }

  // Network and timeout errors are retryable
  if (appError.code) {
    const retryableCodes = [
      'NETWORK_ERROR',
      'CONNECTION_ERROR',
      'TIMEOUT_ERROR',
      'SERVICE_ERROR',
    ];
    if (retryableCodes.includes(appError.code)) {
      return true;
    }
  }

  // 5xx server errors are retryable
  if (appError.statusCode && appError.statusCode >= 500) {
    return true;
  }

  // Network-related error messages
  const message = error.message.toLowerCase();
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable')
  ) {
    return true;
  }

  return false;
}

/**
 * Logs error with context for debugging
 */
export function logError(
  error: Error | AppError,
  context?: ErrorContext
): void {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    code: (error as AppError).code,
    statusCode: (error as AppError).statusCode,
    requestId: (error as AppError).requestId,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error('Application Error:', errorInfo);

  // In production, you might want to send this to an error tracking service
  if (import.meta.env.PROD) {
    // Example: Send to error tracking service
    // errorTrackingService.captureError(errorInfo);
  }
}

/**
 * Creates a standardized error object
 */
export function createAppError(
  message: string,
  code?: string,
  statusCode?: number,
  retryable?: boolean,
  userMessage?: string
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  error.retryable = retryable;
  error.userMessage = userMessage;
  return error;
}

/**
 * Wraps async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: ErrorContext
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error as Error, context);
      throw error;
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's not a retryable error
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Don't wait after the last attempt
      if (attempt === maxRetries) {
        break;
      }

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
