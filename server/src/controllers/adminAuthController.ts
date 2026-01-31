import { Request, Response } from 'express';
import User from '../models/User';
import { UserRole } from '../constants';
import AppError from '../utils/AppError';
import { AuthService } from '../services/authService';
import { AuthValidation } from '../middleware/authValidation';
import { AuthResponse } from '../utils/authResponse';

/**
 * Login Admin User
 * POST /api/v1/admin-auth/login
 * 
 * Supports "Remember Me" functionality:
 * - rememberMe: true -> 30 day session
 * - rememberMe: false (default) -> 1 day session
 */
export const loginAdminUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const { email, password, rememberMe } = AuthValidation.validateLoginRequest(req);

    // Find user by email
    const user = await User.findOne({ email });
    AuthValidation.validateUserExists(user);

    // Validate admin status
    AuthValidation.validateAdminStatus(user);

    // Perform login
    const tokens = await AuthService.performLogin(user, password, rememberMe, req);

    // Send response
    res.status(200).json(AuthResponse.loginSuccess(user, tokens, rememberMe));
  } catch (error: any) {
    throw error;
  }
};

/**
 * Refresh Admin Token
 * POST /api/v1/admin-auth/refresh
 */
export const refreshAdminToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const refreshToken = AuthValidation.validateRefreshRequest(req);

    // Perform token refresh
    const tokens = await AuthService.performRefresh(refreshToken, UserRole.ADMIN);

    // Send response
    res.status(200).json(AuthResponse.refreshSuccess(tokens));
  } catch (error: any) {
    throw error;
  }
};

/**
 * Logout Admin User
 * POST /api/v1/admin-auth/logout
 */
export const logoutAdminUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken, sessionId, allDevices = false } = req.body;
    const userId = req.user!.userId;

    // Perform logout
    const { sessionsRemoved } = await AuthService.performLogout(userId, UserRole.ADMIN, {
      sessionId,
      allDevices,
      refreshToken,
    });

    // Send response
    res.status(200).json(AuthResponse.logoutSuccess(sessionsRemoved, allDevices));
  } catch (error: any) {
    throw error;
  }
};
