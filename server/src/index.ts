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

app.set('trust proxy', 1);
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'http://localhost:3000',
  process.env.CLIENT_URL || 'https://ticket-management-system-nine.vercel.app/login', 
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
