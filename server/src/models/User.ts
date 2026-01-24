import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, Department } from '../constants';

/**
 * Session interface for multi-device tracking
 */
export interface ISession {
  sessionId: string;
  refreshToken: string;
  deviceInfo: {
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    ip?: string;
  };
  rememberMe: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: Department;
  refreshToken?: string | null;  // Legacy - kept for backward compatibility
  sessions: ISession[];          // New - multi-device session tracking
  isVerified: boolean;
  verificationOTP?: string;
  otpExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  
  // Department User fields
  isHead?: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isApproved?: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'Role is required'],
      default: UserRole.USER,
    },
    department: {
      type: String,
      enum: Object.values(Department),
      required: function (this: IUser) {
        return this.role === UserRole.DEPARTMENT_USER;
      },
    },
    refreshToken: {
      type: String,
      default: null,
    },
    // Multi-device session tracking (max 5 sessions per user)
    sessions: {
      type: [{
        sessionId: {
          type: String,
          required: true,
        },
        refreshToken: {
          type: String,
          required: true,
        },
        deviceInfo: {
          userAgent: String,
          browser: String,
          os: String,
          device: String,
          ip: String,
        },
        rememberMe: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        lastUsedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
      }],
      validate: {
        validator: function(sessions: any[]) {
          return sessions.length <= 5;
        },
        message: 'Maximum 5 sessions allowed per user',
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationOTP: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpiry: {
      type: Date,
      default: null,
    },
    
    // Department User fields
    isHead: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'APPROVED',
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Note: email index is automatically created by `unique: true` constraint
// No need to explicitly declare UserSchema.index({ email: 1 })

// Compound index for team queries (department staff listing, approval filtering)
UserSchema.index({ role: 1, department: 1, isApproved: 1 });

// Index for session lookups by sessionId (multi-device support)
UserSchema.index({ 'sessions.sessionId': 1 });

// Index for token validation (refresh token lookups)
UserSchema.index({ 'sessions.refreshToken': 1 });

export default mongoose.model<IUser>('User', UserSchema);
