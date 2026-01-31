import { Request } from 'express';
import User, { IUser } from '../models/User';
import { comparePassword } from '../utils/password';
import { generateTokens, verifyRefreshToken, getTokenExpiry } from '../utils/jwt';
import AppError, { ErrorCode } from '../utils/AppError';
import {
  createSession,
  addSessionToUser,
  findSessionByToken,
  updateSession,
  removeSession,
  removeAllSessions,
  cleanExpiredSessions,
} from '../utils/session';
import { UserRole } from '../constants';

/**
 * Centralized Authentication Service
 * Handles shared authentication logic across all user roles
 */
export class AuthService {
  /**
   * Perform login for any user role
   * Returns tokens and session information
   */
  static async performLogin(
    user: IUser,
    password: string,
    rememberMe: boolean,
    req: Request
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    session: any;
    accessTokenExpiry: Date | null;
    refreshTokenExpiry: Date | null;
  }> {
    // Validate password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError(
        {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        },
        401
      );
    }

    // Clean expired sessions before creating new one
    cleanExpiredSessions(user);

    // Generate tokens with Remember Me option
    const { accessToken, refreshToken } = generateTokens(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      { rememberMe }
    );

    // Create and add session with device info
    const session = createSession(refreshToken, rememberMe, {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
    });

    addSessionToUser(user, session);
    await user.save();

    // Get token expiry for frontend
    const accessTokenExpiry = getTokenExpiry(accessToken);
    const refreshTokenExpiry = getTokenExpiry(refreshToken);

    return {
      accessToken,
      refreshToken,
      session,
      accessTokenExpiry,
      refreshTokenExpiry,
    };
  }

  /**
   * Refresh access token using refresh token
   * Supports both session-based and legacy token refresh
   */
  static async performRefresh(
    refreshToken: string,
    expectedRole: UserRole
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId?: string;
    accessTokenExpiry: Date | null;
    refreshTokenExpiry: Date | null;
  }> {
    // Verify refresh token signature and expiry
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error: any) {
      throw new AppError(
        {
          code: ErrorCode.TOKEN_EXPIRED,
          message: 'Invalid or expired refresh token',
          userMessage: 'Your session has expired. Please log in again.',
        },
        401
      );
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError(
        {
          code: ErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
        401
      );
    }

    // Verify user role matches expected role
    if (user.role !== expectedRole) {
      throw AppError.forbidden('Invalid refresh endpoint. Please use the correct endpoint.');
    }

    // Find session by refresh token
    const session = findSessionByToken(user, refreshToken);

    if (!session) {
      // Fallback to legacy token check
      if (user.refreshToken !== refreshToken) {
        throw new AppError(
          {
            code: ErrorCode.TOKEN_INVALID,
            message: 'Invalid refresh token. Please login again.',
            userMessage: 'Your session is no longer valid. Please log in again.',
          },
          401
        );
      }
    }

    // Determine if this was a "remember me" session
    const rememberMe = session?.rememberMe ?? false;

    // Generate new tokens with same remember me setting
    const tokens = generateTokens(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      {
        rememberMe,
        sessionId: session?.sessionId,
      }
    );

    // Update session or legacy token using atomic operation to handle race conditions
    try {
      if (session) {
        // Atomic update for session-based refresh
        const updateResult = await User.findOneAndUpdate(
          {
            _id: user._id,
            'sessions.sessionId': session.sessionId,
          },
          {
            $set: {
              'sessions.$.refreshToken': tokens.refreshToken,
              'sessions.$.lastActive': new Date(),
            },
          },
          { new: true }
        );

        if (!updateResult) {
          throw new AppError(
            {
              code: ErrorCode.TOKEN_INVALID,
              message: 'Session no longer valid. Please login again.',
              userMessage: 'Your session has changed. Please log in again.',
            },
            401
          );
        }
      } else {
        // Atomic update for legacy token refresh
        const updateResult = await User.findOneAndUpdate(
          {
            _id: user._id,
            refreshToken: refreshToken, // Ensure token hasn't changed
          },
          {
            $set: { refreshToken: tokens.refreshToken },
          },
          { new: true }
        );

        if (!updateResult) {
          throw new AppError(
            {
              code: ErrorCode.TOKEN_INVALID,
              message: 'Token already refreshed. Please use the new token.',
              userMessage: 'Your session was already refreshed. Please try again.',
            },
            401
          );
        }
      }
    } catch (error: any) {
      // Handle race condition - token was already refreshed by another request
      if (error.name === 'VersionError' || error.code === ErrorCode.TOKEN_INVALID) {
        throw new AppError(
          {
            code: ErrorCode.TOKEN_INVALID,
            message: 'Token refresh conflict. Please retry.',
            userMessage: 'Please try again.',
          },
          409
        );
      }
      throw error;
    }

    // Get token expiry for frontend
    const accessTokenExpiry = getTokenExpiry(tokens.accessToken);
    const refreshTokenExpiry = getTokenExpiry(tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: session?.sessionId,
      accessTokenExpiry,
      refreshTokenExpiry,
    };
  }

  /**
   * Perform logout for any user role
   * Supports single session, specific session, or all devices logout
   */
  static async performLogout(
    userId: string,
    expectedRole: UserRole,
    options: {
      sessionId?: string;
      allDevices?: boolean;
      refreshToken?: string;
    } = {}
  ): Promise<{ sessionsRemoved: number }> {
    const { sessionId, allDevices = false, refreshToken } = options;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    // Verify user role
    if (user.role !== expectedRole) {
      throw AppError.forbidden('Invalid logout endpoint. Please use the correct endpoint.');
    }

    let sessionsRemoved = 0;

    if (allDevices) {
      // Logout from all devices
      sessionsRemoved = removeAllSessions(user);
    } else if (sessionId) {
      // Logout from specific session
      const removed = removeSession(user, sessionId);
      sessionsRemoved = removed ? 1 : 0;
    } else if (refreshToken) {
      // Logout from current session (by refresh token)
      const session = findSessionByToken(user, refreshToken);
      if (session) {
        removeSession(user, session.sessionId);
        sessionsRemoved = 1;
      }
    } else {
      // Logout current session (clear legacy token)
      user.refreshToken = null;
      sessionsRemoved = 1;
    }

    await user.save();

    return { sessionsRemoved };
  }
}
