import mongoose, { Document, Schema } from 'mongoose';
import { Department, TicketStatus, Priority } from '../constants';

// Attachment interface
export interface IAttachment {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

// Comment interface
export interface IComment {
  user: mongoose.Types.ObjectId;
  userName: string;
  comment: string;
  attachments?: IAttachment[];
  createdAt: Date;
}

// Rating interface
export interface IRating {
  stars: number;
  comment?: string;
  ratedBy: mongoose.Types.ObjectId;
  ratedByName: string;
  ratedAt: Date;
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
  // Auth user fields (optional for public tickets)
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  // Guest fields (for public tickets)
  contactEmail?: string;
  contactName?: string;
  
  category?: string;
  assignedTo?: mongoose.Types.ObjectId;
  assignedToName?: string;
  attachments: IAttachment[];
  comments: IComment[];
  reopenHistory: IReopenHistory[];
  rating?: IRating;
  resolvedAt?: Date;
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
    // Authentication user reference (optional)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, 
    },
    createdByName: {
      type: String,
      required: false,
    },
    // Guest contact info (required if createdBy is missing)
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      required: false,
    },
    contactName: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: false,
      trim: true,
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
    attachments: [
      {
        filename: {
          type: String,
          required: true,
        },
        originalName: {
          type: String,
          required: true,
        },
        path: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        mimeType: {
          type: String,
          required: true,
        },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
        attachments: [
          {
            filename: String,
            originalName: String,
            path: String,
            size: Number,
            mimeType: String,
            uploadedBy: {
              type: Schema.Types.ObjectId,
              ref: 'User',
            },
            uploadedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
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
    rating: {
      stars: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        maxlength: [500, 'Rating comment cannot exceed 500 characters'],
      },
      ratedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      ratedByName: {
        type: String,
      },
      ratedAt: {
        type: Date,
      },
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
TicketSchema.index({ createdBy: 1, status: 1 });
TicketSchema.index({ department: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });
TicketSchema.index({ assignedTo: 1, status: 1 });
TicketSchema.index({ priority: 1, createdAt: -1 });

// Text index for full-text search on subject and description
// This enables fast searching across ticket content
TicketSchema.index(
  { 
    subject: 'text', 
    description: 'text',
    contactName: 'text',
    createdByName: 'text',
  },
  {
    weights: {
      subject: 10,       // Subject matches are most important
      description: 5,    // Description matches are secondary
      contactName: 2,    // Name matches are tertiary
      createdByName: 2,
    },
    name: 'ticket_text_search',
  }
);

// Compound index for date range queries with department filter
TicketSchema.index({ department: 1, createdAt: -1, status: 1 });
TicketSchema.index({ department: 1, resolvedAt: -1 });

export default mongoose.model<ITicket>('Ticket', TicketSchema);
