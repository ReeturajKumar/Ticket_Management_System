import { Router } from 'express';
import { register, login, refreshToken, logout } from '../controllers/authController';
import { verifyOTP, resendOTP } from '../controllers/otpController';
import { forgotPassword, resetPassword } from '../controllers/passwordResetController';

const router = Router();

// POST /api/v1/auth/register - Register new user (sends OTP)
router.post('/register', register);

// POST /api/v1/auth/verify-otp - Verify OTP and complete registration
router.post('/verify-otp', verifyOTP);

// POST /api/v1/auth/resend-otp - Resend OTP
router.post('/resend-otp', resendOTP);

// POST /api/v1/auth/login - Login user
router.post('/login', login);

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', refreshToken);

// POST /api/v1/auth/logout - Logout user
router.post('/logout', logout);

// POST /api/v1/auth/forgot-password - Send password reset email
router.post('/forgot-password', forgotPassword);

// POST /api/v1/auth/reset-password - Reset password with token
router.post('/reset-password', resetPassword);

export default router;
