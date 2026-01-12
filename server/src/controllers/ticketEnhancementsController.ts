import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import { TicketStatus } from '../constants';
import AppError from '../utils/AppError';
import { formatFileInfo } from '../utils/fileUpload';

/**
 * Upload attachment to ticket
 * POST /api/v1/tickets/:id/attachments
 */
export const uploadTicketAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      throw new AppError('Please upload a file', 400);
    }

    // Find ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Verify ownership
    if (ticket.createdBy.toString() !== user.userId) {
      throw new AppError('You can only upload attachments to your own tickets', 403);
    }

    // Add attachment
    const attachment = formatFileInfo(file, user.userId);
    ticket.attachments.push(attachment as any);
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        attachment: {
          filename: attachment.filename,
          originalName: attachment.originalName,
          size: attachment.size,
          mimeType: attachment.mimeType,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Rate a ticket
 * POST /api/v1/tickets/:id/rate
 */
export const rateTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { stars, comment } = req.body;

    if (!stars || stars < 1 || stars > 5) {
      throw new AppError('Please provide a rating between 1 and 5 stars', 400);
    }

    // Find ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Verify ownership
    if (ticket.createdBy.toString() !== user.userId) {
      throw new AppError('You can only rate your own tickets', 403);
    }

    // Check if ticket is resolved or closed
    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      throw new AppError('You can only rate resolved or closed tickets', 400);
    }

    // Check if already rated
    if (ticket.rating && ticket.rating.ratedBy) {
      throw new AppError('You have already rated this ticket', 400);
    }

    // Add rating
    ticket.rating = {
      stars,
      comment: comment || '',
      ratedBy: user.userId as any,
      ratedByName: user.name || 'Student',
      ratedAt: new Date(),
    };

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: {
        rating: {
          stars,
          comment,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};
