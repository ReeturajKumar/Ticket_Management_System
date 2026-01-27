import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus, Priority, UserRole } from '../constants';
import AppError from '../utils/AppError';
import { sendTicketReplyEmail } from '../utils/email';
import { emitTicketCreated, emitTicketStatusChanged } from '../utils/socket';
import { invalidateDepartmentCache } from '../utils/cache';

/**
 * List my assigned tickets
 * GET /api/v1/department/staff/my-tickets
 */
export const listMyTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, priority, page = '1', limit = '20' } = req.query;

    // Build filter - tokens assigned to this staff member
    const filter: any = {
      assignedTo: user._id,
      department: user.department,
    };

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get tickets
    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await Ticket.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * List internal tickets created by me
 * GET /api/v1/department/staff/my-requests
 */
export const listMyInternalRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, priority, page = '1', limit = '20' } = req.query;

    const filter: any = {
      createdBy: user._id,
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    const total = await Ticket.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get my ticket details
 * GET /api/v1/department/staff/my-tickets/:id
 */
export const getMyTicketDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const ticket = await Ticket.findById(id).select('-__v');

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Permission Check: 
    // 1. User is the assignee
    // 2. User is the creator
    // 3. Ticket is unassigned AND belongs to the user's department
    const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === user._id.toString();
    const isCreator = ticket.createdBy && ticket.createdBy.toString() === user._id.toString();
    const isUnassignedInDepartment = !ticket.assignedTo && ticket.department === user.department;

    if (!isAssignee && !isCreator && !isUnassignedInDepartment) {
      throw new AppError('You do not have permission to view this ticket', 403);
    }

    // If it's an assigned ticket (not created by them or for them), verify department
    if (isAssignee && !isCreator && ticket.department !== user.department) {
      throw new AppError('You do not have permission to access tickets from other departments', 403);
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
 * Update my ticket status
 * PATCH /api/v1/department/staff/my-tickets/:id/status
 */
export const updateMyTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError('Please provide status', 400);
    }

    // Validate status
    const allowedStatuses = [
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_USER,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ];

    if (!allowedStatuses.includes(status)) {
      throw new AppError(
        'Invalid status. Staff can only set: IN_PROGRESS, WAITING_FOR_USER, RESOLVED',
        400
      );
    }

    // Find ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Verify ticket is assigned to this staff member
    if (!ticket.assignedTo || ticket.assignedTo.toString() !== user._id.toString()) {
      throw new AppError('You can only update tickets assigned to you', 403);
    }

    // Verify ticket belongs to department
    if (ticket.department !== user.department) {
      throw new AppError('You do not have permission to modify this ticket', 403);
    }

    // Cannot change status of CLOSED tickets
    if (ticket.status === TicketStatus.CLOSED) {
      throw new AppError('Cannot change status of closed tickets', 400);
    }

    const oldStatus = ticket.status;

    // Update status
    ticket.status = status;

    // Set resolvedAt if status is RESOLVED
    if (status === TicketStatus.RESOLVED) {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    // Invalidate department cache to refresh dashboard stats
    invalidateDepartmentCache(user.department);

    // Emit real-time notification for status change
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
 * Add comment to my ticket
 * POST /api/v1/department/staff/my-tickets/:id/comments
 */
export const addCommentToMyTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      throw new AppError('Please provide a comment', 400);
    }

    // Find ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Permission Check: User must be the assignee OR the creator
    const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === user._id.toString();
    const isCreator = ticket.createdBy && ticket.createdBy.toString() === user._id.toString();

    if (!isAssignee && !isCreator) {
      throw new AppError('You do not have permission to comment on this ticket', 403);
    }

    // If it's an assigned ticket (not created by them), verify department
    if (isAssignee && !isCreator && ticket.department !== user.department) {
      throw new AppError('You do not have permission to modify tickets from other departments', 403);
    }

    // Add public comment (visible to user)
    ticket.comments.push({
      user: user._id as any,
      userName: user.name,
      comment: comment,
      createdAt: new Date(),
    } as any);

    await ticket.save();

    // Send email to user if it's a guest ticket
    if (ticket.contactEmail) {
      sendTicketReplyEmail(
        ticket.contactEmail,
        ticket.contactName || ticket.createdByName || 'User',
        ticket._id.toString(),
        ticket.subject,
        comment,
        user.name
      ).catch((err: any) => console.error('Failed to send reply email:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * List unassigned tickets in my department
 * GET /api/v1/department/staff/unassigned-tickets
 */
export const listUnassignedTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { page = '1', limit = '20' } = req.query;

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get unassigned tickets in department with populated user data
    const tickets = await Ticket.find({
      department: user.department,
      assignedTo: null,
      status: TicketStatus.OPEN,
    })
      .sort({ priority: -1, createdAt: -1 }) // Sort by priority first, then date
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name email')
      .select('-__v')
      .lean();

    // Transform tickets to include user names directly
    const transformedTickets = tickets.map((ticket: any) => ({
      ...ticket,
      userName: ticket.createdBy?.name || ticket.createdByName || ticket.contactName || 'Unknown',
      userEmail: ticket.createdBy?.email || ticket.contactEmail || 'Unknown',
    }));

    const total = await Ticket.countDocuments({
      department: user.department,
      assignedTo: null,
      status: TicketStatus.OPEN,
    });

    res.status(200).json({
      success: true,
      data: {
        tickets: transformedTickets,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get my dashboard statistics
 * GET /api/v1/department/staff/my-dashboard
 */
export const getMyDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    // Get all tickets assigned to this staff member
    const allTickets = await Ticket.find({
      assignedTo: user._id,
      department: user.department,
    });

    const totalAssigned = allTickets.length;
    const resolved = allTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;
    const inProgress = allTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length;
    const waiting = allTickets.filter((t) => t.status === TicketStatus.WAITING_FOR_USER).length;
    const open = allTickets.filter(
      (t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.ASSIGNED
    ).length;

    // Calculate average resolution time
    const resolvedTickets = allTickets.filter((t) => t.resolvedAt);
    let avgResolutionTime = '0 hours';

    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        const createdAt = new Date(ticket.createdAt).getTime();
        const resolvedAt = new Date(ticket.resolvedAt!).getTime();
        return sum + (resolvedAt - createdAt);
      }, 0);

      const avgTimeMs = totalTime / resolvedTickets.length;
      const avgTimeHours = (avgTimeMs / (1000 * 60 * 60)).toFixed(1);
      avgResolutionTime = `${avgTimeHours} hours`;
    }

    // Calculate performance percentage
    const performance = totalAssigned > 0 ? Math.round((resolved / totalAssigned) * 100) : 0;

    // Get recent tickets (last 5)
    const recentTickets = await Ticket.find({
      assignedTo: user._id,
      department: user.department,
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('createdBy', 'name email')
      .select('subject status priority updatedAt createdBy createdByName contactName contactEmail createdAt')
      .lean();

    const formattedRecentTickets = recentTickets.map((ticket: any) => ({
      ...ticket,
      userName: ticket.createdBy?.name || ticket.createdByName || ticket.contactName || 'Unknown',
      userEmail: ticket.createdBy?.email || ticket.contactEmail || 'Unknown',
    }));

    // Get tickets created by this user (Internal Requests)
    const myInternalRequests = await Ticket.find({
      createdBy: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAssigned,
          resolved,
          inProgress,
          waiting,
          open,
          avgResolutionTime,
          performance: `${performance}%`,
        },
        recentTickets: formattedRecentTickets,
        myInternalRequests,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get my performance history
 * GET /api/v1/department/staff/my-performance
 */
export const getMyPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    // Get all tickets assigned to this staff member
    const allTickets = await Ticket.find({
      assignedTo: user._id,
      department: user.department,
    });

    const totalAssigned = allTickets.length;
    const resolved = allTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;
    const inProgress = allTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length;
    const open = allTickets.filter(
      (t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.ASSIGNED
    ).length;

    // Calculate average resolution time
    const resolvedTickets = allTickets.filter((t) => t.resolvedAt);
    let avgResolutionTime = '0 hours';

    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        const createdAt = new Date(ticket.createdAt).getTime();
        const resolvedAt = new Date(ticket.resolvedAt!).getTime();
        return sum + (resolvedAt - createdAt);
      }, 0);

      const avgTimeMs = totalTime / resolvedTickets.length;
      const avgTimeHours = (avgTimeMs / (1000 * 60 * 60)).toFixed(1);
      avgResolutionTime = `${avgTimeHours} hours`;
    }

    // Calculate performance percentage
    const performance = totalAssigned > 0 ? Math.round((resolved / totalAssigned) * 100) : 0;

    // Get this week's stats
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeekTickets = allTickets.filter((t) => new Date(t.createdAt) >= oneWeekAgo);
    const thisWeekAssigned = thisWeekTickets.length;
    const thisWeekResolved = thisWeekTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;

    // Get this month's stats
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const thisMonthTickets = allTickets.filter((t) => new Date(t.createdAt) >= oneMonthAgo);
    const thisMonthAssigned = thisMonthTickets.length;
    const thisMonthResolved = thisMonthTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;

    // Group by priority
    const byPriority: any = {};
    Object.values(Priority).forEach((priority) => {
      byPriority[priority] = allTickets.filter((t) => t.priority === priority).length;
    });

    res.status(200).json({
      success: true,
      data: {
        overall: {
          totalAssigned,
          resolved,
          inProgress,
          open,
          avgResolutionTime,
          performance: `${performance}%`,
        },
        thisWeek: {
          assigned: thisWeekAssigned,
          resolved: thisWeekResolved,
        },
        thisMonth: {
          assigned: thisMonthAssigned,
          resolved: thisMonthResolved,
        },
        byPriority,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Create an internal ticket
 * POST /api/v1/department/staff/internal-ticket
 */
export const createInternalTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { subject, description, department, priority } = req.body;

    if (!subject || !description || !department || !priority) {
      throw new AppError('Please provide all required fields: subject, description, department, priority', 400);
    }

    // Create ticket
    const ticket = await Ticket.create({
      subject,
      description,
      department, // Target department
      priority,
      status: TicketStatus.OPEN,
      createdBy: user._id, // The staff member creating it
      createdByName: user.name,
      contactEmail: user.email,
      contactName: user.name,
    });

    // Invalidate cache for the target department
    invalidateDepartmentCache(department);

    // Emit real-time notification to the TARGET department (not creator's department)
    // This ensures the target department receives the notification and UI updates
    emitTicketCreated(department, ticket);

    res.status(201).json({
      success: true,
      message: 'Internal ticket created successfully',
      data: ticket,
    });
  } catch (error: any) {
    throw error;
  }
};
