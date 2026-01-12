import { Request, Response } from 'express';
import User from '../models/User';
import { UserRole } from '../constants';
import AppError from '../utils/AppError';

/**
 * Get Pending Department User Requests
 * GET /api/v1/admin/pending-users
 */
export const getPendingUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find all department users with PENDING status
    const pendingUsers = await User.find({
      role: UserRole.DEPARTMENT_USER,
      approvalStatus: 'PENDING',
      isVerified: true, // Only show verified users
    }).select('name email department isHead createdAt');

    res.status(200).json({
      success: true,
      data: {
        pendingUsers: pendingUsers.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          isHead: user.isHead,
          requestedAt: user.createdAt,
        })),
        count: pendingUsers.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Approve Department User
 * POST /api/v1/admin/approve-user/:userId
 */
export const approveUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw new AppError('User is not a department user', 400);
    }

    // Check if already approved
    if (user.approvalStatus === 'APPROVED') {
      throw new AppError('User is already approved', 400);
    }

    // Approve user
    user.approvalStatus = 'APPROVED';
    user.isApproved = true;
    user.approvedBy = adminId as any;
    user.approvedAt = new Date();
    user.rejectionReason = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          approvalStatus: user.approvalStatus,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Reject Department User
 * POST /api/v1/admin/reject-user/:userId
 */
export const rejectUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user!.userId;

    if (!reason) {
      throw new AppError('Please provide a rejection reason', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is department user
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw new AppError('User is not a department user', 400);
    }

    // Check if already rejected
    if (user.approvalStatus === 'REJECTED') {
      throw new AppError('User is already rejected', 400);
    }

    // Reject user
    user.approvalStatus = 'REJECTED';
    user.isApproved = false;
    user.approvedBy = adminId as any;
    user.approvedAt = new Date();
    user.rejectionReason = reason;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rejectionReason: user.rejectionReason,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};
