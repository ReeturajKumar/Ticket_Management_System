import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, Department } from '../constants';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: Department;
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
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: [true, 'Role is required'],
      default: UserRole.STUDENT,
    },
    department: {
      type: String,
      enum: Object.values(Department),
      required: function (this: IUser) {
        return this.role === UserRole.DEPARTMENT_USER;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster email lookups
UserSchema.index({ email: 1 });

export default mongoose.model<IUser>('User', UserSchema);
