import { Router } from 'express';
import {
  getPendingUsers,
  approveUser,
  rejectUser,
} from '../controllers/adminController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All admin routes require authentication
// TODO: Add admin role check middleware
router.use(authenticate);

// GET /api/v1/admin/pending-users - Get pending department user requests
router.get('/pending-users', getPendingUsers);

// POST /api/v1/admin/approve-user/:userId - Approve department user
router.post('/approve-user/:userId', approveUser);

// POST /api/v1/admin/reject-user/:userId - Reject department user
router.post('/reject-user/:userId', rejectUser);

export default router;
