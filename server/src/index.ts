import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import errorHandler from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - required for rate limiting to work correctly behind Render/Heroku/etc
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiter to all requests
app.use(globalLimiter);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the Student Ticketing System API (TypeScript)');
});

// API Routes
import routes from './routes';
app.use('/api/v1', routes);

// Global Error Handler (must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
