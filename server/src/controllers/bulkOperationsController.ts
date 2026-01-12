import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus, UserRole } from '../constants';
import AppError from '../utils/AppError';

/**
 * Bulk assign tickets to team members
 * POST /api/v1/department/tickets/bulk-assign
 */
export const bulkAssignTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { ticketIds, assignedTo } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      throw new AppError('Please provide an array of ticket IDs', 400);
    }

    if (!assignedTo) {
      throw new AppError('Please provide assignedTo user ID', 400);
    }

    // Verify assignee is a team member
    const assignee = await User.findById(assignedTo);

    if (!assignee) {
      throw new AppError('Assignee not found', 404);
    }

    if (assignee.role !== UserRole.DEPARTMENT_USER || assignee.department !== user.department) {
      throw new AppError('Can only assign to team members in your department', 403);
    }

    // Find all tickets
    const tickets = await Ticket.find({
      _id: { $in: ticketIds },
      department: user.department,
    });

    if (tickets.length === 0) {
      throw new AppError('No valid tickets found', 404);
    }

    // Update all tickets
    const updatePromises = tickets.map(async (ticket) => {
      ticket.assignedTo = assignee._id as any;
      ticket.assignedToName = assignee.name;
      if (ticket.status === TicketStatus.OPEN) {
        ticket.status = TicketStatus.ASSIGNED;
      }
      return ticket.save();
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${tickets.length} tickets`,
      data: {
        assignedCount: tickets.length,
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
 * Bulk update ticket status
 * POST /api/v1/department/tickets/bulk-status
 */
export const bulkUpdateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { ticketIds, status } = req.body;

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      throw new AppError('Please provide an array of ticket IDs', 400);
    }

    if (!status) {
      throw new AppError('Please provide status', 400);
    }

    // Validate status
    if (!Object.values(TicketStatus).includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // Find all tickets
    const tickets = await Ticket.find({
      _id: { $in: ticketIds },
      department: user.department,
      status: { $ne: TicketStatus.CLOSED }, // Cannot update closed tickets
    });

    if (tickets.length === 0) {
      throw new AppError('No valid tickets found', 404);
    }

    // Update all tickets
    const updatePromises = tickets.map(async (ticket) => {
      ticket.status = status;
      if (status === TicketStatus.RESOLVED) {
        ticket.resolvedAt = new Date();
      }
      return ticket.save();
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: `Successfully updated ${tickets.length} tickets to ${status}`,
      data: {
        updatedCount: tickets.length,
        status,
      },
    });
  } catch (error: any) {
    throw error;
  }
};
