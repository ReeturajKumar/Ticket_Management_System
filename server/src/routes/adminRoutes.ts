import { Router } from 'express';
import { loginAdminUser } from '../controllers/adminAuthController';
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
  getAdminConstants,
} from '../controllers/adminController';
import {
  getAnalyticsOverview,
  getDepartmentAnalytics,
  getStaffAnalytics,
  exportTickets,
  exportAnalyticsReport,
  exportUsers,
  getTicketTrends,
} from '../controllers/adminAnalyticsController';
import { loginLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import { validate, createUserSchema, updateUserSchema, rejectionSchema, loginSchema } from '../utils/validation';

const adminAuthRouter = Router();
adminAuthRouter.post('/login', loginLimiter, validate(loginSchema), loginAdminUser);

const adminActionRouter = Router();
adminActionRouter.use(authenticate);

// Dashboard
adminActionRouter.get('/dashboard/overview', getAdminDashboardOverview);

// Analytics - Overview & Metrics
adminActionRouter.get('/analytics', getAdminAnalytics);
adminActionRouter.get('/analytics/overview', getAnalyticsOverview);
adminActionRouter.get('/analytics/departments', getDepartmentAnalytics);
adminActionRouter.get('/analytics/staff', getStaffAnalytics);
adminActionRouter.get('/analytics/trends', getTicketTrends);

// Analytics - Export
adminActionRouter.get('/analytics/export/tickets', exportTickets);
adminActionRouter.get('/analytics/export/users', exportUsers);
adminActionRouter.get('/analytics/export/report', exportAnalyticsReport);

// System
adminActionRouter.get('/stats', getSystemStats);
adminActionRouter.get('/constants', getAdminConstants);

// User Management
adminActionRouter.get('/pending-users', getPendingUsers);
adminActionRouter.post('/users', validate(createUserSchema), createUser);
adminActionRouter.get('/users', getAllUsers);
adminActionRouter.get('/users/:userId', getUserDetails);
adminActionRouter.patch('/users/:userId', validate(updateUserSchema), updateUser);
adminActionRouter.post('/approve-user/:userId', approveUser);
adminActionRouter.post('/reject-user/:userId', validate(rejectionSchema), rejectUser);

// Ticket Management
adminActionRouter.get('/tickets', getAllTickets);
adminActionRouter.get('/tickets/:ticketId', getTicketDetails);

export { adminAuthRouter, adminActionRouter };
