import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword } from '../utils/password';
import { UserRole } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthService } from '../services/authService';
import { AuthValidation } from '../middleware/authValidation';
import { AuthResponse } from '../utils/authResponse';

/**
 * Controller for Internal Employee Authentication
 * Handles access/refresh token logic, sessions, and multi-device support
 */
export const employeeAuthController = {
  /**
   * Register Internal Employee
   * POST /api/v1/employee-auth/register
   */
  register: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate required fields
    const { name, email, password } = AuthValidation.validateRegistrationRequest(req, [
      'name',
      'email',
      'password',
    ]);

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError(
        {
          code: ErrorCode.EMAIL_ALREADY_EXISTS,
          message: 'User with this email already exists',
        },
        409
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      isVerified: true, // Auto-verify employees
      approvalStatus: 'PENDING', // Requires admin approval
      isApproved: false,
    });

    res.status(201).json(
      AuthResponse.registrationSuccess(user, {
        message: 'Employee registration successful. Please wait for admin approval.',
      })
    );
  }),

  /**
   * Login Internal Employee
   * POST /api/v1/employee-auth/login
   */
  login: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request
    const { email, password, rememberMe } = AuthValidation.validateLoginRequest(req);

    // Find user by email
    const user = await User.findOne({ email });
    AuthValidation.validateUserExists(user);

    // Validate employee status
    AuthValidation.validateEmployeeStatus(user);

    // Perform login
    const tokens = await AuthService.performLogin(user, password, rememberMe, req);

    // Send response
    res.status(200).json(AuthResponse.loginSuccess(user, tokens, rememberMe));
  }),

  /**
   * Refresh Employee Token
   * POST /api/v1/employee-auth/refresh
   */
  refresh: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validate request
    const refreshToken = AuthValidation.validateRefreshRequest(req);

    // Perform token refresh
    const tokens = await AuthService.performRefresh(refreshToken, UserRole.EMPLOYEE);

    // Send response
    res.status(200).json(AuthResponse.refreshSuccess(tokens));
  }),

  /**
   * Logout Employee
   * POST /api/v1/employee-auth/logout
   */
  logout: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { sessionId, allDevices = false } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      throw new AppError('Not authenticated', 401);
    }

    // Perform logout
    const { sessionsRemoved } = await AuthService.performLogout(userId, UserRole.EMPLOYEE, {
      sessionId,
      allDevices,
    });

    // Send response
    res.status(200).json(AuthResponse.logoutSuccess(sessionsRemoved, allDevices));
  }),
};
