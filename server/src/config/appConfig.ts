import path from 'path';

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  mongo: {
    uri: process.env.MONGO_URI || '',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      w: 'majority' as const,
      readPreference: 'primaryPreferred' as const,
    },
    maxRetries: 3,
    retryDelay: 5000,
  },

  jwt: {
    secret: process.env.ACCESS_TOKEN_SECRET || 'fallback_secret',
  },

  cors: {
    allowedOrigins: [
      'http://localhost:5173',
      process.env.CLIENT_URL || 'https://ticket-management-system-nine.vercel.app',
    ],
  },

  paths: {
    uploads: path.join(__dirname, '../../uploads'),
    exports: path.join(__dirname, '../../exports'),
    logs: process.env.LOG_DIR || 'logs',
  },

  rateLimit: {
    global: {
      windowMs: 15 * 60 * 1000,
      max: 150,
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
    login: {
      windowMs: 5 * 60 * 1000,
      max: 50,
    },
    publicTicket: {
      windowMs: 60 * 60 * 1000,
      max: 50,
    },
  },

  compression: {
    level: 6,
    threshold: 1024,
  },

  transaction: {
    maxRetries: 3,
    retryDelay: 100,
  }
};

export default config;
