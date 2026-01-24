import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import { Department, Priority, TicketStatus, PUBLIC_DEPARTMENTS } from '../constants';
import { sendTicketConfirmationEmail } from '../utils/email';
import AppError from '../utils/AppError';
import { invalidateDepartmentCache, cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '../utils/cache';
import { emitTicketCreated } from '../utils/socket';

/**
 * Public Endpoint: Create a ticket without authentication
 * POST /api/v1/public/tickets
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

    // Validate required fields
    if (!name || !email || !subject || !description || !department) {
      throw new AppError('Please provide all required fields', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Please provide a valid email address', 400);
    }

    // Validate department (must be public)
    if (!PUBLIC_DEPARTMENTS.includes(department as Department)) {
      throw new AppError('Invalid department selection', 400);
    }

    // Create ticket
    const ticket = await Ticket.create({
      subject,
      description,
      department,
      priority: priority || Priority.MEDIUM,
      status: TicketStatus.OPEN,
      // Guest info
      contactName: name,
      contactEmail: email.toLowerCase(),
      // Since there is no authenticated user, we don't set createdBy
      // However, we set createdByName to the guest name for display purposes
      createdByName: name, 
    });

    // Invalidate department cache since a new ticket was created
    invalidateDepartmentCache(department);

    // Emit real-time notification to department dashboard
    emitTicketCreated(department, ticket);

    // Send confirmation email
    // We don't await this to prevent blocking the response
    sendTicketConfirmationEmail(email, name, ticket._id.toString(), subject)
      .catch(err => console.error('Failed to send confirmation email:', err));

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully. Check your email for confirmation.',
      data: {
        ticket: {
          id: ticket._id,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
          ticketId: ticket._id // Duplicate for clarity
        }
      }
    });

  } catch (error: any) {
    throw error;
  }
};

/**
 * Public Endpoint: Get configuration (departments, priorities) - CACHED
 * GET /api/v1/public/config
 */
export const getPublicConfig = async (req: Request, res: Response): Promise<void> => {
  // Check cache first (this rarely changes)
  const cachedConfig = cacheGet(CACHE_KEYS.PUBLIC_CONFIG);
  if (cachedConfig) {
    res.status(200).json({
      success: true,
      data: cachedConfig,
      cached: true,
    });
    return;
  }

  const configData = {
    departments: PUBLIC_DEPARTMENTS,
    priorities: Object.values(Priority),
  };

  // Cache for 1 hour
  cacheSet(CACHE_KEYS.PUBLIC_CONFIG, configData, CACHE_TTL.PUBLIC_CONFIG);

  res.status(200).json({
    success: true,
    data: configData,
  });
};

