import { Router } from 'express';
import { getDepartments } from '../controllers/departmentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/v1/departments - Get all departments (requires authentication)
router.get('/', authenticate, getDepartments);

export default router;
