import { Router } from 'express';
import { 
  getStudentOverview, 
  getDepartmentStats, 
  getMonthlyStats 
} from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/v1/dashboard/student/overview - Get summary statistics and recent tickets
router.get('/student/overview', getStudentOverview);

// GET /api/v1/dashboard/student/departments - Get department-wise breakdown
router.get('/student/departments', getDepartmentStats);

// GET /api/v1/dashboard/student/monthly - Get monthly statistics and trends
router.get('/student/monthly', getMonthlyStats);

export default router;
