import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Configuration
 * Protects APIs from abuse and DDoS attacks
 */

// Global rate limiter - applies to all requests
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests
  skipSuccessfulRequests: false,
});

// Strict limiter for authentication endpoints (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// OTP request limiter (register, resend OTP)
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Limit each IP to 30 OTP requests per windowMs
  message: {
    success: false,
    message: 'Too many OTP requests, please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verification limiter (prevent brute force OTP guessing)
export const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 verification attempts per windowMs
  message: {
    success: false,
    message: 'Too many verification attempts, please try again after 5 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset limiter (forgot password)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests, please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public ticket submission limiter (prevent spam)
export const publicTicketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 ticket submissions per hour
  message: {
    success: false,
    message: 'Too many ticket submissions. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
