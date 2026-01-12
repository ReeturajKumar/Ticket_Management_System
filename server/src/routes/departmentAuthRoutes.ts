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
} from '../controllers/departmentAuthController';
import { otpLimiter, authLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/v1/department-auth/register - Register department user
router.post('/register', otpLimiter, registerDepartmentUser);

// POST /api/v1/department-auth/verify-otp - Verify email OTP
router.post('/verify-otp', otpLimiter, verifyDepartmentOTP);

// POST /api/v1/department-auth/resend-otp - Resend OTP
router.post('/resend-otp', otpLimiter, resendDepartmentOTP);

// POST /api/v1/department-auth/login - Login department user
router.post('/login', authLimiter, loginDepartmentUser);

// POST /api/v1/department-auth/refresh - Refresh access token
router.post('/refresh', refreshDepartmentToken);

// POST /api/v1/department-auth/logout - Logout department user
router.post('/logout', authenticate, logoutDepartmentUser);

// POST /api/v1/department-auth/forgot-password - Request password reset
router.post('/forgot-password', otpLimiter, forgotPasswordDepartment);

// POST /api/v1/department-auth/reset-password - Reset password with token
router.post('/reset-password', resetPasswordDepartment);

// PATCH /api/v1/department-auth/change-password - Change password (requires auth)
router.patch('/change-password', authenticate, changePasswordDepartment);

// GET /api/v1/department-auth/status - Check registration status
router.get('/status', getRegistrationStatus);

export default router;
