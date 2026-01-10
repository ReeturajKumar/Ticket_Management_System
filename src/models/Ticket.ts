import mongoose, { Document, Schema } from 'mongoose';
import { Department, TicketStatus, Priority } from '../constants';

// Comment interface
export interface IComment {
  user: mongoose.Types.ObjectId;
  userName: string;
  comment: string;
  createdAt: Date;
}

// Reopen history interface
export interface IReopenHistory {
  reopenedBy: mongoose.Types.ObjectId;
  reopenedByName: string;
  reason: string;
  reopenedAt: Date;
}

// Ticket interface
export interface ITicket extends Document {
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  department: Department;
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  assignedTo?: mongoose.Types.ObjectId;
  assignedToName?: string;
  comments: IComment[];
  reopenHistory: IReopenHistory[];
  createdAt: Date;
  updatedAt: Date;
}

// Ticket schema
const TicketSchema = new Schema<ITicket>(
  {
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.OPEN,
    },
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.MEDIUM,
    },
    department: {
      type: String,
      enum: Object.values(Department),
      required: [true, 'Please specify a department'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedToName: {
      type: String,
      default: null,
    },
    comments: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
        comment: {
          type: String,
          required: true,
          maxlength: [1000, 'Comment cannot exceed 1000 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reopenHistory: [
      {
        reopenedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reopenedByName: {
          type: String,
          required: true,
        },
        reason: {
          type: String,
          required: true,
          maxlength: [500, 'Reopen reason cannot exceed 500 characters'],
        },
        reopenedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
TicketSchema.index({ createdBy: 1, status: 1 });
TicketSchema.index({ department: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });

export default mongoose.model<ITicket>('Ticket', TicketSchema);
