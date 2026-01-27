import { Router } from 'express';
import {
  loginAdminUser,
  refreshAdminToken,
  logoutAdminUser,
} from '../controllers/adminAuthController';
import { 
  loginLimiter, 
  authLimiter,
} from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

// POST /api/v1/admin-auth/login - Login admin user
// Rate limited: 5 failed attempts per 15 minutes
router.post('/login', loginLimiter, loginAdminUser);

// POST /api/v1/admin-auth/refresh - Refresh access token
// Rate limited: standard auth limiter
router.post('/refresh', authLimiter, refreshAdminToken);

// ============================================================================
// PROTECTED ROUTES (Authentication Required)
// ============================================================================

// POST /api/v1/admin-auth/logout - Logout admin user
// Supports: { sessionId?, allDevices?: boolean }
router.post('/logout', authenticate, logoutAdminUser);

export default router;
