import winston from 'winston';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/appConfig';

const LOG_DIR = config.paths.logs;

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = { error: 'red', warn: 'yellow', info: 'green', http: 'magenta', debug: 'blue' };

winston.addColors(colors);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const reqIdStr = requestId ? `[${requestId}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${reqIdStr}${message}${metaStr}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const getLevel = () => (config.nodeEnv === 'development' ? 'debug' : 'info');

const logger = winston.createLogger({
  level: getLevel(),
  levels,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error', format: fileFormat, maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log'), format: fileFormat, maxsize: 10485760, maxFiles: 5 }),
  ],
  exitOnError: false,
});

logger.exceptions.handle(new winston.transports.File({ filename: path.join(LOG_DIR, 'exceptions.log'), format: fileFormat }));
logger.rejections.handle(new winston.transports.File({ filename: path.join(LOG_DIR, 'rejections.log'), format: fileFormat }));

export const generateRequestId = () => uuidv4().substring(0, 8);

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  logger.http('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.userId,
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.log(res.statusCode >= 400 ? 'warn' : 'http', 'Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

export const logWithContext = (level: string, message: string, req?: Request, meta?: any) => {
  logger.log(level, message, {
    requestId: (req as any)?.requestId,
    userId: (req as any)?.user?.userId,
    ...meta,
  });
};

export const logError = (error: Error, req?: Request, meta?: any) => {
  logger.error(error.message, {
    requestId: (req as any)?.requestId,
    userId: (req as any)?.user?.userId,
    error: { name: error.name, message: error.message, stack: error.stack },
    ...meta,
  });
};

export const logDatabase = (operation: string, collection: string, duration?: number, meta?: any) => {
  logger.debug(`DB: ${operation} on ${collection}`, { operation, collection, duration: duration ? `${duration}ms` : undefined, ...meta });
};

export const logSecurity = (event: string, req?: Request, meta?: any) => {
  logger.warn(`Security: ${event}`, {
    requestId: (req as any)?.requestId,
    ip: req?.ip,
    userId: (req as any)?.user?.userId,
    event,
    ...meta,
  });
};

export const logAudit = (action: string, userId: string, resource: string, details?: any) => {
  logger.info(`Audit: ${action}`, { action, userId, resource, ...details });
};

export const startTimer = (label: string) => {
  const start = Date.now();
  return () => {
    logger.debug(`Timer: ${label}`, { label, duration: `${Date.now() - start}ms` });
  };
};

export default logger;
