import { Request, Response, NextFunction } from 'express';
import Ticket from '../models/Ticket';
import AppError from '../utils/AppError';

/**
 * Ownership Verification Middleware
 * Ensures user can only access their own tickets
 */
export const verifyTicketOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ticketId = req.params.id;
    const userId = req.user!.userId;

    // Find ticket
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    // Check ownership
    if (ticket.createdBy.toString() !== userId) {
      throw new AppError('You do not have permission to access this ticket', 403);
    }

    // Attach ticket to request for use in controller
    (req as any).ticket = ticket;

    next();
  } catch (error: any) {
    next(error);
  }
};
