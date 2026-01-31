import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus, Priority } from '../constants';
import AppError from '../utils/AppError';
import { emitTicketCreated } from '../utils/socket';
import { invalidateDepartmentCache } from '../utils/cache';
import asyncHandler from '../utils/asyncHandler';

/**
 * Create a new ticket (Request)
 * POST /api/v1/employee/tickets
 */
export const createTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { subject, description, department, priority } = req.body;

  if (!subject || !description || !department) {
    throw new AppError('Please provide subject, description and target department', 400);
  }

  const ticket = await Ticket.create({
    subject,
    description,
    department, // Target department (e.g., TECHNICAL_SUPPORT, HR)
    priority: priority || Priority.MEDIUM,
    status: TicketStatus.OPEN,
    createdBy: user._id,
    createdByName: user.name,
    contactEmail: user.email,
    contactName: user.name,
  });

  // Invalidate cache for the target department to update their dashboard
  invalidateDepartmentCache(department);

  // Notify the target department
  emitTicketCreated(department, ticket);

  res.status(201).json({
    success: true,
    message: 'Ticket created successfully',
    data: ticket
  });
});

/**
 * List tickets created by this employee
 * GET /api/v1/employee/tickets
 */
export const listMyTickets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { status, page = '1', limit = '10' } = req.query;

  const filter: any = { createdBy: user._id };
  if (status) filter.status = status;

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
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

/**
 * Get ticket details
 * GET /api/v1/employee/tickets/:id
 */
export const getTicketDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { id } = req.params;

  const ticket = await Ticket.findById(id).select('-__v');

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

// Security: Only the creator can view their own non-assigned tickets
  if (!ticket.createdBy || ticket.createdBy.toString() !== user._id.toString()) {
    throw new AppError('You do not have permission to view this ticket', 403);
  }

  res.status(200).json({
    success: true,
    data: ticket
  });
});

/**
 * Add comment to a ticket
 * POST /api/v1/employee/tickets/:id/comments
 */
export const addComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { id } = req.params;
  const { comment } = req.body;

  if (!comment) {
    throw new AppError('Comment text is required', 400);
  }

  const ticket = await Ticket.findById(id);

  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

if (!ticket.createdBy || ticket.createdBy.toString() !== user._id.toString()) {
    throw new AppError('Permission denied', 403);
  }

  ticket.comments.push({
    user: user._id,
    userName: user.name,
    comment,
    createdAt: new Date()
  } as any);

  await ticket.save();

  res.status(200).json({
    success: true,
    message: 'Comment added successfully'
  });
});

/**
 * Get dashboard statistics
 * GET /api/v1/employee/dashboard-stats
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;

  const allTickets = await Ticket.find({ createdBy: user._id });

  const total = allTickets.length;
  const resolved = allTickets.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;
  const inProgress = allTickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length;
  const pending = allTickets.filter(t => t.status === TicketStatus.OPEN || t.status === TicketStatus.ASSIGNED).length;

  // Recent activity
  const recentTickets = await Ticket.find({ createdBy: user._id })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('subject status priority updatedAt');

  res.status(200).json({
    success: true,
    data: {
      stats: {
        total,
        resolved,
        inProgress,
        pending
      },
      recentTickets
    }
  });
});
