import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/security';
import AppError from '../utils/AppError';
import { UserRole } from '../constants';
import User from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
        department?: string;
        isHead?: boolean;
        _id?: any;
        name?: string;
        approvalStatus?: string;
      };
    }
  }
}

/**
 * Standard Authentication - Fast verification from JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new AppError('Authorization required', 401);

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole,
    };

    next();
  } catch (error: any) {
    next(new AppError('Session invalid or expired', 401));
  }
};

/**
 * Validates user exists and is active - used for sensitive operations
 */
const validateFullUser = async (req: Request) => {
  if (!req.user) throw new AppError('Authentication required', 401);
  
  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError('User account not found', 404);

  // Security check: Block rejected or unapproved accounts
  if (user.role !== UserRole.ADMIN) {
    if (user.approvalStatus === 'REJECTED') throw new AppError('Access denied. Account rejected.', 403);
    if (!user.isApproved) throw new AppError('Account pending activation.', 403);
  }

  return user;
};

export const requireDepartmentHead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateFullUser(req);
    if (user.role !== UserRole.DEPARTMENT_USER || !user.isHead) {
      throw AppError.forbidden('Department head privileges required');
    }

    req.user = { ...req.user!, ...user.toObject(), userId: user._id.toString() };
    (req as any).fullUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireDepartmentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateFullUser(req);
    if (user.role !== UserRole.DEPARTMENT_USER) {
      throw AppError.forbidden('Department staff access required');
    }

    req.user = { ...req.user!, ...user.toObject(), userId: user._id.toString() };
    (req as any).fullUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateFullUser(req);
    if (user.role !== UserRole.EMPLOYEE) {
      throw AppError.forbidden('Employee access required');
    }

    req.user = { ...req.user!, ...user.toObject(), userId: user._id.toString() };
    (req as any).fullUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await validateFullUser(req);
    if (user.role !== UserRole.ADMIN) {
      throw AppError.forbidden('Admin access required');
    }

    req.user = { ...req.user!, ...user.toObject(), userId: user._id.toString() };
    (req as any).fullUser = user;
    next();
  } catch (error) {
    next(error);
  }
};
