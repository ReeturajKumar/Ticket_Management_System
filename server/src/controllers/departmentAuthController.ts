import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword } from '../utils/security';
import { UserRole, Department } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import { AuthValidation } from '../middleware/authValidation';
import { AuthService } from '../services/authService';
import { ResponseUtils } from '../utils/responses';
import { asyncHandler } from '../utils/asyncHandler';
import { notifyAdmins, NotificationType, emitUserCreated } from '../utils/socket';

/**
 * Register Department User
 */
export const registerDepartmentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, department, isHead } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError({
      code: ErrorCode.EMAIL_ALREADY_EXISTS,
      message: 'User with this email already exists',
    }, 409);
  }

  const user = await User.create({
    name,
    email,
    password: await hashPassword(password),
    role: UserRole.DEPARTMENT_USER,
    department,
    isHead: isHead || false,
    approvalStatus: 'PENDING',
    isApproved: false,
  });

  // Emit real-time update for dashboard stats
  emitUserCreated(user);

  // Notify admins about new user registration
  notifyAdmins({
    type: NotificationType.INFO,
    title: 'New User Registration',
    message: `${name} (${isHead ? 'Head' : 'Staff'}) registered for ${department} department`,
    data: { 
      userId: user._id.toString(),
      department: department,
      isHead: isHead || false,
      userRole: 'DEPARTMENT_USER'
    }
  });

  res.status(201).json({
    success: true,
    message: 'Registration request submitted. Please wait for admin approval.',
    data: { id: user._id, name: user.name, email: user.email }
  });
});

/**
 * Login Department User
 */
export const loginDepartmentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  AuthValidation.validateUserExists(user);
  AuthValidation.validateDepartmentUserStatus(user);

  const tokenData = await AuthService.performLogin(user, password, false, req);

  res.status(200).json(ResponseUtils.authSuccess(user, tokenData));
});

/**
 * Get Registration Status
 */
export const getRegistrationStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.query;
  if (!email) throw new AppError('Please provide email', 400);

  const user = await User.findOne({ email: email.toString().toLowerCase() });
  if (!user) throw AppError.notFound('User');
  if (user.role !== UserRole.DEPARTMENT_USER) throw new AppError('Not a department user', 400);

  res.status(200).json(ResponseUtils.registrationStatus(user));
});
