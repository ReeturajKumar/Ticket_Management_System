import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword } from '../utils/password';
import { generateResetToken, hashResetToken } from '../utils/token';
import { sendPasswordResetEmail } from '../utils/email';
import AppError from '../utils/AppError';

/**
 * Forgot Password - Send reset link to email
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      throw new AppError('Please provide your email address', 400);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success message (security: don't reveal if email exists)
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
      return;
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new AppError('Please verify your email first before resetting password', 403);
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = hashResetToken(resetToken);

    // Save hashed token and expiry to database
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email with reset link (plain token in URL)
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset link has been sent to your email',
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Reset Password - Reset password using token from email
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    // Validate required fields
    if (!token || !newPassword) {
      throw new AppError('Please provide reset token and new password', 400);
    }

    // Validate password length
    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    // Hash the token from URL to compare with database
    const hashedToken = hashResetToken(token);

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Update password and clear reset token
    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error: any) {
    throw error;
  }
};
