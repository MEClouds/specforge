import { Request, Response, NextFunction } from 'express';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

// Custom error class for API errors
export class APIError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Request ID middleware
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};

// Global error handler middleware
export const errorHandler = (
  err: Error | APIError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error for debugging
  console.error(
    `[${new Date().toISOString()}] Error in ${req.method} ${req.path}:`,
    {
      error: err.message,
      stack: err.stack,
      requestId: req.headers['x-request-id'],
      body: req.body,
      params: req.params,
      query: req.query,
    }
  );

  // Handle different types of errors
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (err instanceof APIError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = err.message;
  } else if (err.message.includes('Failed to')) {
    // Database or service errors
    statusCode = 500;
    code = 'SERVICE_ERROR';
    message = 'Service temporarily unavailable';
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'development') {
      details = err.message;
    }
  } else if (err.message.includes('not found')) {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = err.message;
  } else if (err.message.includes('already exists')) {
    statusCode = 409;
    code = 'CONFLICT';
    message = err.message;
  } else if (
    err.message.includes('unauthorized') ||
    err.message.includes('forbidden')
  ) {
    statusCode = 403;
    code = 'FORBIDDEN';
    message = 'Access denied';
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    },
  };

  res.status(statusCode).json(errorResponse);
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown',
    },
  };

  res.status(404).json(errorResponse);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
