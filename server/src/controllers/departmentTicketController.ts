import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus, Priority, UserRole } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import { invalidateDepartmentCache } from '../utils/cache';
import { 
  emitTicketAssigned, 
  emitTicketStatusChanged, 
  emitTicketPriorityChanged,
  emitCommentAdded 
} from '../utils/socket';
import { parseFieldSelection, DEFAULT_FIELDS } from '../utils/fieldSelection';
import { parsePaginationParams, buildPaginationMeta } from '../utils/pagination';

/**
 * List all tickets for the department - OPTIMIZED with Cursor-Based Pagination
 * GET /api/v1/department/tickets
 * 
 * Query Parameters:
 * - cursor: Last ticket ID from previous page (for cursor pagination)
 * - page: Page number (for traditional pagination, fallback)
 * - limit: Number of items per page (default: 20, max: 100)
 * - status: Filter by status (comma-separated for multiple)
 * - priority: Filter by priority (comma-separated for multiple)
 * - assignedTo: Filter by assigned user or 'unassigned'
 * - sort: Sort field (default: createdAt)
 * - order: Sort order 'asc' or 'desc' (default: desc)
 * - startDate: Filter tickets created after this date
 * - endDate: Filter tickets created before this date
 * - resolvedStartDate: Filter tickets resolved after this date
 * - resolvedEndDate: Filter tickets resolved before this date
 * - fields: Comma-separated list of fields to return (e.g., id,subject,status,priority)
 */
export const listDepartmentTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { 
      status, 
      priority, 
      assignedTo, 
      cursor,
      startDate,
      endDate,
      resolvedStartDate,
      resolvedEndDate,
    } = req.query;

    // Parse pagination parameters using utility
    const paginationParams = parsePaginationParams(req, {
      page: 1,
      limit: 20,
      maxLimit: 100,
      sort: 'createdAt',
      order: 'desc',
    });
    
    const { limit: limitNum, sort, order, page } = paginationParams;
    const sortOrder = order === 'asc' ? 1 : -1;

    // Parse field selection (sparse responses)
    const fieldSelection = parseFieldSelection(req);

    // Build filter
    const filter: any = { department: user.department };

    if (status) {
      // Support multiple status values (comma-separated)
      const statusValues = (status as string).split(',');
      filter.status = statusValues.length > 1 ? { $in: statusValues } : status;
    }

    if (priority) {
      // Support multiple priority values
      const priorityValues = (priority as string).split(',');
      filter.priority = priorityValues.length > 1 ? { $in: priorityValues } : priority;
    }

    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        filter.assignedTo = null;
      } else {
        filter.assignedTo = new mongoose.Types.ObjectId(assignedTo as string);
      }
    }

    // Date range filters for createdAt
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          throw new AppError({
            code: ErrorCode.INVALID_DATE_RANGE,
            message: 'Invalid start date format',
          }, 400);
        }
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          throw new AppError({
            code: ErrorCode.INVALID_DATE_RANGE,
            message: 'Invalid end date format',
          }, 400);
        }
        // Set to end of day
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Date range filters for resolvedAt
    if (resolvedStartDate || resolvedEndDate) {
      filter.resolvedAt = {};
      if (resolvedStartDate) {
        const start = new Date(resolvedStartDate as string);
        if (isNaN(start.getTime())) {
          throw new AppError({
            code: ErrorCode.INVALID_DATE_RANGE,
            message: 'Invalid resolved start date format',
          }, 400);
        }
        filter.resolvedAt.$gte = start;
      }
      if (resolvedEndDate) {
        const end = new Date(resolvedEndDate as string);
        if (isNaN(end.getTime())) {
          throw new AppError({
            code: ErrorCode.INVALID_DATE_RANGE,
            message: 'Invalid resolved end date format',
          }, 400);
        }
        end.setHours(23, 59, 59, 999);
        filter.resolvedAt.$lte = end;
      }
    }

    // CURSOR-BASED PAGINATION (preferred for large datasets)
    if (cursor) {
      try {
        const cursorId = new mongoose.Types.ObjectId(cursor as string);
        // For descending order, get items with _id less than cursor
        // For ascending order, get items with _id greater than cursor
        filter._id = sortOrder === -1 ? { $lt: cursorId } : { $gt: cursorId };
      } catch {
        throw new AppError({
          code: ErrorCode.INVALID_ID_FORMAT,
          message: 'Invalid cursor format',
        }, 400);
      }
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sort as string] = sortOrder;
    // Add _id as secondary sort for consistent ordering
    if (sort !== '_id') {
      sortObj._id = sortOrder;
    }

    // Build query with field selection
    const baseQuery = Ticket.find(filter)
      .sort(sortObj)
      .limit(limitNum + 1) // Fetch one extra to check for more pages
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    // Apply field selection if specified
    const query = fieldSelection 
      ? baseQuery.select(fieldSelection) 
      : baseQuery.select('-__v');

    const tickets = await query.lean() as any[];

    // Check if there are more items
    const hasMore = tickets.length > limitNum;
    const resultTickets = hasMore ? tickets.slice(0, -1) : tickets;

    // Transform tickets to include names directly
    const transformedTickets = resultTickets.map((ticket: any) => ({
      ...ticket,
      userName: ticket.createdBy?.name || ticket.createdByName || ticket.contactName || 'Unknown',
      userEmail: ticket.createdBy?.email || ticket.contactEmail || 'Unknown',
      assignedToName: ticket.assignedTo?.name || ticket.assignedToName,
      assignedToEmail: ticket.assignedTo?.email,
    }));

    // Get next cursor (last item's ID)
    const nextCursor = hasMore && resultTickets.length > 0 
      ? resultTickets[resultTickets.length - 1]._id.toString() 
      : null;

    // Build comprehensive pagination metadata
    let paginationInfo: any;

    if (cursor) {
      // Cursor-based pagination (efficient for large datasets)
      paginationInfo = {
        limit: limitNum,
        count: transformedTickets.length,
        hasMore,
        hasPrev: !!cursor,
        cursor: cursor || null,
        nextCursor,
      };
    } else {
      // Traditional page-based pagination (includes total count)
      const baseFilter = { ...filter };
      delete baseFilter._id;
      const total = await Ticket.countDocuments(baseFilter);
      const pages = Math.ceil(total / limitNum);
      
      paginationInfo = buildPaginationMeta(
        total,
        { ...paginationParams, cursor: cursor as string | undefined },
        transformedTickets.length,
        nextCursor
      );
    }

    res.status(200).json({
      success: true,
      data: {
        tickets: transformedTickets,
        pagination: paginationInfo,
      },
    });
  } catch (error) {
    // Let the global error handler process this
    throw error;
  }
};

