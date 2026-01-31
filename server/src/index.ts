import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db';
import errorHandler from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';
import { initializeSocket, getSocketStats } from './utils/socket';
import logger, { requestLogger } from './utils/logger';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app: Express = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
const io = initializeSocket(httpServer);

app.set('trust proxy', 1);
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL || 'https://ticket-management-system-nine.vercel.app', 
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Response compression - reduces response size for faster transfers
// Compresses responses larger than 1KB
app.use(compression({
  level: 6, // Balanced compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't accept it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression's default filter
    return compression.filter(req, res);
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (adds request ID and logs requests)
app.use(requestLogger);

// Apply global rate limiter to all requests
app.use(globalLimiter);

// Serve static files from uploads directory
app.use('/api/v1/uploads', express.static('uploads'));

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the EduDesk API - Your centralized support platform');
});

// API Routes
import routes from './routes';
app.use('/api/v1', routes);

// Global Error Handler
app.use(errorHandler);

// Start Server with HTTP (for Socket.IO support)
const server = httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('WebSocket server ready for connections');
});

// ============================================================================
// GRACEFUL SHUTDOWN HANDLING
// ============================================================================

// Shutdown state
let isShuttingDown = false;

/**
 * Graceful shutdown handler
 * Closes all connections properly before exiting
 */
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown...`);

  // Set a timeout for forceful shutdown
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000); // 30 seconds

  try {
    // 1. Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed - no longer accepting connections');
    });

    // 2. Close Socket.IO connections
    if (io) {
      io.close(() => {
        logger.info('WebSocket connections closed');
      });
    }

    // 3. Wait for in-flight requests to complete (give them 10 seconds)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Close database connection
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed');

    // 5. Clear the timeout and exit
    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Handle SIGTERM (Docker, Kubernetes, pm2)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
  // Give time to log before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack,
    } : reason,
  });
});

// Export for testing
export { app, server };
