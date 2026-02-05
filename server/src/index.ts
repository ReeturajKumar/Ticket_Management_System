import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
import mongoose from 'mongoose';
import connectDB from './config/db';
import errorHandler from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';
import { initializeSocket } from './utils/socket';
import logger, { requestLogger } from './utils/logger';
import config from './config/appConfig';

connectDB();

const app: Express = express();
const httpServer = createServer(app);
const PORT = config.port;

const io = initializeSocket(httpServer);

app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression({
  level: config.compression.level,
  threshold: config.compression.threshold,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(globalLimiter);
app.use('/api/v1/uploads', express.static('uploads'));

app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the CloudBlitz API - Your centralized support platform');
});

import routes from './routes';
app.use('/api/v1', routes);

app.use(errorHandler);

const server = httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('WebSocket server ready for connections');
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  
  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);

  try {
    server.close(() => {
      logger.info('HTTP server closed');
    });

    if (io) {
      io.close(() => {
        logger.info('WebSocket connections closed');
      });
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed');

    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack,
    } : reason,
  });
});

export { app, server };