/**
 * Search tickets using full-text search
 * GET /api/v1/department/tickets/search
 * 
 * Query Parameters:
 * - q: Search query (required)
 * - status: Filter by status (optional)
 * - priority: Filter by priority (optional)
 * - limit: Number of results (default: 20, max: 50)
 */
export const searchTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { q, status, priority, limit = '20' } = req.query;

    if (!q || (q as string).trim().length < 2) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Search query must be at least 2 characters',
        userMessage: 'Please enter at least 2 characters to search.',
      }, 400);
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 50);
    const searchQuery = (q as string).trim();

    // Build filter
    const filter: any = {
      department: user.department,
      $text: { $search: searchQuery },
    };

    if (status) {
      const statusValues = (status as string).split(',');
      filter.status = statusValues.length > 1 ? { $in: statusValues } : status;
    }

    if (priority) {
      const priorityValues = (priority as string).split(',');
      filter.priority = priorityValues.length > 1 ? { $in: priorityValues } : priority;
    }

    // Search with text score for relevance ranking
    const tickets = await Ticket.find(
      filter,
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limitNum)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .select('-__v')
      .lean();

    // Transform tickets
    const transformedTickets = tickets.map((ticket: any) => ({
      ...ticket,
      userName: ticket.createdBy?.name || ticket.createdByName || ticket.contactName || 'Unknown',
      userEmail: ticket.createdBy?.email || ticket.contactEmail || 'Unknown',
      assignedToName: ticket.assignedTo?.name || ticket.assignedToName,
      assignedToEmail: ticket.assignedTo?.email,
      relevanceScore: ticket.score,
    }));

    res.status(200).json({
      success: true,
      data: {
        query: searchQuery,
        tickets: transformedTickets,
        count: transformedTickets.length,
      },
    });
  } catch (error: any) {
    // Handle case where text index doesn't exist yet
    if (error.code === 27 || error.codeName === 'IndexNotFound') {
      res.status(200).json({
        success: true,
        data: {
          query: req.query.q,
          tickets: [],
          count: 0,
          message: 'Search index is being built. Please try again in a moment.',
        },
      });
      return;
    }
    throw error;
  }
};

/**
 * Get ticket details
 * GET /api/v1/department/tickets/:id
 */
