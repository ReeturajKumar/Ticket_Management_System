import { Request } from 'express';
import { IUser } from '../models/User';
import AppError, { ErrorCode } from '../utils/AppError';
import { UserRole } from '../constants';

/**
 * Shared validation helpers for authentication
 */
export class AuthValidation {
  /**
   * Validate login request has required fields
   */
  static validateLoginRequest(req: Request): { email: string; password: string; rememberMe: boolean } {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      throw new AppError(
        {
          code: ErrorCode.MISSING_REQUIRED_FIELD,
          message: 'Please provide email and password',
        },
        400
      );
    }

    return { email: email.toLowerCase(), password, rememberMe };
  }

  /**
   * Validate refresh token request
   */
  static validateRefreshRequest(req: Request): string {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(
        {
          code: ErrorCode.MISSING_REQUIRED_FIELD,
          message: 'Refresh token is required',
        },
        400
      );
    }

    return refreshToken;
  }

  /**
   * Check if user exists and return it
   */
  static validateUserExists(user: IUser | null, email?: string): asserts user is IUser {
    if (!user) {
      throw new AppError(
        {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        },
        401
      );
    }
  }

  /**
   * Verify user has the expected role
   */
  static validateUserRole(user: IUser, expectedRole: UserRole): void {
    if (user.role !== expectedRole) {
      throw AppError.forbidden('Invalid login endpoint. Role mismatch.');
    }
  }

  /**
   * Check if user's email is verified
   */
  static validateEmailVerified(user: IUser): void {
    if (!user.isVerified) {
      throw new AppError(
        {
          code: ErrorCode.ACCOUNT_NOT_VERIFIED,
          message: 'Please verify your email before logging in.',
          userMessage: 'Please verify your email first. Check your inbox for the verification code.',
        },
        403
      );
    }
  }

  /**
   * Check user approval status (for department users and employees)
   */
  static validateApprovalStatus(user: IUser): void {
    if (user.approvalStatus === 'PENDING') {
      throw new AppError(
        {
          code: ErrorCode.ACCOUNT_NOT_APPROVED,
          message: 'Your account is pending admin approval.',
          userMessage: 'Your account is awaiting approval. Please wait for admin confirmation.',
        },
        403
      );
    }

    if (user.approvalStatus === 'REJECTED') {
      const reason = user.rejectionReason || 'No reason provided';
      throw new AppError(
        {
          code: ErrorCode.ACCOUNT_REJECTED,
          message: `Your registration was rejected. Reason: ${reason}`,
          userMessage: `Your registration was not approved. Reason: ${reason}`,
        },
        403
      );
    }

    // Also check isApproved flag for employees
    if (!user.isApproved) {
      throw new AppError(
        {
          code: ErrorCode.ACCOUNT_NOT_APPROVED,
          message: 'Account pending activation',
        },
        403
      );
    }
  }

  /**
   * Complete account status check for department users
   */
  static validateDepartmentUserStatus(user: IUser): void {
    this.validateUserRole(user, UserRole.DEPARTMENT_USER);
    this.validateEmailVerified(user);
    this.validateApprovalStatus(user);
  }

  /**
   * Complete account status check for employees
   */
  static validateEmployeeStatus(user: IUser): void {
    this.validateUserRole(user, UserRole.EMPLOYEE);
    this.validateEmailVerified(user);
    this.validateApprovalStatus(user);
  }

  /**
   * Complete account status check for admins
   */
  static validateAdminStatus(user: IUser): void {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw AppError.forbidden('Invalid login endpoint. Admin access required.');
    }
    this.validateEmailVerified(user);
  }

  /**
   * Validate registration request fields
   */
  static validateRegistrationRequest(
    req: Request,
    requiredFields: string[]
  ): Record<string, any> {
    const data: Record<string, any> = {};

    for (const field of requiredFields) {
      if (!req.body[field]) {
        throw new AppError(
          {
            code: ErrorCode.MISSING_REQUIRED_FIELD,
            message: `Please provide ${field}`,
          },
          400
        );
      }
      data[field] = req.body[field];
    }

    return data;
  }

  /**
   * Validate OTP request
   */
  static validateOTPRequest(req: Request): { email: string; otp: string } {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError(
        {
          code: ErrorCode.MISSING_REQUIRED_FIELD,
          message: 'Please provide email and OTP',
        },
        400
      );
    }

    return { email: email.toLowerCase(), otp };
  }

  /**
   * Validate password reset request
   */
  static validatePasswordResetRequest(req: Request): { token: string; newPassword: string } {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError('Please provide token and new password', 400);
    }

    return { token, newPassword };
  }
}
