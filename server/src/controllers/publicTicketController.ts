import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import { Department, Priority, TicketStatus, PUBLIC_DEPARTMENTS } from '../constants';
import AppError from '../utils/AppError';
import { emitTicketCreated } from '../utils/socket';
import { formatFileInfo } from '../utils/fileUpload';

/**
 * Public Endpoint: Create a ticket without authentication
 */
export const createPublicTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      name, 
      email, 
      subject, 
      description, 
      department, 
      priority 
    } = req.body;

    const attachments = req.files ? (req.files as Express.Multer.File[]).map(file => {
      const info = formatFileInfo(file, ''); // No user ID for guest
      return {
        ...info,
        uploadedBy: undefined // Explicitly null/undefined for guest
      };
    }) : [];

    const ticket = await Ticket.create({
      subject,
      description,
      department,
      priority: priority || Priority.MEDIUM,
      status: TicketStatus.OPEN,
      contactName: name,
      contactEmail: email?.toLowerCase(), // Safe call
      createdByName: name, 
      attachments,
    });

    emitTicketCreated(department, ticket);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully.',
      data: {
        ticket: {
          id: ticket._id,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
          ticketId: ticket._id
        }
      }
    });

  } catch (error: any) {
    throw error;
  }
};

/**
 * Public Endpoint: Get configuration (departments, priorities)
 */
export const getPublicConfig = async (req: Request, res: Response): Promise<void> => {
  const configData = {
    departments: PUBLIC_DEPARTMENTS,
    priorities: Object.values(Priority),
  };

  res.status(200).json({
    success: true,
    data: configData,
  });
};
