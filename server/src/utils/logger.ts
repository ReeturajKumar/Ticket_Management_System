import winston from 'winston';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Winston Logger Configuration
 * Structured logging with request tracking and file rotation
 */

// Log directory
const LOG_DIR = process.env.LOG_DIR || 'logs';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const reqIdStr = requestId ? `[${requestId}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${reqIdStr}${message}${metaStr}`;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // HTTP requests log file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'http.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
    }),
  ],
  
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'exceptions.log'),
    format: fileFormat,
  })
);

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'rejections.log'),
    format: fileFormat,
  })
);

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return uuidv4().substring(0, 8);
}

/**
 * Middleware to attach request ID and log incoming requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate and attach request ID
  const requestId = generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Capture start time
  const startTime = Date.now();

  // Log request
  logger.http('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.userId,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    logger.log(logLevel, 'Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });
  });

  next();
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log with request context
 */
export function logWithContext(
  level: string,
  message: string,
  req?: Request,
  meta?: Record<string, any>
) {
  const requestId = req ? (req as any).requestId : undefined;
  const userId = req ? (req as any).user?.userId : undefined;
  
  logger.log(level, message, {
    requestId,
    userId,
    ...meta,
  });
}

/**
 * Log error with full context
 */
export function logError(
  error: Error,
  req?: Request,
  meta?: Record<string, any>
) {
  const requestId = req ? (req as any).requestId : undefined;
  const userId = req ? (req as any).user?.userId : undefined;
  
  logger.error(error.message, {
    requestId,
    userId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...meta,
  });
}

/**
 * Log database operation
 */
export function logDatabase(
  operation: string,
  collection: string,
  duration?: number,
  meta?: Record<string, any>
) {
  logger.debug(`DB: ${operation} on ${collection}`, {
    operation,
    collection,
    duration: duration ? `${duration}ms` : undefined,
    ...meta,
  });
}

/**
 * Log external service call
 */
export function logExternalService(
  service: string,
  operation: string,
  success: boolean,
  duration?: number,
  meta?: Record<string, any>
) {
  const level = success ? 'info' : 'warn';
  logger.log(level, `External: ${service} ${operation}`, {
    service,
    operation,
    success,
    duration: duration ? `${duration}ms` : undefined,
    ...meta,
  });
}

/**
 * Log security event
 */
export function logSecurity(
  event: string,
  req?: Request,
  meta?: Record<string, any>
) {
  const requestId = req ? (req as any).requestId : undefined;
  const ip = req?.ip;
  const userId = req ? (req as any).user?.userId : undefined;
  
  logger.warn(`Security: ${event}`, {
    requestId,
    ip,
    userId,
    event,
    ...meta,
  });
}

/**
 * Log audit event (important actions)
 */
export function logAudit(
  action: string,
  userId: string,
  resource: string,
  details?: Record<string, any>
) {
  logger.info(`Audit: ${action}`, {
    action,
    userId,
    resource,
    ...details,
  });
}

// ============================================================================
// PERFORMANCE LOGGING
// ============================================================================

/**
 * Timer for performance measurement
 */
export function startTimer(label: string): () => void {
  const start = Date.now();
  
  return () => {
    const duration = Date.now() - start;
    logger.debug(`Timer: ${label}`, { label, duration: `${duration}ms` });
  };
}

/**
 * Log slow operations
 */
export function logSlowOperation(
  operation: string,
  duration: number,
  threshold: number = 1000
) {
  if (duration > threshold) {
    logger.warn(`Slow operation: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      threshold: `${threshold}ms`,
    });
  }
}

// Export logger instance for direct use
export default logger;
