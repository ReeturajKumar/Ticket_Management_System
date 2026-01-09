import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import AppError from '../utils/AppError';

/**
 * Get authenticated user's profile
 * GET /api/v1/profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.user is populated by authenticate middleware
    const userId = req.user!.userId;

    // Find user and exclude sensitive fields
    const user = await User.findById(userId).select('-password -refreshToken -verificationOTP -otpExpiry');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Update authenticated user's profile
 * PUT /api/v1/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body;

    // Validate name is provided
    if (!name) {
      throw new AppError('Please provide name to update', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update name only (email cannot be changed for security reasons)
    user.name = name;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Change authenticated user's password
 * PATCH /api/v1/profile/password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      throw new AppError('Please provide both current password and new password', 400);
    }

    // Validate new password length
    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters long', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash and save new password
    user.password = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    throw error;
  }
};
