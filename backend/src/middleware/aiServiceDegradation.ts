import { Request, Response, NextFunction } from 'express';
import { APIError } from './errorHandler';

interface AIServiceStatus {
  isAvailable: boolean;
  lastFailure?: Date;
  consecutiveFailures: number;
  nextRetryTime?: Date;
}

class AIServiceDegradationManager {
  private serviceStatus: Map<string, AIServiceStatus> = new Map();
  private readonly maxConsecutiveFailures = 3;
  private readonly backoffMultiplier = 2;
  private readonly baseBackoffMs = 30000; // 30 seconds
  private readonly maxBackoffMs = 300000; // 5 minutes

  /**
   * Record a successful AI service call
   */
  recordSuccess(service: string): void {
    this.serviceStatus.set(service, {
      isAvailable: true,
      consecutiveFailures: 0,
    });
  }

  /**
   * Record a failed AI service call
   */
  recordFailure(service: string): void {
    const current = this.serviceStatus.get(service) || {
      isAvailable: true,
      consecutiveFailures: 0,
    };

    const consecutiveFailures = current.consecutiveFailures + 1;
    const isAvailable = consecutiveFailures < this.maxConsecutiveFailures;

    let nextRetryTime: Date | undefined;
    if (!isAvailable) {
      const backoffMs = Math.min(
        this.baseBackoffMs *
          Math.pow(
            this.backoffMultiplier,
            consecutiveFailures - this.maxConsecutiveFailures
          ),
        this.maxBackoffMs
      );
      nextRetryTime = new Date(Date.now() + backoffMs);
    }

    this.serviceStatus.set(service, {
      isAvailable,
      lastFailure: new Date(),
      consecutiveFailures,
      nextRetryTime,
    });

    console.warn(
      `AI service ${service} failure recorded. Consecutive failures: ${consecutiveFailures}, Available: ${isAvailable}`
    );
  }

  /**
   * Check if an AI service is available
   */
  isServiceAvailable(service: string): boolean {
    const status = this.serviceStatus.get(service);
    if (!status) return true;

    // If service was marked unavailable, check if retry time has passed
    if (!status.isAvailable && status.nextRetryTime) {
      if (new Date() >= status.nextRetryTime) {
        // Reset status for retry
        this.serviceStatus.set(service, {
          isAvailable: true,
          consecutiveFailures: status.consecutiveFailures,
        });
        return true;
      }
      return false;
    }

    return status.isAvailable;
  }

  /**
   * Get service status for monitoring
   */
  getServiceStatus(service: string): AIServiceStatus {
    return (
      this.serviceStatus.get(service) || {
        isAvailable: true,
        consecutiveFailures: 0,
      }
    );
  }

  /**
   * Get all service statuses
   */
  getAllServiceStatuses(): Record<string, AIServiceStatus> {
    const statuses: Record<string, AIServiceStatus> = {};
    for (const [service, status] of this.serviceStatus.entries()) {
      statuses[service] = status;
    }
    return statuses;
  }

  /**
   * Force reset a service status (for manual recovery)
   */
  resetService(service: string): void {
    this.serviceStatus.set(service, {
      isAvailable: true,
      consecutiveFailures: 0,
    });
    console.log(`AI service ${service} status manually reset`);
  }
}

// Singleton instance
export const aiServiceDegradation = new AIServiceDegradationManager();

/**
 * Middleware to check AI service availability before processing requests
 */
export const checkAIServiceAvailability = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!aiServiceDegradation.isServiceAvailable(serviceName)) {
      const status = aiServiceDegradation.getServiceStatus(serviceName);
      const retryAfter = status.nextRetryTime
        ? Math.ceil((status.nextRetryTime.getTime() - Date.now()) / 1000)
        : 60;

      res.setHeader('Retry-After', retryAfter.toString());

      throw new APIError(
        `AI service is temporarily unavailable due to repeated failures. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
        503,
        'AI_SERVICE_UNAVAILABLE',
        {
          service: serviceName,
          consecutiveFailures: status.consecutiveFailures,
          nextRetryTime: status.nextRetryTime,
        }
      );
    }

    next();
  };
};

/**
 * Wrapper function to handle AI service calls with degradation tracking
 */
export async function withAIServiceDegradation<T>(
  serviceName: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    const result = await operation();
    aiServiceDegradation.recordSuccess(serviceName);
    return result;
  } catch (error) {
    aiServiceDegradation.recordFailure(serviceName);

    // Enhance error with service degradation info
    if (error instanceof Error) {
      const enhancedError = error as any;
      enhancedError.serviceName = serviceName;
      enhancedError.serviceStatus =
        aiServiceDegradation.getServiceStatus(serviceName);
    }

    throw error;
  }
}

/**
 * Health check endpoint handler for AI services
 */
export const getAIServiceHealth = (req: Request, res: Response) => {
  const statuses = aiServiceDegradation.getAllServiceStatuses();
  const overallHealth = Object.values(statuses).every(
    (status) => status.isAvailable
  );

  res.status(overallHealth ? 200 : 503).json({
    success: overallHealth,
    data: {
      overall: overallHealth ? 'healthy' : 'degraded',
      services: statuses,
      timestamp: new Date().toISOString(),
    },
  });
};
