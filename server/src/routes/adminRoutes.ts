import { Router } from 'express';
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  createUser,
  getAdminDashboardOverview,
  getAllUsers,
  getUserDetails,
  updateUser,
  getAllTickets,
  getTicketDetails,
  getAdminAnalytics,
  getSystemStats,
} from '../controllers/adminController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All admin routes require authentication
// TODO: Add admin role check middleware
router.use(authenticate);

// Dashboard & Overview
// GET /api/v1/admin/dashboard/overview - Get admin dashboard overview
router.get('/dashboard/overview', getAdminDashboardOverview);

// Analytics
// GET /api/v1/admin/analytics - Get admin analytics
router.get('/analytics', getAdminAnalytics);

// System Statistics
// GET /api/v1/admin/stats - Get system statistics
router.get('/stats', getSystemStats);

// User Management
// GET /api/v1/admin/pending-users - Get pending department user requests
router.get('/pending-users', getPendingUsers);

// POST /api/v1/admin/users - Create new user
router.post('/users', createUser);

// GET /api/v1/admin/users - Get all users (with filters)
router.get('/users', getAllUsers);

// GET /api/v1/admin/users/:userId - Get user details
router.get('/users/:userId', getUserDetails);

// PATCH /api/v1/admin/users/:userId - Update user
router.patch('/users/:userId', updateUser);

// POST /api/v1/admin/approve-user/:userId - Approve department user
router.post('/approve-user/:userId', approveUser);

// POST /api/v1/admin/reject-user/:userId - Reject department user
router.post('/reject-user/:userId', rejectUser);

// Ticket Management
// GET /api/v1/admin/tickets - Get all tickets (admin view)
router.get('/tickets', getAllTickets);

// GET /api/v1/admin/tickets/:ticketId - Get ticket details (admin view)
router.get('/tickets/:ticketId', getTicketDetails);

export default router;
