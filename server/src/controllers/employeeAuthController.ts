import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword } from '../utils/security';
import { UserRole } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthService } from '../services/authService';
import { AuthValidation } from '../middleware/authValidation';
import { ResponseUtils } from '../utils/responses';
import { notifyAdmins, NotificationType, emitUserCreated } from '../utils/socket';


export const employeeAuthController = {

  register: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;

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
      role: UserRole.EMPLOYEE,
      approvalStatus: 'PENDING',
      isApproved: false,
    });

    // Emit real-time update for dashboard stats
    emitUserCreated(user);

    // Notify admins about new employee registration
    notifyAdmins({
      type: NotificationType.INFO,
      title: 'New Employee Registration',
      message: `${name} registered as an employee`,
      data: { 
        userId: user._id.toString(),
        userRole: 'EMPLOYEE'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Employee registration successful. Please wait for admin approval.',
      data: { id: user._id, name: user.name, email: user.email }
    });
  }),


  login: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    AuthValidation.validateUserExists(user);
    AuthValidation.validateEmployeeStatus(user);

    const tokenData = await AuthService.performLogin(user, password, false, req);

    res.status(200).json(ResponseUtils.authSuccess(user, tokenData));
  }),
};
