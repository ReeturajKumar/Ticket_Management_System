import { Router } from 'express';
import {
  registerDepartmentUser,
  loginDepartmentUser,
  getRegistrationStatus,
  verifyDepartmentOTP,
  resendDepartmentOTP,
  refreshDepartmentToken,
  logoutDepartmentUser,
  forgotPasswordDepartment,
  resetPasswordDepartment,
  changePasswordDepartment,
  getActiveSessions,
  revokeSession,
} from '../controllers/departmentAuthController';
import { 
  otpLimiter, 
  otpVerifyLimiter,
  loginLimiter, 
  passwordResetLimiter,
  authLimiter,
} from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

// POST /api/v1/department-auth/register - Register department user
// Rate limited: 5 requests per 10 minutes
router.post('/register', otpLimiter, registerDepartmentUser);

// POST /api/v1/department-auth/verify-otp - Verify email OTP
// Rate limited: 5 verification attempts per 5 minutes (strict for brute force protection)
router.post('/verify-otp', otpVerifyLimiter, verifyDepartmentOTP);

// POST /api/v1/department-auth/resend-otp - Resend OTP
// Rate limited: 5 requests per 10 minutes
router.post('/resend-otp', otpLimiter, resendDepartmentOTP);

// POST /api/v1/department-auth/login - Login department user
// Supports: { email, password, rememberMe?: boolean }
// Rate limited: 5 failed attempts per 15 minutes
router.post('/login', loginLimiter, loginDepartmentUser);

// POST /api/v1/department-auth/refresh - Refresh access token
// Rate limited: standard auth limiter
router.post('/refresh', authLimiter, refreshDepartmentToken);

// POST /api/v1/department-auth/forgot-password - Request password reset
// Rate limited: 3 requests per hour
router.post('/forgot-password', passwordResetLimiter, forgotPasswordDepartment);

// POST /api/v1/department-auth/reset-password - Reset password with token
router.post('/reset-password', resetPasswordDepartment);

// GET /api/v1/department-auth/status - Check registration status
router.get('/status', getRegistrationStatus);

// ============================================================================
// PROTECTED ROUTES (Authentication Required)
// ============================================================================

// POST /api/v1/department-auth/logout - Logout department user
// Supports: { sessionId?, allDevices?: boolean }
// - Default: logout current session
// - sessionId: logout specific session
// - allDevices: true -> logout from all devices
router.post('/logout', authenticate, logoutDepartmentUser);

// PATCH /api/v1/department-auth/change-password - Change password (requires auth)
router.patch('/change-password', authenticate, changePasswordDepartment);

// ============================================================================
// SESSION MANAGEMENT ROUTES (Authentication Required)
// ============================================================================

// GET /api/v1/department-auth/sessions - Get all active sessions
// Returns list of devices/sessions with last activity
router.get('/sessions', authenticate, getActiveSessions);

// DELETE /api/v1/department-auth/sessions/:sessionId - Revoke a specific session
// Allows users to logout from specific devices
router.delete('/sessions/:sessionId', authenticate, revokeSession);

export default router;
