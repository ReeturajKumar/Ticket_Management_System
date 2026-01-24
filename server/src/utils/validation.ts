import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { Department, Priority, TicketStatus, UserRole } from '../constants';
import AppError, { ErrorCode } from './AppError';

/**
 * Zod Validation Schemas and Middleware
 * Centralized request validation for all API endpoints
 */

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * MongoDB ObjectId validation
 */
export const objectIdSchema = z.string().regex(
  /^[0-9a-fA-F]{24}$/,
  'Invalid ID format'
);

/**
 * Email validation
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .toLowerCase()
  .trim();

/**
 * Password validation - Strong password policy
 * Requirements: 8+ chars, uppercase, lowercase, number
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  cursor: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

/**
 * Register department user
 */
export const registerSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .trim(),
    email: emailSchema,
    password: passwordSchema,
    department: z.nativeEnum(Department),
    isHead: z.boolean().optional().default(false),
  }),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
  }),
});

/**
 * Verify OTP schema
 */
export const verifyOTPSchema = z.object({
  body: z.object({
    email: emailSchema,
    otp: z.string()
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d+$/, 'OTP must contain only numbers'),
  }),
});

/**
 * Resend OTP schema
 */
export const resendOTPSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: passwordSchema,
  }),
});

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),
});

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// ============================================================================
// TICKET SCHEMAS
// ============================================================================

/**
 * Create public ticket
 */
export const createPublicTicketSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .trim(),
    email: emailSchema,
    subject: z.string()
      .min(5, 'Subject must be at least 5 characters')
      .max(200, 'Subject must be less than 200 characters')
      .trim(),
    description: z.string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must be less than 2000 characters')
      .trim(),
    department: z.nativeEnum(Department),
    priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  }),
});

/**
 * List tickets query
 */
export const listTicketsQuerySchema = z.object({
  query: paginationSchema.extend({
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedTo: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    resolvedStartDate: z.string().optional(),
    resolvedEndDate: z.string().optional(),
    fields: z.string().optional(),
  }),
});

/**
 * Search tickets query
 */
export const searchTicketsQuerySchema = z.object({
  query: z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters'),
    status: z.string().optional(),
    priority: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

/**
 * Ticket ID param
 */
export const ticketIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

/**
 * Assign ticket
 */
export const assignTicketSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    assignedTo: objectIdSchema,
  }),
});

/**
 * Update ticket status
 */
export const updateTicketStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    status: z.nativeEnum(TicketStatus),
  }),
});

/**
 * Update ticket priority
 */
export const updateTicketPrioritySchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    priority: z.nativeEnum(Priority),
  }),
});

/**
 * Add internal note
 */
export const addNoteSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    note: z.string()
      .min(1, 'Note is required')
      .max(1000, 'Note must be less than 1000 characters')
      .trim(),
  }),
});

/**
 * Bulk assign tickets
 */
export const bulkAssignSchema = z.object({
  body: z.object({
    ticketIds: z.array(objectIdSchema)
      .min(1, 'At least one ticket ID is required')
      .max(100, 'Cannot process more than 100 tickets at once'),
    assignedTo: objectIdSchema,
  }),
});

/**
 * Bulk update status
 */
export const bulkStatusSchema = z.object({
  body: z.object({
    ticketIds: z.array(objectIdSchema)
      .min(1, 'At least one ticket ID is required')
      .max(100, 'Cannot process more than 100 tickets at once'),
    status: z.nativeEnum(TicketStatus),
  }),
});

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validation middleware factory
 * Creates middleware that validates request against a Zod schema
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Build validation target based on schema shape
      const dataToValidate: Record<string, any> = {};
      const schemaShape = (schema as any).shape || (schema as any)._def?.shape?.() || {};
      
      if ('body' in schemaShape) {
        dataToValidate.body = req.body;
      }
      if ('query' in schemaShape) {
        dataToValidate.query = req.query;
      }
      if ('params' in schemaShape) {
        dataToValidate.params = req.params;
      }

      // If schema doesn't have body/query/params shape, validate body directly
      const hasShapeKeys = Object.keys(dataToValidate).length > 0;
      const target = hasShapeKeys ? dataToValidate : { body: req.body };

      const result = await schema.parseAsync(hasShapeKeys ? target : target.body) as any;
      
      // Merge validated data back into request
      if (hasShapeKeys && result.body) {
        req.body = result.body;
      }
      if (hasShapeKeys && result.query) {
        req.query = result.query as any;
      }
      if (hasShapeKeys && result.params) {
        req.params = result.params as any;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod errors into our error structure
        const details: Record<string, string> = {};
        (error.issues || []).forEach((err: any) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        const appError = new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Validation failed',
          userMessage: 'Please check your input and try again.',
          details,
        }, 400);

        next(appError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Simple body validation
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details: Record<string, string> = {};
        (error.issues || []).forEach((err: any) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        const appError = new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Validation failed',
          details,
        }, 400);

        next(appError);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Simple query validation
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details: Record<string, string> = {};
        (error.issues || []).forEach((err: any) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        const appError = new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Invalid query parameters',
          details,
        }, 400);

        next(appError);
      } else {
        next(error);
      }
    }
  };
}

export default {
  validate,
  validateBody,
  validateQuery,
  // Schemas
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  createPublicTicketSchema,
  listTicketsQuerySchema,
  searchTicketsQuerySchema,
  ticketIdParamSchema,
  assignTicketSchema,
  updateTicketStatusSchema,
  updateTicketPrioritySchema,
  addNoteSchema,
  bulkAssignSchema,
  bulkStatusSchema,
};
