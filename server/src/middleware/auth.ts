import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import AppError from '../utils/AppError';
import { UserRole } from '../constants';

/**
 * Extend Express Request interface to include user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
        department?: string;
        isHead?: boolean;
      };
    }
  }
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user data to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please login.', 401);
    }

    // 2. Extract token (format: "Bearer <token>")
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Invalid token format', 401);
    }

    // 3. Verify token
    const decoded = verifyAccessToken(token);

    // 4. Attach user data to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole,
    };

    // 5. Continue to next middleware/controller
    next();
  } catch (error: any) {
    // Handle JWT-specific errors
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired. Please login again.', 401));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware to check if user is a department head
 */
export const requireDepartmentHead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Find user to check isHead status
    const User = require('../models/User').default;
    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if user is department user
    if (user.role !== 'DEPARTMENT_USER') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Department user role required.',
      });
      return;
    }

    // Check if user is head
    if (!user.isHead) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Department head privileges required.',
      });
      return;
    }

    // Add department to request for easy access
    req.user.department = user.department;
    req.user.isHead = user.isHead;

    next();
  } catch (error: any) {
    console.error('Authorization error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message,
    });
  }
};

/**
 * Middleware to check if user is a department user (staff or head)
 */
export const requireDepartmentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Find user to check department user status
    const User = require('../models/User').default;
    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if user is department user
    if (user.role !== 'DEPARTMENT_USER') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Department user role required.',
      });
      return;
    }

    // Check if account is approved
    if (!user.isApproved) {
      res.status(403).json({
        success: false,
        message: 'Your account is pending approval.',
      });
      return;
    }

    // Add department and isHead to request for easy access
    req.user.department = user.department;
    req.user.isHead = user.isHead;

    // Store full user object for controllers to use
    (req as any).user = user;

    next();
  } catch (error: any) {
    console.error('Authorization error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message,
    });
  }
};

/**
 * Middleware to check if user is an internal employee
 */
export const requireEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const User = require('../models/User').default;
    const user = await User.findById(req.user.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role !== 'EMPLOYEE') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Employee role required.',
      });
      return;
    }

    if (!user.isApproved) {
      res.status(403).json({
        success: false,
        message: 'Your account is pending approval.',
      });
      return;
    }

    (req as any).user = user;
    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
    });
  }
};

