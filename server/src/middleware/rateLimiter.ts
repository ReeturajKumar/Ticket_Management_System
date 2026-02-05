import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config/appConfig';

function createRateLimitHandler(windowMs: number, maxRequests: number, customMessage: string) {
  return (req: Request, res: Response): void => {
    const retryAfter = new Date(Date.now() + windowMs);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: customMessage,
        userMessage: `Too many attempts. Please wait ${formatTimeRemaining(windowMs)} before trying again.`,
        retryAfter: retryAfter.toISOString(),
        retryAfterSeconds: Math.ceil(windowMs / 1000),
        remainingAttempts: 0,
        limit: maxRequests,
        windowMs,
      },
    });
  };
}

function formatTimeRemaining(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${Math.ceil(minutes / 60)} hour${Math.ceil(minutes / 60) !== 1 ? 's' : ''}`;
}

function createEnhancedRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    handler: createRateLimitHandler(options.windowMs, options.max, options.message),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    validate: { xForwardedForHeader: false },
  });
}

export const globalLimiter = createEnhancedRateLimiter({
  windowMs: config.rateLimit.global.windowMs,
  max: config.rateLimit.global.max,
  message: 'Too many requests from this IP, please try again later.',
});

export const authLimiter = createEnhancedRateLimiter({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: 'Too many authentication attempts.',
  skipSuccessfulRequests: true,
});

export const loginLimiter = createEnhancedRateLimiter({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  message: 'Too many login attempts. Your account may be locked.',
  skipSuccessfulRequests: true,
});

export const publicTicketLimiter = createEnhancedRateLimiter({
  windowMs: config.rateLimit.publicTicket.windowMs,
  max: config.rateLimit.publicTicket.max,
  message: 'Too many ticket submissions.',
});
