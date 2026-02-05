import { IUser } from '../models/User';
import AppError, { ErrorCode } from '../utils/AppError';
import { UserRole } from '../constants';

/**
 * Shared validation helpers for authentication
 */
export class AuthValidation {
  /**
   * Check if user exists
   */
  static validateUserExists(user: IUser | null): asserts user is IUser {
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
   * Check user approval status
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
   * Verify user role
   */
  static validateUserRole(user: IUser, expectedRole: UserRole): void {
    if (user.role !== expectedRole) {
      throw AppError.forbidden('Invalid login endpoint. Role mismatch.');
    }
  }

  static validateDepartmentUserStatus(user: IUser): void {
    this.validateUserRole(user, UserRole.DEPARTMENT_USER);
    this.validateApprovalStatus(user);
  }

  static validateEmployeeStatus(user: IUser): void {
    this.validateUserRole(user, UserRole.EMPLOYEE);
    this.validateApprovalStatus(user);
  }

  static validateAdminStatus(user: IUser): void {
    if (user.role !== UserRole.ADMIN) {
      throw AppError.forbidden('Invalid login endpoint. Admin access required.');
    }
  }
}
