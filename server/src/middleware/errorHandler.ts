import { Request, Response, NextFunction } from 'express';
import AppError, { ErrorCode } from '../utils/AppError';

/**
 * Global Error Handler Middleware
 * Catches all errors and sends consistent JSON responses with:
 * - Error codes for frontend handling
 * - User-friendly messages
 * - Field-level validation details
 */
const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let code = ErrorCode.INTERNAL_ERROR;
  let message = 'Internal Server Error';
  let userMessage = 'Something went wrong. Please try again later.';
  let details: any = undefined;
  let isOperational = false;

  // If it's our custom AppError (enhanced version)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code as ErrorCode;
    message = err.message;
    userMessage = err.userMessage;
    details = err.details;
    isOperational = err.isOperational;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = ErrorCode.VALIDATION_FAILED;
    message = 'Validation Error';
    userMessage = 'Please check your input and try again.';
    isOperational = true;
    
    // Extract field-level errors from Mongoose
    const mongooseError = err as any;
    if (mongooseError.errors) {
      details = {};
      Object.keys(mongooseError.errors).forEach((field) => {
        details[field] = mongooseError.errors[field].message;
      });
    }
  }

  // Handle Mongoose duplicate key errors
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 409;
    code = ErrorCode.DUPLICATE_ENTRY;
    isOperational = true;
    
    // Extract duplicate field name
    const keyPattern = (err as any).keyPattern;
    if (keyPattern) {
      const field = Object.keys(keyPattern)[0];
      if (field === 'email') {
        code = ErrorCode.EMAIL_ALREADY_EXISTS;
        message = 'Email already exists';
        userMessage = 'An account with this email already exists.';
      } else {
        message = `Duplicate value for: ${field}`;
        userMessage = `This ${field} already exists.`;
      }
    } else {
      message = 'Duplicate field value entered';
      userMessage = 'This entry already exists.';
    }
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = ErrorCode.INVALID_ID_FORMAT;
    message = 'Invalid ID format';
    userMessage = 'The provided ID is not valid.';
    isOperational = true;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ErrorCode.TOKEN_INVALID;
    message = 'Invalid token';
    userMessage = 'Your session is invalid. Please log in again.';
    isOperational = true;
  }

  // Handle JWT expired errors
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ErrorCode.TOKEN_EXPIRED;
    message = 'Token expired';
    userMessage = 'Your session has expired. Please log in again.';
    isOperational = true;
  }

  // Log error for debugging (only in development or for non-operational errors)
  if (process.env.NODE_ENV === 'development' || !isOperational) {
    console.error('Error:', {
      code,
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method,
    });
  }

  // Send error response with enhanced format
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      userMessage,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    },
    // Include stack trace only in development
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        originalMessage: err.message,
        stack: err.stack,
      },
    }),
  });
};

export default errorHandler;
