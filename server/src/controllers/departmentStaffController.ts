import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus, Priority, UserRole } from '../constants';
import AppError from '../utils/AppError';
import { emitTicketCreated, emitTicketStatusChanged, notifyUser, NotificationType } from '../utils/socket';

/**
 * List my assigned tickets
 * GET /api/v1/department/staff/my-tickets
 */
export const listMyTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, priority, page = '1', limit = '20' } = req.query;

    const filter: any = {
      assignedTo: user._id,
      department: user.department,
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
 * List internal tickets created by me
 */
export const listMyInternalRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, priority, page = '1', limit = '20' } = req.query;

    const filter: any = { createdBy: user._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('assignedTo', 'name email')
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
 */
export const getMyTicketDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const ticket = await Ticket.findById(id).select('-__v');

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === user._id.toString();
    const isCreator = ticket.createdBy && ticket.createdBy.toString() === user._id.toString();
    const isUnassignedInDepartment = !ticket.assignedTo && ticket.department === user.department;

    if (!isAssignee && !isCreator && !isUnassignedInDepartment) {
      throw new AppError('You do not have permission to view this ticket', 403);
    }

    if (isAssignee && !isCreator && ticket.department !== user.department) {
      throw new AppError('You do not have permission to access tickets from other departments', 403);
    }

    // Filter out internal comments for non-department staff
    const ticketObj = ticket.toObject();
    if (ticket.department !== user.department && ticketObj.comments) {
      ticketObj.comments = ticketObj.comments.filter((c: any) => !c.isInternal);
    }

    res.status(200).json({
      success: true,
      data: ticketObj,
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Update my ticket status
 */
export const updateMyTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_USER,
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ];

    if (!allowedStatuses.includes(status)) {
      throw new AppError('Invalid status selection', 400);
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (!ticket.assignedTo || ticket.assignedTo.toString() !== user._id.toString()) {
      throw new AppError('You can only update tickets assigned to you', 403);
    }

    if (ticket.department !== user.department) {
      throw new AppError('You do not have permission to modify this ticket', 403);
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new AppError('Cannot change status of closed tickets', 400);
    }

    const oldStatus = ticket.status;
    ticket.status = status;

    if (status === TicketStatus.RESOLVED) {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    emitTicketStatusChanged(
      user.department,
      ticket._id.toString(),
      ticket.subject,
      oldStatus,
      status,
      user.name,
      ticket.createdBy?.toString(),
      user._id.toString()
    );

    // NEW: Also notify the original creator if it's different from the assignee
    if (ticket.createdBy && ticket.createdBy.toString() !== user._id.toString()) {
      notifyUser(ticket.createdBy.toString(), {
        type: NotificationType.SUCCESS,
        title: 'Your Ticket Updated',
        message: `Your internal ticket "${ticket.subject}" status changed to ${status}`,
        senderId: user._id.toString(),
        data: { ticketId: ticket._id.toString() }
      });
    }

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
 */
export const addCommentToMyTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { comment } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const isSameDepartment = ticket.department === user.department;
    const isCreator = ticket.createdBy && ticket.createdBy.toString() === user._id.toString();

    if (!isSameDepartment && !isCreator) {
      throw new AppError('You do not have permission to comment on this ticket', 403);
    }

    // NEW LOGIC: If user is the creator of an internal ticket, always make their comments external
    // This allows creator and department to see the comments, while department's comments remain internal
    let actualIsInternal = req.body.isInternal === true;
    if (isCreator && !isSameDepartment) {
      // Creator from different department (internal ticket creator) - force external
      actualIsInternal = false;
    } else if (isCreator && isSameDepartment && !user.isHead) {
      // Creator from same department but not head (internal ticket creator) - force external  
      actualIsInternal = false;
    }
    // Department staff/heads can still add true internal comments
    
    ticket.comments.push({
      user: user._id as any,
      userName: actualIsInternal ? `[INTERNAL] ${user.name}` : user.name,
      comment: comment,
      isInternal: actualIsInternal,
      createdAt: new Date(),
    } as any);

    await ticket.save();

    const { emitCommentAdded, notifyDepartment, NotificationType } = require('../utils/socket');
    
    emitCommentAdded(
      ticket.department,
      ticket._id.toString(),
      ticket.subject,
      actualIsInternal ? `[INTERNAL] ${user.name}` : user.name,
      user._id.toString(),
      comment,
      actualIsInternal,
      ticket.createdBy?.toString()
    );
    
    notifyDepartment(ticket.department, {
      type: actualIsInternal ? NotificationType.WARNING : NotificationType.INFO,
      title: actualIsInternal ? 'Internal Note Added' : 'New Comment Added',
      message: `${user.name} ${actualIsInternal ? 'added an internal note to' : 'commented on'}: ${ticket.subject}`,
      senderId: user._id.toString(),
      data: { 
        ticketId: ticket._id.toString(),
        commenter: user.name,
        comment: comment.substring(0, 100) + (comment.length > 100 ? '...' : ''),
        isInternal: actualIsInternal 
      }
    });

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
 */
export const listUnassignedTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const tickets = await Ticket.find({
      department: user.department,
      assignedTo: null,
      status: TicketStatus.OPEN,
    })
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name email')
      .select('-__v')
      .lean();

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
 */
export const getMyDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

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

    const performance = totalAssigned > 0 ? Math.round((resolved / totalAssigned) * 100) : 0;

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

    const myInternalRequests = await Ticket.find({
      createdBy: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedTo', 'name email')
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
 */
export const getMyPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

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

    const performance = totalAssigned > 0 ? Math.round((resolved / totalAssigned) * 100) : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekTickets = allTickets.filter((t) => new Date(t.createdAt) >= oneWeekAgo);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const thisMonthTickets = allTickets.filter((t) => new Date(t.createdAt) >= oneMonthAgo);

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
          assigned: thisWeekTickets.length,
          resolved: thisWeekTickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
        },
        thisMonth: {
          assigned: thisMonthTickets.length,
          resolved: thisMonthTickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
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
 */
export const createInternalTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { subject, description, department, priority } = req.body;

    const ticket = await Ticket.create({
      subject,
      description,
      department,
      priority,
      status: TicketStatus.OPEN,
      createdBy: user._id,
      createdByName: user.name,
      contactEmail: user.email,
      contactName: user.name,
    });

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