export const getTicketDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .select('-__v')
      .lean();

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Verify permission: Must belong to Head's department OR be created by the Head
    const isFromMyDepartment = ticket.department === user.department;
    const isCreatedByMe = ticket.createdBy && (
      (typeof ticket.createdBy === 'string' && ticket.createdBy === user._id.toString()) ||
      (typeof ticket.createdBy === 'object' && (ticket.createdBy as any)._id?.toString() === user._id.toString())
    );

    if (!isFromMyDepartment && !isCreatedByMe) {
      throw new AppError('You do not have permission to view this ticket', 403);
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Assign ticket to team member
 * PATCH /api/v1/department/tickets/:id/assign
 */
export const assignTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      throw new AppError('Please provide assignedTo user ID', 400);
    }

    // Find ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Verify ticket belongs to department
    if (ticket.department !== user.department) {
      throw new AppError('You do not have permission to modify this ticket', 403);
    }

    // Verify assignee is a team member
    const assignee = await User.findById(assignedTo);

    if (!assignee) {
      throw new AppError('Assignee not found', 404);
    }

    if (assignee.role !== UserRole.DEPARTMENT_USER || assignee.department !== user.department) {
      throw new AppError('Can only assign to team members in your department', 403);
    }

    // Update ticket
    ticket.assignedTo = assignee._id as any;
    ticket.assignedToName = assignee.name;
    
    // Update status to ASSIGNED if currently OPEN
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.ASSIGNED;
    }

    await ticket.save();

    // Invalidate department caches
    invalidateDepartmentCache(user.department);

    // Emit real-time notification
    emitTicketAssigned(
      user.department,
      ticket._id.toString(),
      ticket.subject,
      assignee._id.toString(),
      assignee.name,
      user.name
    );

    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
      data: {
        id: ticket._id,
        assignedTo: {
          id: assignee._id,
          name: assignee.name,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Update ticket status
 * PATCH /api/v1/department/tickets/:id/status
 */
export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Please provide status',
      }, 400);
    }

    // Validate status
    if (!Object.values(TicketStatus).includes(status)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid status',
        details: { status: `Valid values: ${Object.values(TicketStatus).join(', ')}` },
      }, 400);
    }

    // Find ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      throw AppError.notFound('Ticket');
    }

    // Verify ticket belongs to department
    if (ticket.department !== user.department) {
      throw AppError.forbidden('You do not have permission to modify this ticket');
    }

    // Cannot change status of CLOSED tickets
    if (ticket.status === TicketStatus.CLOSED) {
      throw new AppError({
        code: ErrorCode.TICKET_CLOSED,
        message: 'Cannot change status of closed tickets',
      }, 400);
    }

    const oldStatus = ticket.status;

    // Update status
    ticket.status = status;

    // Set resolvedAt if status is RESOLVED
    if (status === TicketStatus.RESOLVED) {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    // Invalidate department caches
    invalidateDepartmentCache(user.department);

    // Emit real-time notification
    emitTicketStatusChanged(
      user.department,
      ticket._id.toString(),
      ticket.subject,
      oldStatus,
      status,
      user.name
    );

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        id: ticket._id,
        status: ticket.status,
        previousStatus: oldStatus,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Add internal note to ticket
 * POST /api/v1/department/tickets/:id/notes
 */
export const addInternalNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      throw new AppError('Please provide a note', 400);
    }

    // Find ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Verify ticket belongs to department
    if (ticket.department !== user.department) {
      throw new AppError('You do not have permission to modify this ticket', 403);
    }

    // Add internal note as a comment with a special marker
    ticket.comments.push({
      user: user._id as any,
      userName: `[INTERNAL] ${user.name}`,
      comment: note,
      createdAt: new Date(),
    } as any);

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Internal note added successfully',
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Change ticket priority
 * PATCH /api/v1/department/tickets/:id/priority
 */
export const changeTicketPriority = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { priority } = req.body;

    if (!priority) {
      throw new AppError({
        code: ErrorCode.MISSING_REQUIRED_FIELD,
        message: 'Please provide priority',
      }, 400);
    }

    // Validate priority
    if (!Object.values(Priority).includes(priority)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid priority',
        details: { priority: `Valid values: ${Object.values(Priority).join(', ')}` },
      }, 400);
    }

    // Find ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      throw AppError.notFound('Ticket');
    }

    // Verify ticket belongs to department
    if (ticket.department !== user.department) {
      throw AppError.forbidden('You do not have permission to modify this ticket');
    }

    const oldPriority = ticket.priority;

    // Update priority
    ticket.priority = priority;
    await ticket.save();

    // Invalidate department caches
    invalidateDepartmentCache(user.department);

    // Emit real-time notification for priority change
    emitTicketPriorityChanged(
      user.department,
      ticket._id.toString(),
      ticket.subject,
      oldPriority,
      priority,
      user.name
    );

    res.status(200).json({
      success: true,
      message: 'Ticket priority updated successfully',
      data: {
        id: ticket._id,
        priority: ticket.priority,
        previousPriority: oldPriority,
      },
    });
  } catch (error: any) {
    throw error;
  }
};
