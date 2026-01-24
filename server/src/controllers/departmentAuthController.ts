import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken, getTokenExpiry } from '../utils/jwt';
import { sendOTPEmail, sendPasswordResetEmail } from '../utils/email';
import { UserRole, Department } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import { generateOTP, getOTPExpiry, getOTPExpiryFormatted, OTP_CONFIG } from '../middleware/rateLimiter';
import {
  createSession,
  addSessionToUser,
  findSessionByToken,
  updateSession,
  removeSession,
  removeAllSessions,
  getActiveSessions as getUserActiveSessions,
  cleanExpiredSessions,
} from '../utils/session';

/**
 * Register Department User
 * POST /api/v1/department-auth/register
 */
export const registerDepartmentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, department, isHead } = req.body;

    // Validate required fields
    if (!name || !email || !password || !department) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Please provide name, email, password, and department',
      }, 400);
    }

    // Validate department
    const validDepartments = Object.values(Department);
    if (!validDepartments.includes(department)) {
      throw new AppError({
        code: ErrorCode.INVALID_DEPARTMENT,
        message: 'Invalid department',
      }, 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError({
        code: ErrorCode.EMAIL_ALREADY_EXISTS,
        message: 'User with this email already exists',
      }, 409);
    }

    // Generate OTP with extended expiry (5 minutes)
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with PENDING approval status
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: UserRole.DEPARTMENT_USER,
      department,
      isHead: isHead || false,
      verificationOTP: otp,
      otpExpiry,
      isVerified: false,
      approvalStatus: 'PENDING',
      isApproved: false,
      sessions: [],
    });

    // Send OTP email
    await sendOTPEmail(email, name, otp);

    res.status(201).json({
      success: true,
      message: 'Registration request submitted. Please verify your email and wait for admin approval.',
      data: {
        email: user.email,
        department: user.department,
        approvalStatus: user.approvalStatus,
        otpExpiresIn: getOTPExpiryFormatted(),
        otpExpiresAt: otpExpiry.toISOString(),
        timeRemainingSeconds: OTP_CONFIG.EXPIRY_MS / 1000,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Verify Department User OTP
 * POST /api/v1/department-auth/verify-otp
 */
export const verifyDepartmentOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Please provide email and OTP',
      }, 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw AppError.notFound('User');
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw AppError.forbidden('Invalid verification endpoint. Please use the correct verification page.');
    }

    // Check if already verified
    if (user.isVerified) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Email is already verified',
      }, 400);
    }

    // Check if OTP exists
    if (!user.verificationOTP) {
      throw new AppError({
        code: ErrorCode.OTP_INVALID,
        message: 'No OTP found. Please request a new one.',
      }, 400);
    }

    // Check if OTP is expired
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      throw new AppError({
        code: ErrorCode.OTP_EXPIRED,
        message: 'OTP has expired. Please request a new one.',
        userMessage: 'Your verification code has expired. Please request a new one.',
      }, 400);
    }

    // Verify OTP
    if (user.verificationOTP !== otp) {
      throw new AppError({
        code: ErrorCode.OTP_INVALID,
        message: 'Invalid OTP',
        userMessage: 'The verification code you entered is incorrect.',
      }, 400);
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Your account is pending admin approval.',
      data: {
        email: user.email,
        isVerified: true,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Resend Department User OTP
 * POST /api/v1/department-auth/resend-otp
 */
export const resendDepartmentOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Please provide email',
      }, 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw AppError.notFound('User');
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw AppError.forbidden('Invalid endpoint. Please use the correct page.');
    }

    // Check if already verified
    if (user.isVerified) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Email is already verified',
      }, 400);
    }

    // Generate new OTP with extended expiry (5 minutes)
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    user.verificationOTP = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    await sendOTPEmail(email, user.name, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        email: user.email,
        otpExpiresIn: getOTPExpiryFormatted(),
        otpExpiresAt: otpExpiry.toISOString(),
        timeRemainingSeconds: OTP_CONFIG.EXPIRY_MS / 1000,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Login Department User
 * POST /api/v1/department-auth/login
 * 
 * Supports "Remember Me" functionality:
 * - rememberMe: true -> 30 day session
 * - rememberMe: false (default) -> 1 day session
 */
export const loginDepartmentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Please provide email and password',
      }, 400);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      }, 401);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      console.log('Login failed: Role mismatch', { userRole: user.role, expected: UserRole.DEPARTMENT_USER });
      throw AppError.forbidden(`Invalid login endpoint. Role mismatch.`);
    }

    // Check if email is verified
    if (!user.isVerified) {
      throw new AppError({
        code: ErrorCode.ACCOUNT_NOT_VERIFIED,
        message: 'Please verify your email before logging in.',
        userMessage: 'Please verify your email first. Check your inbox for the verification code.',
      }, 403);
    }

    // Check approval status
    if (user.approvalStatus === 'PENDING') {
      throw new AppError({
        code: ErrorCode.ACCOUNT_NOT_APPROVED,
        message: 'Your account is pending admin approval.',
        userMessage: 'Your account is awaiting approval. Please wait for admin confirmation.',
      }, 403);
    }

    if (user.approvalStatus === 'REJECTED') {
      const reason = user.rejectionReason || 'No reason provided';
      throw new AppError({
        code: ErrorCode.ACCOUNT_REJECTED,
        message: `Your registration was rejected. Reason: ${reason}`,
        userMessage: `Your registration was not approved. Reason: ${reason}`,
      }, 403);
    }

    // Compare passwords using utility function
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      }, 401);
    }

    // Clean expired sessions
    cleanExpiredSessions(user);

    // Generate tokens with Remember Me option
    const { accessToken, refreshToken } = generateTokens(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      { rememberMe }
    );

    // Create and add session with device info
    const session = createSession(refreshToken, rememberMe, {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
    });
    
    addSessionToUser(user, session);
    await user.save();

    // Get token expiry for frontend
    const accessTokenExpiry = getTokenExpiry(accessToken);
    const refreshTokenExpiry = getTokenExpiry(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isHead: user.isHead,
        },
        accessToken,
        refreshToken,
        sessionId: session.sessionId,
        expiresAt: {
          accessToken: accessTokenExpiry?.toISOString(),
          refreshToken: refreshTokenExpiry?.toISOString(),
        },
        rememberMe,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Refresh Department User Token
 * POST /api/v1/department-auth/refresh
 */
