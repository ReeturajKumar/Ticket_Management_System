import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { generateOTP, sendOTPEmail, sendWelcomeEmail } from '../utils/email';
import { UserRole } from '../constants';

/**
 * Register a new user (Step 1: Send OTP)
 * POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
      return;
    }

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Hash password
    const hashedPassword = await hashPassword(password);

    if (existingUser && !existingUser.isVerified) {
      // User exists but not verified - update OTP
      existingUser.name = name;
      existingUser.password = hashedPassword;
      existingUser.verificationOTP = otp;
      existingUser.otpExpiry = otpExpiry;
      await existingUser.save();
    } else {
      // Create new unverified user
      await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: UserRole.STUDENT,
        department: undefined,
        isVerified: false,
        verificationOTP: otp,
        otpExpiry,
      });
    }

    // Send OTP email
    await sendOTPEmail(email, name, otp);

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email. Please check your inbox.',
      data: {
        email: email.toLowerCase(),
        otpExpiresIn: '2 minutes',
      },
    });
  } catch (error: any) {
    console.error('Registration error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command
    });
    
    // Check if it's an email error specifically
    if (error.message.includes('verification email') || error.code === 'EAUTH' || error.code === 'ETIMEDOUT') {
       res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please contact support or try again later.',
        // Don't expose internal error details in production response unless needing to debug client-side
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if email is verified
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the OTP.',
      });
      return;
    }

    // Compare passwords
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
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
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token signature and expiry
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error: any) {
      console.error('Token verification failed:', error.message);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        error: error.message,
      });
      return;
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error('User not found for userId:', decoded.userId);
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify refresh token matches the one in database
    if (user.refreshToken !== refreshToken) {
      console.error('Token mismatch!');
      console.error('Sent token length:', refreshToken.length);
      console.error('DB token length:', user.refreshToken?.length);
      console.error('Sent token (last 50 chars):', refreshToken.substring(refreshToken.length - 50));
      console.error('DB token (last 50 chars):', user.refreshToken?.substring(user.refreshToken.length - 50));
      console.error('Tokens are equal?', user.refreshToken === refreshToken);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token. This token has been replaced. Please login again.',
        hint: 'You may have logged in from another device or session. Use the latest refresh token from your most recent login.',
      });
      return;
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

    console.log('Token refreshed successfully for user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: error.message,
    });
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token is valid (not expired/tampered)
    try {
      verifyRefreshToken(refreshToken);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    // Find user with this refresh token
    const user = await User.findOne({ refreshToken });
    
    if (!user) {
      // Token is valid but not found in database
      // This means user already logged out or token was rotated
      res.status(401).json({
        success: false,
        message: 'Refresh token not found. You may already be logged out.',
      });
      return;
    }

    // Clear refresh token from database
    user.refreshToken = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message,
    });
  }
};
