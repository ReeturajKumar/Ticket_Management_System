import { IUser } from '../models/User';

/**
 * Standardized response builders for authentication endpoints
 */
export class AuthResponse {
  /**
   * Build login success response
   */
  static loginSuccess(
    user: IUser,
    tokens: {
      accessToken: string;
      refreshToken: string;
      session: any;
      accessTokenExpiry: Date | null;
      refreshTokenExpiry: Date | null;
    },
    rememberMe: boolean = false
  ) {
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isHead: user.isHead,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId: tokens.session.sessionId,
        expiresAt: {
          accessToken: tokens.accessTokenExpiry?.toISOString(),
          refreshToken: tokens.refreshTokenExpiry?.toISOString(),
        },
        rememberMe,
      },
    };
  }

  /**
   * Build token refresh success response
   */
  static refreshSuccess(tokens: {
    accessToken: string;
    refreshToken: string;
    sessionId?: string;
    accessTokenExpiry: Date | null;
    refreshTokenExpiry: Date | null;
  }) {
    return {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId: tokens.sessionId,
        expiresAt: {
          accessToken: tokens.accessTokenExpiry?.toISOString(),
          refreshToken: tokens.refreshTokenExpiry?.toISOString(),
        },
      },
    };
  }

  /**
   * Build logout success response
   */
  static logoutSuccess(sessionsRemoved: number, allDevices: boolean = false) {
    return {
      success: true,
      message: allDevices
        ? `Logged out from all devices (${sessionsRemoved} session${sessionsRemoved !== 1 ? 's' : ''})`
        : 'Logged out successfully',
      data: {
        sessionsRemoved,
      },
    };
  }

  /**
   * Build registration success response
   */
  static registrationSuccess(
    user: IUser,
    additionalData: Record<string, any> = {}
  ) {
    return {
      success: true,
      message: 'Registration successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        approvalStatus: user.approvalStatus,
        ...additionalData,
      },
    };
  }

  /**
   * Build OTP verification success response
   */
  static otpVerificationSuccess(user: IUser) {
    return {
      success: true,
      message: 'Email verified successfully. Your account is pending admin approval.',
      data: {
        email: user.email,
        isVerified: true,
        approvalStatus: user.approvalStatus,
      },
    };
  }

  /**
   * Build OTP resend success response
   */
  static otpResendSuccess(email: string, otpExpiry: Date, expiryMs: number) {
    return {
      success: true,
      message: 'OTP sent successfully',
      data: {
        email,
        otpExpiresAt: otpExpiry.toISOString(),
        timeRemainingSeconds: expiryMs / 1000,
      },
    };
  }

  /**
   * Build password reset success response
   */
  static passwordResetSuccess() {
    return {
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    };
  }

  /**
   * Build forgot password success response (intentionally vague for security)
   */
  static forgotPasswordSuccess() {
    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    };
  }

  /**
   * Build registration status response
   */
  static registrationStatus(user: IUser) {
    let message = '';
    switch (user.approvalStatus) {
      case 'PENDING':
        message = 'Your registration is pending admin approval';
        break;
      case 'APPROVED':
        message = 'Your registration has been approved. You can now login.';
        break;
      case 'REJECTED':
        message = `Your registration was rejected. Reason: ${user.rejectionReason || 'No reason provided'}`;
        break;
    }

    return {
      success: true,
      data: {
        email: user.email,
        name: user.name,
        department: user.department,
        approvalStatus: user.approvalStatus,
        isVerified: user.isVerified,
        message,
      },
    };
  }

  /**
   * Build active sessions response
   */
  static activeSessions(sessions: any[], count: number) {
    return {
      success: true,
      data: {
        sessions,
        count,
      },
    };
  }

  /**
   * Build session revoke success response
   */
  static sessionRevokeSuccess() {
    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }
}
