import { Request, Response } from 'express';
import User from '../models/User';
import { generateTokens } from '../utils/jwt';
import { generateOTP, sendOTPEmail, sendWelcomeEmail } from '../utils/email';

/**
 * Verify OTP (Step 2: Complete Registration)
 * POST /api/v1/auth/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Validate required fields
    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if already verified
    if (user.isVerified) {
      res.status(400).json({
        success: false,
        message: 'Email already verified. Please login.',
      });
      return;
    }

    // Check if OTP exists
    if (!user.verificationOTP) {
      res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.',
      });
      return;
    }

    // Check if OTP expired
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
      return;
    }

    // Verify OTP
    if (user.verificationOTP !== otp) {
      res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
      });
      return;
    }

    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.otpExpiry = undefined;

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(user.email, user.name).catch((err: any) =>
      console.error('Welcome email error:', err)
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You are now registered.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP',
      error: error.message,
    });
  }
};

/**
 * Resend OTP
 * POST /api/v1/auth/resend-otp
 */
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Validate required fields
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
      return;
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if already verified
    if (user.isVerified) {
      res.status(400).json({
        success: false,
        message: 'Email already verified. Please login.',
      });
      return;
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Update user with new OTP
    user.verificationOTP = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, user.name, otp);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
      data: {
        email: user.email,
        otpExpiresIn: '2 minutes',
      },
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resending OTP',
      error: error.message,
    });
  }
};
