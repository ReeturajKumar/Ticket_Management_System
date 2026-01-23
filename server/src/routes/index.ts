import { Router } from 'express';
import departmentRoutes from './departmentRoutes';
import publicRoutes from './publicRoutes';
import departmentAuthRoutes from './departmentAuthRoutes';
import adminRoutes from './adminRoutes';
import departmentDashboardRoutes from './departmentDashboardRoutes';
import departmentTicketRoutes from './departmentTicketRoutes';
import departmentTeamRoutes from './departmentTeamRoutes';
import departmentReportsRoutes from './departmentReportsRoutes';
import departmentStaffRoutes from './departmentStaffRoutes';

const router = Router();

// Mount route modules
// Note: Student authentication and ticket routes have been removed
// A new public ticket submission endpoint will be added

router.use('/departments', departmentRoutes);
router.use('/department-auth', departmentAuthRoutes);
router.use('/public', publicRoutes);
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
