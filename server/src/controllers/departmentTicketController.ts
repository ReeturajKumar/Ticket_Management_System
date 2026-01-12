import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus, Priority, UserRole } from '../constants';
import AppError from '../utils/AppError';

/**
 * List all tickets for the department
 * GET /api/v1/department/tickets
 */
export const listDepartmentTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status, priority, assignedTo, page = '1', limit = '20' } = req.query;

    // Build filter
    const filter: any = { department: user.department };

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
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
 * Get ticket details
 * GET /api/v1/department/tickets/:id
 */
export const getTicketDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const ticket = await Ticket.findById(id).select('-__v');

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Verify ticket belongs to department
    if (ticket.department !== user.department) {
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
      throw new AppError('Please provide status', 400);
    }

    // Validate status
    if (!Object.values(TicketStatus).includes(status)) {
      throw new AppError('Invalid status', 400);
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

    // Cannot change status of CLOSED tickets
    if (ticket.status === TicketStatus.CLOSED) {
      throw new AppError('Cannot change status of closed tickets', 400);
    }

    // Update status
    ticket.status = status;

    // Set resolvedAt if status is RESOLVED
    if (status === TicketStatus.RESOLVED) {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        id: ticket._id,
        status: ticket.status,
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
      throw new AppError('Please provide priority', 400);
    }

    // Validate priority
    if (!Object.values(Priority).includes(priority)) {
      throw new AppError('Invalid priority. Valid values: LOW, MEDIUM, HIGH, CRITICAL', 400);
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

    // Update priority
    ticket.priority = priority;
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket priority updated successfully',
      data: {
        id: ticket._id,
        priority: ticket.priority,
      },
    });
  } catch (error: any) {
    throw error;
  }
};
