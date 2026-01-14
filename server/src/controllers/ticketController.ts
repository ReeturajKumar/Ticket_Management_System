import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus } from '../constants';
import AppError from '../utils/AppError';

/**
 * Create new ticket
 * POST /api/v1/tickets
 */
export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, description, department, priority } = req.body;
    const userId = req.user!.userId;

    // Validate required fields
    if (!subject || !description || !department) {
      throw new AppError('Please provide subject, description, and department', 400);
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Create ticket
    const ticket = await Ticket.create({
      subject,
      description,
      department,
      priority: priority || 'MEDIUM',
      createdBy: userId,
      createdByName: user.name,
      status: TicketStatus.OPEN,
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: {
        ticket: {
          id: ticket._id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          department: ticket.department,
          createdAt: ticket.createdAt,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * List user's own tickets
 * GET /api/v1/tickets
 */
export const listTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { status, priority, department } = req.query;

    // Build filter
    const filter: any = { createdBy: userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;

    // Get tickets
    const tickets = await Ticket.find(filter)
      .select('subject status priority department createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        tickets: tickets.map(ticket => ({
          id: ticket._id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          department: ticket.department,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        })),
        count: tickets.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get ticket details
 * GET /api/v1/tickets/:id
 */
export const getTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    // Ticket is already attached by ownership middleware
    const ticket = (req as any).ticket;

    res.status(200).json({
      success: true,
      data: {
        ticket: {
          id: ticket._id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          department: ticket.department,
          createdBy: ticket.createdByName,
          assignedTo: ticket.assignedToName || null,
          comments: ticket.comments.map((comment: any) => ({
            userName: comment.userName,
            comment: comment.comment,
            createdAt: comment.createdAt,
          })),
          reopenHistory: ticket.reopenHistory.map((history: any) => ({
            reopenedBy: history.reopenedByName,
            reason: history.reason,
            reopenedAt: history.reopenedAt,
          })),
          rating: (ticket.rating && ticket.rating.stars) ? {
            stars: ticket.rating.stars,
            comment: ticket.rating.comment,
            ratedBy: ticket.rating.ratedBy,
            ratedByName: ticket.rating.ratedByName,
            ratedAt: ticket.rating.ratedAt,
          } : null,
          attachments: ticket.attachments ? ticket.attachments.map((attachment: any) => ({
            filename: attachment.filename,
            originalName: attachment.originalName,
            size: attachment.size,
            mimeType: attachment.mimeType,
            uploadedAt: attachment.uploadedAt,
          })) : [],
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Update ticket
 * PUT /api/v1/tickets/:id
 */
export const updateTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, description, priority } = req.body;
    const ticket = (req as any).ticket;

    // Validate at least one field
    if (!subject && !description && !priority) {
      throw new AppError('Please provide subject, description, or priority to update', 400);
    }

    // Check if ticket can be updated (only OPEN or REOPENED)
    if (ticket.status !== TicketStatus.OPEN && ticket.status !== TicketStatus.REOPENED) {
      throw new AppError(`Cannot update ticket with status ${ticket.status}. Only OPEN or REOPENED tickets can be updated.`, 400);
    }

    // Update fields
    if (subject) ticket.subject = subject;
    if (description) ticket.description = description;
    if (priority) ticket.priority = priority;

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket updated successfully',
      data: {
        ticket: {
          id: ticket._id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          department: ticket.department,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Add comment to ticket
 * POST /api/v1/tickets/:id/comments
 */
export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { comment } = req.body;
    const userId = req.user!.userId;
    const ticket = (req as any).ticket;

    // Validate comment
    if (!comment || comment.trim().length === 0) {
      throw new AppError('Please provide a comment', 400);
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Add comment
    ticket.comments.push({
      user: userId,
      userName: user.name,
      comment: comment.trim(),
      createdAt: new Date(),
    });

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment: {
          userName: user.name,
          comment: comment.trim(),
          createdAt: new Date(),
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Reopen closed ticket
 * POST /api/v1/tickets/:id/reopen
 */
export const reopenTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const userId = req.user!.userId;
    const ticket = (req as any).ticket;

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      throw new AppError('Please provide a reason for reopening', 400);
    }

    // Check if ticket is closed
    if (ticket.status !== TicketStatus.CLOSED) {
      throw new AppError('Only CLOSED tickets can be reopened', 400);
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update status to REOPENED
    ticket.status = TicketStatus.REOPENED;

    // Add to reopen history
    ticket.reopenHistory.push({
      reopenedBy: userId,
      reopenedByName: user.name,
      reason: reason.trim(),
      reopenedAt: new Date(),
    });

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket reopened successfully',
      data: {
        ticket: {
          id: ticket._id,
          subject: ticket.subject,
          status: ticket.status,
          reopenedAt: new Date(),
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};
