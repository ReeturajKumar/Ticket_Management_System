import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import { TicketStatus, Priority } from '../constants';
import AppError from '../utils/AppError';
import { emitTicketCreated, emitCommentAdded, notifyDepartment, NotificationType } from '../utils/socket';
import asyncHandler from '../utils/asyncHandler';
import { formatFileInfo, deleteFile } from '../utils/fileUpload';

/**
 * Create a new ticket (Request)
 */
export const createTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { subject, description, department, priority } = req.body;
  
  const attachments = req.files ? (req.files as Express.Multer.File[]).map(file => 
    formatFileInfo(file, user._id.toString())
  ) : [];

  const ticket = await Ticket.create({
    subject,
    description,
    department,
    priority: priority || Priority.MEDIUM,
    status: TicketStatus.OPEN,
    createdBy: user._id,
    createdByName: user.name || 'Unknown',
    contactEmail: user.email,
    contactName: user.name || 'Unknown',
    attachments,
  });

  emitTicketCreated(department, ticket);

  res.status(201).json({
    success: true,
    message: 'Ticket created successfully',
    data: ticket
  });
});

/**
 * List tickets created by this employee
 */
export const listMyTickets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { status, page = '1', limit = '10' } = req.query;

  const filter: any = { createdBy: user._id };
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
  const skip = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('assignedTo', 'name email')
      .select('-__v'),
    Ticket.countDocuments(filter)
  ]);

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
 */
export const getTicketDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const ticket = await Ticket.findOne({ _id: id, createdBy: user._id })
    .populate('assignedTo', 'name email')
    .populate('comments.user', 'name role')
    .select('-__v');

  if (!ticket) {
    throw new AppError('Ticket not found or access denied', 404);
  }

  // Filter out internal comments for employees
  const ticketObj = ticket.toObject();
  if (ticketObj.comments) {
    ticketObj.comments = ticketObj.comments.filter((c: any) => !c.isInternal);
  }

  res.status(200).json({
    success: true,
    data: ticketObj
  });
});

/**
 * Add comment to a ticket
 */
export const addComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const { comment } = req.body;

  const attachments = req.files ? (req.files as Express.Multer.File[]).map(file => 
    formatFileInfo(file, user._id.toString())
  ) : [];

  // Update ticket atomically and check ownership in one go
  const ticket = await Ticket.findOneAndUpdate(
    { _id: id, createdBy: user._id },
    { 
      $push: { 
        comments: {
          user: user._id,
          userName: user.name || 'User',
          comment,
          attachments,
          createdAt: new Date()
        } 
      }
    },
    { new: true, runValidators: true }
  );

  if (!ticket) {
    throw new AppError('Ticket not found or access denied', 404);
  }

  // Broadcast and Notify
  emitCommentAdded(
    ticket.department,
    ticket._id.toString(),
    ticket.subject,
    user.name || 'User',
    user._id.toString(),
    comment,
    false
  );

  notifyDepartment(ticket.department, {
    type: NotificationType.INFO,
    title: 'User Reply Received',
    message: `${user.name || 'A user'} replied to ticket: ${ticket.subject}`,
    senderId: user._id.toString(),
    data: { 
      ticketId: ticket._id.toString(),
      commenter: user.name || 'User',
      comment: comment.substring(0, 50) + (comment.length > 50 ? '...' : '')
    }
  });

  res.status(200).json({
    success: true,
    message: 'Comment added successfully'
  });
});

/**
 * Get dashboard statistics with Aggregation
 */
export const getDashboardStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const statsPipeline = await Ticket.aggregate([
    {
      $facet: {
        counts: [
          { $match: { createdBy: user._id } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } },
              inProgress: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.IN_PROGRESS] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.REOPENED, TicketStatus.WAITING_FOR_USER]] }, 1, 0] } },
            }
          }
        ],
        recent: [
          { $match: { createdBy: user._id } },
          { $sort: { updatedAt: -1 } },
          { $limit: 5 },
          { $project: { subject: 1, status: 1, priority: 1, updatedAt: 1 } }
        ],
        weeklyTrends: [
          { 
            $match: { 
              createdBy: user._id, 
              createdAt: { $gte: sevenDaysAgo } 
            } 
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              total: { $sum: 1 },
              resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } }
            }
          },
          { $sort: { _id: 1 } }
        ],
        monthlyTrends: [
          { 
            $match: { 
              createdBy: user._id, 
              createdAt: { $gte: thirtyDaysAgo } 
            } 
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              total: { $sum: 1 },
              resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ]);

  const facetResult = statsPipeline[0];
  const stats = facetResult.counts[0] || { total: 0, resolved: 0, inProgress: 0, pending: 0 };
  const recentTickets = facetResult.recent || [];
  const weeklyTrends = facetResult.weeklyTrends || [];
  const monthlyTrends = facetResult.monthlyTrends || [];
  
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.status(200).json({
    success: true,
    timestamp: Date.now(),
    data: {
      stats,
      recentTickets,
      weeklyTrends,
      monthlyTrends
    }
  });
});

/**
 * Get weekly ticket trends (last 7 days)
 */
export const getWeeklyStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const trends = await Ticket.aggregate([
    { 
      $match: { 
        createdBy: user._id, 
        createdAt: { $gte: sevenDaysAgo } 
      } 
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: trends
  });
});

/**
 * Get monthly ticket trends (last 30 days)
 */
export const getMonthlyStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const trends = await Ticket.aggregate([
    { 
      $match: { 
        createdBy: user._id, 
        createdAt: { $gte: thirtyDaysAgo } 
      } 
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: trends
  });
});

/**
 * Delete a ticket and its attachments
 */
export const deleteTicket = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const ticket = await Ticket.findOne({ _id: id, createdBy: user._id });

  if (!ticket) {
    throw new AppError('Ticket not found or access denied', 404);
  }

  // Soft/Hard cleanup: Collect all file paths
  const filePaths: string[] = [];
  ticket.attachments?.forEach(f => filePaths.push(f.path));
  ticket.comments?.forEach(c => c.attachments?.forEach(f => filePaths.push(f.path)));

  // Delete from DB first
  await Ticket.deleteOne({ _id: id });

  // Cleanup files asynchronously
  filePaths.forEach(path => deleteFile(path));

  res.status(200).json({
    success: true,
    message: 'Ticket and associated files deleted'
  });
});
