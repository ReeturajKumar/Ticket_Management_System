import { IUser } from '../models/User';

/**
 * Standardized Response Builders
 */
export class ResponseUtils {
  static success(res: any, message: string, data: any = {}, status: number = 200) {
    return res.status(status).json({
      success: true,
      message,
      data
    });
  }

  static authSuccess(user: IUser, tokenData: { token: string; expiry: Date | null }) {
    return {
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isHead: user.isHead,
        },
        token: tokenData.token,
        expiresAt: tokenData.expiry?.toISOString(),
      },
    };
  }

  static registrationStatus(user: IUser) {
    const messages: Record<string, string> = {
      PENDING: 'Your registration is pending admin approval',
      APPROVED: 'Your registration has been approved. You can now login.',
      REJECTED: `Your registration was rejected. Reason: ${user.rejectionReason || 'No reason provided'}`
    };

    return {
      success: true,
      data: {
        email: user.email,
        name: user.name,
        approvalStatus: user.approvalStatus,
        message: messages[user.approvalStatus || 'PENDING']
      }
    };
  }
}
