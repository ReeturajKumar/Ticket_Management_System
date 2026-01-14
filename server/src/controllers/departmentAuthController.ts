import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { sendOTPEmail, sendPasswordResetEmail } from '../utils/email';
import { UserRole } from '../constants';
import AppError from '../utils/AppError';

/**
 * Register Department User
 * POST /api/v1/department-auth/register
 */
export const registerDepartmentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, department, isHead } = req.body;

    // Validate required fields
    if (!name || !email || !password || !department) {
      throw new AppError('Please provide name, email, password, and department', 400);
    }

    // Validate department
    const validDepartments = ['PLACEMENT', 'OPERATIONS', 'TRAINING', 'FINANCE'];
    if (!validDepartments.includes(department)) {
      throw new AppError('Invalid department', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

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
        otpExpiresIn: '2 minutes',
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
      throw new AppError('Please provide email and OTP', 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw new AppError('Invalid verification endpoint. Please use the correct verification page.', 403);
    }

    // Check if already verified
    if (user.isVerified) {
      throw new AppError('Email is already verified', 400);
    }

    // Check if OTP exists
    if (!user.verificationOTP) {
      throw new AppError('No OTP found. Please request a new one.', 400);
    }

    // Check if OTP is expired
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    // Verify OTP
    if (user.verificationOTP !== otp) {
      throw new AppError('Invalid OTP', 400);
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
      throw new AppError('Please provide email', 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw new AppError('Invalid endpoint. Please use the correct page.', 403);
    }

    // Check if already verified
    if (user.isVerified) {
      throw new AppError('Email is already verified', 400);
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

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
        otpExpiresIn: '2 minutes',
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Login Department User
 * POST /api/v1/department-auth/login
 */
export const loginDepartmentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      console.log('Login failed: Role mismatch', { userRole: user.role, expected: UserRole.DEPARTMENT_USER });
      throw new AppError(`Invalid login endpoint. Role mistmatch. Got: '${user.role}', Expected: '${UserRole.DEPARTMENT_USER}'`, 403);
    }

    // Check if email is verified
    if (!user.isVerified) {
      throw new AppError('Please verify your email before logging in. Check your inbox for the OTP.', 403);
    }

    // Check approval status
    if (user.approvalStatus === 'PENDING') {
      throw new AppError('Your account is pending admin approval. Please wait for approval.', 403);
    }

    if (user.approvalStatus === 'REJECTED') {
      const reason = user.rejectionReason || 'No reason provided';
      throw new AppError(`Your registration was rejected. Reason: ${reason}`, 403);
    }

    // Compare passwords
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

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
      throw new AppError('Please provide refresh token', 400);
    }

    // Verify refresh token signature and expiry
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error: any) {
      console.error('Token verification failed:', error.message);
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error('User not found for userId:', decoded.userId);
      throw new AppError('User not found', 401);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw new AppError('Invalid refresh endpoint. Please use the correct endpoint.', 403);
    }

    // Verify refresh token matches the one in database
    if (user.refreshToken !== refreshToken) {
      console.error('Token mismatch!');
      console.error('Sent token length:', refreshToken.length);
      console.error('DB token length:', user.refreshToken?.length);
      console.error('Sent token (last 50 chars):', refreshToken.substring(refreshToken.length - 50));
      console.error('DB token (last 50 chars):', user.refreshToken?.substring(user.refreshToken.length - 50));
      throw new AppError('Invalid refresh token. This token has been replaced. Please login again.', 401);
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    await user.save();

    console.log('Token refreshed successfully for department user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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
 */
export const logoutDepartmentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw new AppError('Invalid logout endpoint. Please use the correct endpoint.', 403);
    }

    // Clear refresh token
    user.refreshToken = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
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

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
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
