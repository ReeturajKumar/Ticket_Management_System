import { Request, Response, NextFunction } from 'express';

/**
 * Async Error Handler Wrapper
 * Catches errors in async route handlers and passes them to error middleware
 * Prevents unhandled promise rejections from crashing the server
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Route Isolation Middleware
 * Ensures errors in one route don't crash the entire server
 * Provides graceful degradation
 */
export const routeIsolation = (routeName: string) => {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error for monitoring
    console.error(`[${routeName}] Error:`, {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    // Don't let this error propagate to crash the server
    // Send error response and continue
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: `Service temporarily unavailable for ${routeName}. Please try again later.`,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  };
};

/**
 * Health Check Middleware
 * Monitors endpoint health and can disable unhealthy endpoints
 */
class EndpointHealthMonitor {
  private errorCounts: Map<string, number> = new Map();
  private disabledEndpoints: Set<string> = new Set();
  private readonly ERROR_THRESHOLD = 10; // Disable after 10 errors in window
  private readonly RECOVERY_TIME = 5 * 60 * 1000; // 5 minutes

  recordError(endpoint: string): void {
    const currentCount = this.errorCounts.get(endpoint) || 0;
    this.errorCounts.set(endpoint, currentCount + 1);

    // Disable endpoint if threshold exceeded
    if (currentCount + 1 >= this.ERROR_THRESHOLD) {
      this.disableEndpoint(endpoint);
    }
  }

  private disableEndpoint(endpoint: string): void {
    console.warn(`[HEALTH MONITOR] Disabling endpoint: ${endpoint} due to excessive errors`);
    this.disabledEndpoints.add(endpoint);

    // Auto-recover after recovery time
    setTimeout(() => {
      this.enableEndpoint(endpoint);
    }, this.RECOVERY_TIME);
  }

  private enableEndpoint(endpoint: string): void {
    console.info(`[HEALTH MONITOR] Re-enabling endpoint: ${endpoint}`);
    this.disabledEndpoints.delete(endpoint);
    this.errorCounts.set(endpoint, 0);
  }

  isEndpointDisabled(endpoint: string): boolean {
    return this.disabledEndpoints.has(endpoint);
  }

  checkHealth(endpoint: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.isEndpointDisabled(endpoint)) {
        return res.status(503).json({
          success: false,
          message: `This endpoint is temporarily unavailable. Please try again in a few minutes.`,
        });
      }
      next();
    };
  }
}

// Export singleton instance
export const healthMonitor = new EndpointHealthMonitor();

/**
 * Error tracking middleware
 * Tracks errors and reports to health monitor
 */
export const trackErrors = (endpoint: string) => {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    healthMonitor.recordError(endpoint);
    next(err);
  };
};