export const refreshDepartmentToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Please provide refresh token',
      }, 400);
    }

    // Verify refresh token signature and expiry
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error: any) {
      console.error('Token verification failed:', error.message);
      throw new AppError({
        code: ErrorCode.TOKEN_EXPIRED,
        message: 'Invalid or expired refresh token',
        userMessage: 'Your session has expired. Please log in again.',
      }, 401);
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error('User not found for userId:', decoded.userId);
      throw new AppError({
        code: ErrorCode.USER_NOT_FOUND,
        message: 'User not found',
      }, 401);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw AppError.forbidden('Invalid refresh endpoint. Please use the correct endpoint.');
    }

    // Find session by refresh token
    const session = findSessionByToken(user, refreshToken);
    
    if (!session) {
      // Fallback to legacy token check
      if (user.refreshToken !== refreshToken) {
        console.error('Token mismatch - no matching session found');
        throw new AppError({
          code: ErrorCode.TOKEN_INVALID,
          message: 'Invalid refresh token. Please login again.',
          userMessage: 'Your session is no longer valid. Please log in again.',
        }, 401);
      }
    }

    // Determine if this was a "remember me" session
    const rememberMe = session?.rememberMe ?? false;

    // Generate new tokens with same remember me setting
    const tokens = generateTokens(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      { 
        rememberMe,
        sessionId: session?.sessionId 
      }
    );

    // Update session or legacy token using atomic operation to handle race conditions
    try {
      if (session) {
        // Atomic update for session-based refresh
        const updateResult = await User.findOneAndUpdate(
          { 
            _id: user._id,
            'sessions.sessionId': session.sessionId,
          },
          {
            $set: {
              'sessions.$.refreshToken': tokens.refreshToken,
              'sessions.$.lastActive': new Date(),
            },
          },
          { new: true }
        );

        if (!updateResult) {
          throw new AppError({
            code: ErrorCode.TOKEN_INVALID,
            message: 'Session no longer valid. Please login again.',
            userMessage: 'Your session has changed. Please log in again.',
          }, 401);
        }
      } else {
        // Atomic update for legacy token refresh
        const updateResult = await User.findOneAndUpdate(
          { 
            _id: user._id,
            refreshToken: refreshToken, // Ensure token hasn't changed
          },
          {
            $set: { refreshToken: tokens.refreshToken },
          },
          { new: true }
        );

        if (!updateResult) {
          throw new AppError({
            code: ErrorCode.TOKEN_INVALID,
            message: 'Token already refreshed. Please use the new token.',
            userMessage: 'Your session was already refreshed. Please try again.',
          }, 401);
        }
      }
    } catch (error: any) {
      // Handle race condition - token was already refreshed by another request
      if (error.name === 'VersionError' || error.code === ErrorCode.TOKEN_INVALID) {
        throw new AppError({
          code: ErrorCode.TOKEN_INVALID,
          message: 'Token refresh conflict. Please retry.',
          userMessage: 'Please try again.',
        }, 409);
      }
      throw error;
    }

    // Get token expiry for frontend
    const accessTokenExpiry = getTokenExpiry(tokens.accessToken);
    const refreshTokenExpiry = getTokenExpiry(tokens.refreshToken);

    console.log('Token refreshed successfully for department user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId: session?.sessionId,
        expiresAt: {
          accessToken: accessTokenExpiry?.toISOString(),
          refreshToken: refreshTokenExpiry?.toISOString(),
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Registration Status
 * GET /api/v1/department-auth/status
 */
export const getRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email) {
      throw new AppError('Please provide email', 400);
    }

    const user = await User.findOne({ email: email.toString().toLowerCase() });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw new AppError('Not a department user', 400);
    }

    let message = '';
    switch (user.approvalStatus) {
      case 'PENDING':
        message = 'Your registration is pending admin approval';
        break;
      case 'APPROVED':
        message = 'Your registration has been approved. You can now login.';
        break;
      case 'REJECTED':
        message = `Your registration was rejected. Reason: ${user.rejectionReason || 'No reason provided'}`;
        break;
    }

    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        name: user.name,
        department: user.department,
        approvalStatus: user.approvalStatus,
        isVerified: user.isVerified,
        message,
      },
    });
  } catch (error: any) {
    throw error;
  }
};
/**
 * Logout Department User
 * POST /api/v1/department-auth/logout
 * 
 * Supports:
 * - Logout from current session (default)
 * - Logout from specific session by sessionId
 * - Logout from all devices (allDevices: true)
 */
