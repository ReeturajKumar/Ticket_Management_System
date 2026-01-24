import mongoose from 'mongoose';

/**
 * MongoDB Connection Configuration
 * Optimized with connection pooling and retry logic
 */

// Connection options for optimal performance
const connectionOptions: mongoose.ConnectOptions = {
  // Connection Pool Settings
  maxPoolSize: 10,          // Maximum number of connections in the pool
  minPoolSize: 2,           // Minimum number of connections to maintain
  
  // Timeout Settings
  serverSelectionTimeoutMS: 5000,   // Timeout for server selection (5 seconds)
  socketTimeoutMS: 45000,           // Timeout for socket operations (45 seconds)
  connectTimeoutMS: 10000,          // Timeout for initial connection (10 seconds)
  
  // Keep-alive Settings
  heartbeatFrequencyMS: 10000,      // Frequency of heartbeat checks
  
  // Write Concern
  w: 'majority',                    // Write concern for data durability
  
  // Read Preference
  readPreference: 'primaryPreferred', // Read from primary, fallback to secondary
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGO_URI;
  
  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(mongoURI, connectionOptions);
      
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      console.log(`Connection Pool Size: ${connectionOptions.maxPoolSize}`);
      
      // Set up connection event handlers
      setupConnectionHandlers();
      
      return;
    } catch (error: any) {
      retries++;
      console.error(`MongoDB connection attempt ${retries} failed: ${error.message}`);
      
      if (retries < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
    }
  }
};

/**
 * Set up MongoDB connection event handlers
 */
const setupConnectionHandlers = (): void => {
  const db = mongoose.connection;
  
  db.on('connected', () => {
    console.log('MongoDB connection established');
  });
  
  db.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });
  
  db.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });
  
  db.on('reconnected', () => {
    console.log('MongoDB reconnected successfully');
  });
  
  // Handle process termination gracefully
  process.on('SIGINT', async () => {
    try {
      await db.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      process.exit(1);
    }
  });
};

/**
 * Get connection pool statistics
 */
export const getConnectionStats = () => {
  const db = mongoose.connection;
  return {
    readyState: db.readyState,
    host: db.host,
    port: db.port,
    name: db.name,
  };
};

export default connectDB;
