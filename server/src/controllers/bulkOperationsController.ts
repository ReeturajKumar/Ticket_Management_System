import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus, UserRole } from '../constants';
import AppError, { ErrorCode } from '../utils/AppError';
import { withTransaction } from '../utils/transaction';
import logger, { logAudit } from '../utils/logger';
import { emitBulkOperationCompleted, emitBulkOperationStarted, emitToUser, notifyUser, NotificationType, SOCKET_EVENTS } from '../utils/socket';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bulk assign tickets to team members - OPTIMIZED with bulkWrite and transactions
 * POST /api/v1/department/tickets/bulk-assign
 */
export const bulkAssignTickets = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { ticketIds, assignedTo } = req.body;
  const operationId = uuidv4();

  // Verify assignee is a team member (STAFF ONLY, NOT HEADS)
  const assignee = await User.findById(assignedTo);

  if (!assignee) {
    throw AppError.notFound('Assignee');
  }

  if (assignee.role !== UserRole.DEPARTMENT_USER || assignee.department !== user.department) {
    throw AppError.forbidden('Can only assign to team members in your department');
  }

  // NEW: Prevent assigning to department heads
  if (assignee.isHead) {
    throw AppError.forbidden('Cannot assign tickets to department heads. Please assign to staff members only.');
  }

  // Emit operation started notification
  emitBulkOperationStarted(user._id.toString(), operationId, 'bulk-assign', ticketIds.length);

  try {
    // Convert string IDs to ObjectIds
    const objectIds = ticketIds.map((id: string) => new mongoose.Types.ObjectId(id));

    // Use transaction for atomic operation (if replica set available)
    const result = await withTransaction(async (session) => {
      // Use bulkWrite for optimized batch update (single database operation)
      const bulkOps: mongoose.AnyBulkWriteOperation<any>[] = [
        {
          updateMany: {
            filter: {
              _id: { $in: objectIds },
              department: user.department,
              status: TicketStatus.OPEN,
            },
            update: {
              $set: {
                assignedTo: assignee._id,
                assignedToName: assignee.name,
                status: TicketStatus.ASSIGNED,
                updatedAt: new Date(),
              },
            },
          },
        },
        {
          updateMany: {
            filter: {
              _id: { $in: objectIds },
              department: user.department,
              status: { $ne: TicketStatus.OPEN },
            },
            update: {
              $set: {
                assignedTo: assignee._id,
                assignedToName: assignee.name,
                updatedAt: new Date(),
              },
            },
          },
        },
      ];

      return Ticket.bulkWrite(bulkOps, { session });
    }).catch(async (error) => {
      // Fallback to non-transactional update if replica set not available
      logger.warn('Transaction not available, falling back to non-transactional update', {
        error: error.message,
      });
      
      const bulkOps: mongoose.AnyBulkWriteOperation<any>[] = [
        {
          updateMany: {
            filter: {
              _id: { $in: objectIds },
              department: user.department,
              status: TicketStatus.OPEN,
            },
            update: {
              $set: {
                assignedTo: assignee._id,
                assignedToName: assignee.name,
                status: TicketStatus.ASSIGNED,
                updatedAt: new Date(),
              },
            },
          },
        },
        {
          updateMany: {
            filter: {
              _id: { $in: objectIds },
              department: user.department,
              status: { $ne: TicketStatus.OPEN },
            },
            update: {
              $set: {
                assignedTo: assignee._id,
                assignedToName: assignee.name,
                updatedAt: new Date(),
              },
            },
          },
        },
      ];

      return Ticket.bulkWrite(bulkOps);
    });

    const totalModified = result.modifiedCount;

    // NEW: Notify internal ticket creators about bulk assignments
    if (totalModified > 0) {
      // Get the tickets that were actually modified to notify their creators
      const modifiedTickets = await Ticket.find({
        _id: { $in: objectIds },
        department: user.department,
        assignedTo: assignee._id, // Now assigned to the selected user
      }).select('_id subject createdBy').lean();

      // Notify each internal ticket creator
      for (const ticket of modifiedTickets) {
        if (ticket.createdBy && ticket.createdBy.toString() !== assignee._id.toString()) {
          emitToUser(ticket.createdBy.toString(), SOCKET_EVENTS.TICKET_ASSIGNED, {
            ticketId: ticket._id.toString(),
            subject: ticket.subject,
            assigneeId: assignee._id.toString(),
            assigneeName: assignee.name,
            assignedBy: user.name,
            department: user.department,
          });
          
          notifyUser(ticket.createdBy.toString(), {
            type: NotificationType.INFO,
            title: 'Your Ticket Assigned',
            message: `Your internal ticket "${ticket.subject}" has been assigned to ${assignee.name}`,
            senderId: user._id.toString(),
            data: { ticketId: ticket._id.toString() },
          });
        }
      }
    }


    // Log audit event
    logAudit('bulk-assign', user._id.toString(), 'tickets', {
      ticketIds,
      assignedTo: assignee._id.toString(),
      modifiedCount: totalModified,
    });

    // Emit completion notification
    emitBulkOperationCompleted(user._id.toString(), operationId, {
      success: true,
      processed: totalModified,
      failed: ticketIds.length - totalModified,
      message: `Successfully assigned ${totalModified} tickets`,
    });

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${totalModified} tickets`,
      data: {
        operationId,
        assignedCount: totalModified,
        requestedCount: ticketIds.length,
        assignedTo: {
          id: assignee._id,
          name: assignee.name,
        },
      },
    });
  } catch (error: any) {
    // Emit failure notification
    emitBulkOperationCompleted(user._id.toString(), operationId, {
      success: false,
      processed: 0,
      failed: ticketIds.length,
      message: error.message,
    });
    throw error;
  }
};

/**
 * Bulk update ticket status - OPTIMIZED with transactions
 * POST /api/v1/department/tickets/bulk-status
 */
export const bulkUpdateStatus = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;
  const { ticketIds, status } = req.body;
  const operationId = uuidv4();

  // Emit operation started notification
  emitBulkOperationStarted(user._id.toString(), operationId, 'bulk-status', ticketIds.length);

  try {
    // Convert string IDs to ObjectIds
    const objectIds = ticketIds.map((id: string) => new mongoose.Types.ObjectId(id));

    // Build update object
    const updateFields: any = {
      status,
      updatedAt: new Date(),
    };

    // Set resolvedAt if status is RESOLVED
    if (status === TicketStatus.RESOLVED) {
      updateFields.resolvedAt = new Date();
    }

    // Use transaction for atomic operation
    const result = await withTransaction(async (session) => {
      return Ticket.updateMany(
        {
          _id: { $in: objectIds },
          department: user.department,
          status: { $ne: TicketStatus.CLOSED }, // Cannot update closed tickets
        },
        { $set: updateFields },
        { session }
      );
    }).catch(async () => {
      // Fallback to non-transactional update
      logger.warn('Transaction not available, falling back to non-transactional update');
      return Ticket.updateMany(
        {
          _id: { $in: objectIds },
          department: user.department,
          status: { $ne: TicketStatus.CLOSED },
        },
        { $set: updateFields }
      );
    });

    // NEW: Notify internal ticket creators about bulk status changes
    if (result.modifiedCount > 0) {
      // Get the tickets that were actually modified to notify their creators
      const modifiedTickets = await Ticket.find({
        _id: { $in: objectIds },
        department: user.department,
        status: status, // Now has the new status
      }).select('_id subject createdBy').lean();

      // Notify each internal ticket creator
      for (const ticket of modifiedTickets) {
        if (ticket.createdBy) {
          notifyUser(ticket.createdBy.toString(), {
            type: NotificationType.SUCCESS,
            title: 'Your Ticket Updated',
            message: `Your internal ticket "${ticket.subject}" status changed to ${status}`,
            senderId: user._id.toString(),
            data: { ticketId: ticket._id.toString() }
          });
        }
      }
    }


    // Log audit event
    logAudit('bulk-status-update', user._id.toString(), 'tickets', {
      ticketIds,
      newStatus: status,
      modifiedCount: result.modifiedCount,
    });

    // Emit completion notification
    emitBulkOperationCompleted(user._id.toString(), operationId, {
      success: true,
      processed: result.modifiedCount,
      failed: ticketIds.length - result.modifiedCount,
      message: `Successfully updated ${result.modifiedCount} tickets to ${status}`,
    });

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} tickets to ${status}`,
      data: {
        operationId,
        updatedCount: result.modifiedCount,
        requestedCount: ticketIds.length,
        status,
      },
    });
  } catch (error: any) {
    // Emit failure notification
    emitBulkOperationCompleted(user._id.toString(), operationId, {
      success: false,
      processed: 0,
      failed: ticketIds.length,
      message: error.message,
    });
    throw error;
  }
};
