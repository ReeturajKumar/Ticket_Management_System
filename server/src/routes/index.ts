import { Router } from 'express';
import authRoutes from './authRoutes';
import testRoutes from './testRoutes';
import profileRoutes from './profileRoutes';
import ticketRoutes from './ticketRoutes';
import dashboardRoutes from './dashboardRoutes';
import departmentRoutes from './departmentRoutes';
import departmentAuthRoutes from './departmentAuthRoutes';
import adminRoutes from './adminRoutes';
import departmentDashboardRoutes from './departmentDashboardRoutes';
import departmentTicketRoutes from './departmentTicketRoutes';
import departmentTeamRoutes from './departmentTeamRoutes';
import departmentReportsRoutes from './departmentReportsRoutes';
import departmentStaffRoutes from './departmentStaffRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/test', testRoutes);
router.use('/profile', profileRoutes);
router.use('/tickets', ticketRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/departments', departmentRoutes);
router.use('/department-auth', departmentAuthRoutes);
router.use('/admin', adminRoutes);
router.use('/department/dashboard', departmentDashboardRoutes);
router.use('/department/tickets', departmentTicketRoutes);
router.use('/department/team', departmentTeamRoutes);
router.use('/department/reports', departmentReportsRoutes);
router.use('/department/staff', departmentStaffRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
