import mongoose from 'mongoose';
import config from './appConfig';

const connectionOptions: mongoose.ConnectOptions = config.mongo.options;

const MAX_RETRIES = config.mongo.maxRetries;
const RETRY_DELAY_MS = config.mongo.retryDelay;

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async (): Promise<void> => {
  const mongoURI = config.mongo.uri;
  
  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(mongoURI, connectionOptions);
      
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      
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
