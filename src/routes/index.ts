import { Router } from 'express';
import authRoutes from './authRoutes';
import testRoutes from './testRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/test', testRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
