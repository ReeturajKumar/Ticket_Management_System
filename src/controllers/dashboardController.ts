import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import { TicketStatus, Priority, Department } from '../constants';

/**
 * Get Student Dashboard Statistics
 * GET /api/v1/dashboard/student
 */
export const getStudentDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Get all tickets for the user
    const allTickets = await Ticket.find({ createdBy: userId });

    // Calculate statistics
    const stats = {
      totalTickets: allTickets.length,
      
      // Status breakdown
      openTickets: allTickets.filter(t => t.status === TicketStatus.OPEN).length,
      inProgressTickets: allTickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
      resolvedTickets: allTickets.filter(t => t.status === TicketStatus.RESOLVED).length,
      closedTickets: allTickets.filter(t => t.status === TicketStatus.CLOSED).length,
      reopenedTickets: allTickets.filter(t => t.status === TicketStatus.REOPENED).length,

      // Priority breakdown
      lowPriority: allTickets.filter(t => t.priority === Priority.LOW).length,
      mediumPriority: allTickets.filter(t => t.priority === Priority.MEDIUM).length,
      highPriority: allTickets.filter(t => t.priority === Priority.HIGH).length,
      criticalPriority: allTickets.filter(t => t.priority === Priority.CRITICAL).length,

      // Department breakdown
      departmentStats: {
        PLACEMENT: allTickets.filter(t => t.department === Department.PLACEMENT).length,
        OPERATIONS: allTickets.filter(t => t.department === Department.OPERATIONS).length,
        TRAINING: allTickets.filter(t => t.department === Department.TRAINING).length,
        FINANCE: allTickets.filter(t => t.department === Department.FINANCE).length,
      },
    };

    // Get recent tickets (last 5)
    const recentTickets = await Ticket.find({ createdBy: userId })
      .select('subject status priority department createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats,
        recentTickets: recentTickets.map(ticket => ({
          id: ticket._id,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          department: ticket.department,
          createdAt: ticket.createdAt,
        })),
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Ticket Analytics (Monthly trend)
 * GET /api/v1/dashboard/student/analytics
 */
export const getTicketAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Get tickets from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const tickets = await Ticket.find({
      createdBy: userId,
      createdAt: { $gte: sixMonthsAgo },
    }).select('createdAt status');

    // Group by month
    const monthlyData: { [key: string]: { created: number; resolved: number } } = {};

    tickets.forEach(ticket => {
      const monthKey = ticket.createdAt.toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { created: 0, resolved: 0 };
      }
      
      monthlyData[monthKey].created++;
      
      if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
        monthlyData[monthKey].resolved++;
      }
    });

    // Convert to array format
    const analytics = Object.keys(monthlyData)
      .sort()
      .map(month => ({
        month,
        created: monthlyData[month].created,
        resolved: monthlyData[month].resolved,
      }));

    res.status(200).json({
      success: true,
      data: {
        analytics,
      },
    });
  } catch (error: any) {
    throw error;
  }
};
