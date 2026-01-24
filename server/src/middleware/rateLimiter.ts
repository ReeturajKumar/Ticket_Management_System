import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate Limiting Configuration
 * Protects APIs from abuse and DDoS attacks
 * 
 * Enhanced with:
 * - Retry-after timestamps
 * - Remaining attempts counter
 * - User-friendly messages
 */

/**
 * Create enhanced rate limit message handler with detailed feedback
 */
const createRateLimitHandler = (
  windowMs: number,
  maxRequests: number,
  customMessage: string
) => {
  return (req: Request, res: Response): void => {
    const retryAfter = new Date(Date.now() + windowMs);
    const retryAfterSeconds = Math.ceil(windowMs / 1000);
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: customMessage,
        userMessage: `Too many attempts. Please wait ${formatTimeRemaining(windowMs)} before trying again.`,
        retryAfter: retryAfter.toISOString(),
        retryAfterSeconds,
        remainingAttempts: 0,
        limit: maxRequests,
        windowMs,
      },
    });
  };
};

/**
 * Format time remaining in human-readable format
 */
function formatTimeRemaining(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

/**
 * Create a rate limiter with enhanced feedback
 */
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
    // Use default key generator which properly handles IPv6
    // The default uses req.ip which express-rate-limit handles internally
    validate: { xForwardedForHeader: false },
  });
}

// Global rate limiter - applies to all requests
export const globalLimiter = createEnhancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  skipSuccessfulRequests: false,
});

// Strict limiter for authentication endpoints (login, register)
export const authLimiter = createEnhancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Reduced from 50 to 10 for stricter security
  message: 'Too many authentication attempts.',
  skipSuccessfulRequests: true,
});

// Login-specific limiter (stricter)
export const loginLimiter = createEnhancedRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 failed login attempts per 15 minutes
  message: 'Too many login attempts. Your account may be locked.',
  skipSuccessfulRequests: true,
});

// OTP request limiter (register, resend OTP)
export const otpLimiter = createEnhancedRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Reduced from 30 to 5
  message: 'Too many OTP requests.',
  skipSuccessfulRequests: false,
});

// OTP verification limiter (prevent brute force OTP guessing)
export const otpVerifyLimiter = createEnhancedRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Only 5 OTP verification attempts per 5 minutes
  message: 'Too many verification attempts.',
  skipSuccessfulRequests: true,
});

// Password reset limiter (forgot password)
export const passwordResetLimiter = createEnhancedRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset requests per hour
  message: 'Too many password reset requests.',
  skipSuccessfulRequests: false,
});

// Public ticket submission limiter (prevent spam)
export const publicTicketLimiter = createEnhancedRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many ticket submissions.',
  skipSuccessfulRequests: false,
});

/**
 * OTP Configuration Constants
 */
export const OTP_CONFIG = {
  EXPIRY_MINUTES: 5,        // Extended from 2 to 5 minutes
  EXPIRY_MS: 5 * 60 * 1000, // 5 minutes in milliseconds
  LENGTH: 6,
};

/**
 * Generate OTP with configured length
 */
export function generateOTP(): string {
  const min = Math.pow(10, OTP_CONFIG.LENGTH - 1);
  const max = Math.pow(10, OTP_CONFIG.LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Get OTP expiry date
 */
export function getOTPExpiry(): Date {
  return new Date(Date.now() + OTP_CONFIG.EXPIRY_MS);
}

/**
 * Get formatted OTP expiry time
 */
export function getOTPExpiryFormatted(): string {
  return `${OTP_CONFIG.EXPIRY_MINUTES} minutes`;
}
