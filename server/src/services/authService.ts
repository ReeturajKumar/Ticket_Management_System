import { Request } from 'express';
import User, { IUser } from '../models/User';
import { comparePassword, generateToken, getTokenExpiry } from '../utils/security';
import AppError, { ErrorCode } from '../utils/AppError';

/**
 * Shared authentication logic for all user roles
 */
export class AuthService {
  /**
   * Validates credentials and generates a single auth token expiring at midnight
   */
  static async performLogin(
    user: IUser,
    password: string,
    _rememberMe: boolean,
    _req: Request
  ): Promise<{
    token: string;
    expiry: Date | null;
  }> {
    const userWithPass = await User.findById(user._id).select('+password');
    if (!userWithPass) throw AppError.notFound('User');

    const isPasswordValid = await comparePassword(password, userWithPass.password);
    if (!isPasswordValid) {
      throw new AppError(
        {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        },
        401
      );
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      token,
      expiry: getTokenExpiry(token),
    };
  }
}
