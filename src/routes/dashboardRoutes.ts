import { Router } from 'express';
import { getStudentDashboard, getTicketAnalytics } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/v1/dashboard/student - Get student dashboard statistics
router.get('/student', getStudentDashboard);

// GET /api/v1/dashboard/student/analytics - Get ticket analytics (monthly trend)
router.get('/student/analytics', getTicketAnalytics);

export default router;
