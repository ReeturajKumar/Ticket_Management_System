import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { Department, Priority, TicketStatus, UserRole } from '../constants';
import AppError, { ErrorCode } from './AppError';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

export const nameEmailPasswordSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    email: emailSchema,
    password: passwordSchema,
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    email: emailSchema,
    password: passwordSchema,
    department: z.nativeEnum(Department),
    isHead: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1),
  }),
});

export const createPublicTicketSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    email: emailSchema,
    subject: z.string().min(5).max(200).trim(),
    description: z.string().min(10).max(2000).trim(),
    department: z.nativeEnum(Department),
    priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  }),
});

export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(5).max(200).trim(),
    description: z.string().min(10).max(2000).trim(),
    department: z.nativeEnum(Department),
    priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim(),
    email: emailSchema,
    password: passwordSchema,
    role: z.nativeEnum(UserRole),
    department: z.nativeEnum(Department).optional(),
    isHead: z.boolean().optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    email: emailSchema.optional(),
    role: z.nativeEnum(UserRole).optional(),
    department: z.nativeEnum(Department).nullable().optional(),
    isHead: z.boolean().optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }),
});

export const rejectionSchema = z.object({
  body: z.object({
    reason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
  }),
});

export const bulkAssignSchema = z.object({
  body: z.object({
    ticketIds: z.array(objectIdSchema).min(1).max(100),
    assignedTo: objectIdSchema,
  }),
});

export const bulkStatusSchema = z.object({
  body: z.object({
    ticketIds: z.array(objectIdSchema).min(1).max(100),
    status: z.nativeEnum(TicketStatus),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(TicketStatus),
  }),
});

export const assignTicketSchema = z.object({
  body: z.object({
    assignedTo: objectIdSchema,
  }),
});

export const changePrioritySchema = z.object({
  body: z.object({
    priority: z.nativeEnum(Priority),
  }),
});

export const commentSchema = z.object({
  body: z.object({
    comment: z.string().min(1).max(2000),
    isInternal: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
  }),
});

export const createInternalTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(5).max(200).trim(),
    description: z.string().min(10).max(2000).trim(),
    department: z.nativeEnum(Department),
    priority: z.nativeEnum(Priority),
  }),
});

export const reportSchema = z.object({
  query: z.object({
    format: z.enum(['csv', 'excel', 'pdf']),
    type: z.enum(['tickets', 'team', 'summary']).optional().default('tickets'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
  }),
});

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Ensure body exists for multipart/form-data or empty requests
      const result = await schema.parseAsync({
        body: req.body || {},
        query: req.query || {},
        params: req.params || {},
      }) as { body?: any; query?: any; params?: any };
      
      if (result.body) req.body = result.body;
      if (result.query) req.query = result.query;
      if (result.params) req.params = result.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details: Record<string, string> = {};
        error.issues.forEach((err: any) => {
          details[err.path.join('.')] = err.message;
        });
        next(new AppError({ code: ErrorCode.VALIDATION_FAILED, message: 'Validation failed', details }, 400));
      } else {
        next(error);
      }
    }
  };
}

export default {
  validate,
  registerSchema,
  nameEmailPasswordSchema,
  loginSchema,
  createPublicTicketSchema,
  createTicketSchema,
  createUserSchema,
  rejectionSchema,
  updateUserSchema,
  bulkAssignSchema,
  bulkStatusSchema,
  updateStatusSchema,
  assignTicketSchema,
  changePrioritySchema,
  commentSchema,
  reportSchema,
  createInternalTicketSchema,
};
