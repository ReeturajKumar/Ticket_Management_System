import { Router } from 'express';
import {
  getSummaryReport,
  exportReport,
} from '../controllers/departmentReportsController';
import { authenticate, requireDepartmentHead } from '../middleware/auth';

const router = Router();

// All routes require authentication and department head privileges
router.use(authenticate);
router.use(requireDepartmentHead);

// GET /api/v1/department/reports/summary - Generate summary report
router.get('/summary', getSummaryReport);

// GET /api/v1/department/reports/export - Export report
router.get('/export', exportReport);

export default router;
