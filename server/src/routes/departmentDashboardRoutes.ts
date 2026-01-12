import { Router } from 'express';
import {
  getDashboardOverview,
  getTeamPerformance,
  getAnalytics,
} from '../controllers/departmentDashboardController';
import { authenticate, requireDepartmentHead } from '../middleware/auth';

const router = Router();

// All routes require authentication and department head privileges
router.use(authenticate);
router.use(requireDepartmentHead);

// GET /api/v1/department/dashboard/overview - Get dashboard overview
router.get('/overview', getDashboardOverview);

// GET /api/v1/department/dashboard/team-performance - Get team performance metrics
router.get('/team-performance', getTeamPerformance);

// GET /api/v1/department/dashboard/analytics - Get analytics and trends
router.get('/analytics', getAnalytics);

export default router;
