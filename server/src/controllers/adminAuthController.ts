import { Request, Response } from 'express';
import User from '../models/User';
import { comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken, getTokenExpiry } from '../utils/jwt';
import { UserRole } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import {
  createSession,
  addSessionToUser,
  findSessionByToken,
  updateSession,
  removeSession,
  removeAllSessions,
  getActiveSessions as getUserActiveSessions,
  cleanExpiredSessions,
} from '../utils/session';

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
    const { email, password, rememberMe = false } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Please provide email and password',
      }, 400);
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      }, 401);
    }

    // Check if user is admin
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw AppError.forbidden('Invalid login endpoint. Admin access required.');
    }

    // Check if email is verified
    if (!user.isVerified) {
      throw new AppError({
        code: ErrorCode.ACCOUNT_NOT_VERIFIED,
        message: 'Please verify your email before logging in.',
        userMessage: 'Please verify your email first. Check your inbox for the verification code.',
      }, 403);
    }

    // Compare passwords
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      }, 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Create session
    const session = createSession(
      refreshToken,
      rememberMe,
      {
        userAgent: req.get('user-agent'),
        ip: req.ip || req.socket.remoteAddress,
      }
    );

    // Add session to user
    addSessionToUser(user, session);

    // Save user with updated sessions
    await user.save();

    // Clean expired sessions
    cleanExpiredSessions(user);

    // Get token expiry for response
    const accessTokenExpiry = getTokenExpiry(accessToken);
    const refreshTokenExpiry = getTokenExpiry(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
        refreshToken,
        expiresIn: accessTokenExpiry ? Math.floor((accessTokenExpiry.getTime() - Date.now()) / 1000) : 900,
        expiresAt: accessTokenExpiry?.toISOString() || new Date(Date.now() + 900 * 1000).toISOString(),
        sessionId: session.sessionId,
      },
    });
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Refresh token is required',
      }, 400);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError({
        code: ErrorCode.TOKEN_INVALID,
        message: 'Invalid or expired refresh token',
      }, 401);
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    // Check if user is admin
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw AppError.forbidden('Invalid token. Admin access required.');
    }

    // Find session by refresh token
    const session = findSessionByToken(user, refreshToken);
    if (!session) {
      throw new AppError({
        code: ErrorCode.TOKEN_INVALID,
        message: 'Session not found',
      }, 401);
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      removeSession(user, session.sessionId);
      await user.save();
      throw new AppError({
        code: ErrorCode.TOKEN_EXPIRED,
        message: 'Session expired',
      }, 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Update session with new refresh token
    updateSession(user, session.sessionId, newRefreshToken);

    await user.save();

    // Get token expiry for response
    const accessTokenExpiry = getTokenExpiry(accessToken);
    const refreshTokenExpiry = getTokenExpiry(newRefreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: accessTokenExpiry ? Math.floor((accessTokenExpiry.getTime() - Date.now()) / 1000) : 900,
        expiresAt: accessTokenExpiry?.toISOString() || new Date(Date.now() + 900 * 1000).toISOString(),
      },
    });
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
    const user = req.user!;

    // Find user in database
    const dbUser = await User.findById(user.userId);
    if (!dbUser) {
      throw AppError.notFound('User');
    }

    if (allDevices) {
      // Logout from all devices
      removeAllSessions(dbUser);
      await dbUser.save();
    } else if (sessionId) {
      // Logout from specific session
      const session = dbUser.sessions.find((s) => s.sessionId === sessionId);
      if (session) {
        removeSession(dbUser, sessionId);
        await dbUser.save();
      }
    } else if (refreshToken) {
      // Logout from current session (by refresh token)
      const session = findSessionByToken(dbUser, refreshToken);
      if (session) {
        removeSession(dbUser, session.sessionId);
        await dbUser.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error: any) {
    throw error;
  }
};