export const logoutDepartmentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { sessionId, allDevices = false } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw AppError.forbidden('Invalid logout endpoint. Please use the correct endpoint.');
    }

    let sessionsRemoved = 0;

    if (allDevices) {
      // Logout from all devices
      sessionsRemoved = removeAllSessions(user);
    } else if (sessionId) {
      // Logout from specific session
      const removed = removeSession(user, sessionId);
      sessionsRemoved = removed ? 1 : 0;
    } else {
      // Logout current session (clear legacy token)
      user.refreshToken = null;
      sessionsRemoved = 1;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: allDevices 
        ? `Logged out from all devices (${sessionsRemoved} session${sessionsRemoved !== 1 ? 's' : ''})` 
        : 'Logged out successfully',
      data: {
        sessionsRemoved,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Active Sessions
 * GET /api/v1/department-auth/sessions
 */
export const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const currentSessionId = req.body.sessionId; // Optional - to mark current session

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw AppError.forbidden('Invalid endpoint.');
    }

    // Clean expired sessions first
    cleanExpiredSessions(user);
    await user.save();

    // Get active sessions
    const sessions = getUserActiveSessions(user);

    // Mark current session if sessionId provided
    if (currentSessionId) {
      sessions.forEach((session: any) => {
        session.isCurrent = session.sessionId === currentSessionId;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessions,
        count: sessions.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Revoke a specific session
 * DELETE /api/v1/department-auth/sessions/:sessionId
 */
export const revokeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw AppError.forbidden('Invalid endpoint.');
    }

    // Remove session
    const removed = removeSession(user, sessionId as string);
    
    if (!removed) {
      throw AppError.notFound('Session');
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Forgot Password - Department User
 * POST /api/v1/department-auth/forgot-password
 */
export const forgotPasswordDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Please provide email', 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
      return;
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
      return;
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email',
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Reset Password - Department User
 * POST /api/v1/department-auth/reset-password
 */
export const resetPasswordDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Please provide token and new password', 400);
    }

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
      role: UserRole.DEPARTMENT_USER,
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Change Password - Department User
 * PATCH /api/v1/department-auth/change-password
 */
export const changePasswordDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Please provide current password and new password', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw new AppError('Invalid endpoint. Please use the correct endpoint.', 403);
    }

    // Verify current password using utility function
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    throw error;
  }
};
