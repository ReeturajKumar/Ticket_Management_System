import { Router } from 'express';
import authRoutes from './authRoutes';
import testRoutes from './testRoutes';
import profileRoutes from './profileRoutes';
import ticketRoutes from './ticketRoutes';
import dashboardRoutes from './dashboardRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/test', testRoutes);
router.use('/profile', profileRoutes);
router.use('/tickets', ticketRoutes);
router.use('/dashboard', dashboardRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
