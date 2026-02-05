/**
 * Error codes for consistent error handling across the application
 */
export enum ErrorCode {
  // Validation Errors (400)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_ID_FORMAT = 'INVALID_ID_FORMAT',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  
  // Authentication Errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  NO_TOKEN_PROVIDED = 'NO_TOKEN_PROVIDED',
  
  // Authorization Errors (403)
  FORBIDDEN = 'FORBIDDEN',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_NOT_APPROVED = 'ACCOUNT_NOT_APPROVED',
  ACCOUNT_REJECTED = 'ACCOUNT_REJECTED',
  
  // Not Found Errors (404)
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Conflict Errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  
  // Rate Limit Errors (429)
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  
  // Business Logic Errors
  TICKET_CLOSED = 'TICKET_CLOSED',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  INVALID_DEPARTMENT = 'INVALID_DEPARTMENT',
}

/**
 * Error details interface for field-level errors
 */
export interface ErrorDetails {
  [field: string]: string | string[];
}

/**
 * Error options interface
 */
export interface AppErrorOptions {
  code?: ErrorCode | string;
  message: string;
  userMessage?: string;
  details?: ErrorDetails;
}

/**
 * User-friendly error messages mapping
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  [ErrorCode.VALIDATION_FAILED]: 'Please check your input and try again.',
  [ErrorCode.INVALID_INPUT]: 'The information provided is not valid.',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
  [ErrorCode.INVALID_EMAIL_FORMAT]: 'Please enter a valid email address.',
  [ErrorCode.INVALID_ID_FORMAT]: 'The provided ID is not valid.',
  [ErrorCode.INVALID_DATE_RANGE]: 'Please select a valid date range.',
  
  [ErrorCode.UNAUTHORIZED]: 'Please log in to continue.',
  [ErrorCode.INVALID_CREDENTIALS]: 'The email or password you entered is incorrect.',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.TOKEN_INVALID]: 'Your session is invalid. Please log in again.',
  [ErrorCode.NO_TOKEN_PROVIDED]: 'Please log in to access this feature.',
  
  [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ErrorCode.ACCESS_DENIED]: 'Access denied. You cannot access this resource.',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'You need additional permissions for this action.',
  [ErrorCode.ACCOUNT_NOT_APPROVED]: 'Your account is pending approval.',
  [ErrorCode.ACCOUNT_REJECTED]: 'Your registration was not approved.',
  
  [ErrorCode.NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCode.USER_NOT_FOUND]: 'User not found.',
  [ErrorCode.TICKET_NOT_FOUND]: 'Ticket not found.',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource does not exist.',
  
  [ErrorCode.CONFLICT]: 'A conflict occurred with your request.',
  [ErrorCode.DUPLICATE_ENTRY]: 'This entry already exists.',
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
  
  [ErrorCode.TOO_MANY_REQUESTS]: 'Too many attempts. Please wait and try again.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Request limit exceeded. Please try again later.',
  
  [ErrorCode.INTERNAL_ERROR]: 'Something went wrong. Please try again later.',
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
  [ErrorCode.EMAIL_SEND_FAILED]: 'Failed to send email. Please try again.',
  
  [ErrorCode.TICKET_CLOSED]: 'This ticket is closed and cannot be modified.',
  [ErrorCode.INVALID_STATUS_TRANSITION]: 'This status change is not allowed.',
  [ErrorCode.INVALID_DEPARTMENT]: 'Please select a valid department.',
};

/**
 * Enhanced Custom Application Error Class
 * Supports error codes, user-friendly messages, and field-level details
 */
class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public userMessage: string;
  public details?: ErrorDetails;
  public timestamp: Date;

  /**
   * Create an AppError
   * @param messageOrOptions - Error message string or options object
   * @param statusCode - HTTP status code (default: 500)
   */
  constructor(messageOrOptions: string | AppErrorOptions, statusCode: number = 500) {
    // Handle both string and options object
    if (typeof messageOrOptions === 'string') {
      super(messageOrOptions);
      this.code = ErrorCode.INTERNAL_ERROR;
      this.userMessage = USER_FRIENDLY_MESSAGES[ErrorCode.INTERNAL_ERROR];
    } else {
      super(messageOrOptions.message);
      this.code = messageOrOptions.code || ErrorCode.INTERNAL_ERROR;
      this.userMessage = messageOrOptions.userMessage || 
                         USER_FRIENDLY_MESSAGES[this.code] || 
                         messageOrOptions.message;
      this.details = messageOrOptions.details;
    }

    this.statusCode = statusCode;
    this.isOperational = true;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a validation error with details
   */
  static validation(details: ErrorDetails, message?: string): AppError {
    return new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message: message || 'Validation failed',
      details,
    }, 400);
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(message?: string): AppError {
    return new AppError({
      code: ErrorCode.UNAUTHORIZED,
      message: message || 'Unauthorized access',
    }, 401);
  }

  /**
   * Create a forbidden error
   */
  static forbidden(message?: string): AppError {
    return new AppError({
      code: ErrorCode.FORBIDDEN,
      message: message || 'Access forbidden',
    }, 403);
  }

  /**
   * Create a not found error
   */
  static notFound(resource?: string): AppError {
    const message = resource ? `${resource} not found` : 'Resource not found';
    return new AppError({
      code: ErrorCode.NOT_FOUND,
      message,
      userMessage: resource ? `${resource} not found` : USER_FRIENDLY_MESSAGES[ErrorCode.NOT_FOUND],
    }, 404);
  }

  /**
   * Create a conflict/duplicate error
   */
  static conflict(message: string, code?: ErrorCode): AppError {
    return new AppError({
      code: code || ErrorCode.CONFLICT,
      message,
    }, 409);
  }

  /**
   * Create a rate limit error
   */
  static rateLimited(retryAfter?: Date): AppError {
    const error = new AppError({
      code: ErrorCode.TOO_MANY_REQUESTS,
      message: 'Too many requests',
    }, 429);
    if (retryAfter) {
      (error as any).retryAfter = retryAfter;
    }
    return error;
  }

  /**
   * Create an internal server error
   */
  static internal(message?: string): AppError {
    return new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: message || 'Internal server error',
    }, 500);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        userMessage: this.userMessage,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
      },
    };
  }
}

export default AppError;
