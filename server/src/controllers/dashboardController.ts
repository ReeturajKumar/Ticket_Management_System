import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import { TicketStatus, Priority, Department } from '../constants';

/**
 * Get Student Dashboard Overview
 * GET /api/v1/dashboard/student/overview
 */
export const getStudentOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Get all tickets for the user
    const allTickets = await Ticket.find({ createdBy: userId });

    // Calculate summary statistics
    const summary = {
      totalTickets: allTickets.length,
      openTickets: allTickets.filter(t => t.status === TicketStatus.OPEN).length,
      inProgressTickets: allTickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
      resolvedTickets: allTickets.filter(t => t.status === TicketStatus.RESOLVED).length,
      closedTickets: allTickets.filter(t => t.status === TicketStatus.CLOSED).length,
      reopenedTickets: allTickets.filter(t => t.status === TicketStatus.REOPENED).length,
    };

    // Get recent tickets (last 5)
    const recentTickets = await Ticket.find({ createdBy: userId })
      .select('subject status priority department createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        summary,
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
 * Get Department-wise Statistics
 * GET /api/v1/dashboard/student/departments
 */
export const getDepartmentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Get all tickets for the user
    const allTickets = await Ticket.find({ createdBy: userId });

    // Calculate stats for each department
    const departments = Object.values(Department).map(dept => {
      const deptTickets = allTickets.filter(t => t.department === dept);
      
      return {
        department: dept,
        total: deptTickets.length,
        open: deptTickets.filter(t => t.status === TicketStatus.OPEN).length,
        inProgress: deptTickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
        resolved: deptTickets.filter(t => t.status === TicketStatus.RESOLVED).length,
        closed: deptTickets.filter(t => t.status === TicketStatus.CLOSED).length,
        reopened: deptTickets.filter(t => t.status === TicketStatus.REOPENED).length,
        // Priority breakdown per department
        lowPriority: deptTickets.filter(t => t.priority === Priority.LOW).length,
        mediumPriority: deptTickets.filter(t => t.priority === Priority.MEDIUM).length,
        highPriority: deptTickets.filter(t => t.priority === Priority.HIGH).length,
        criticalPriority: deptTickets.filter(t => t.priority === Priority.CRITICAL).length,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        departments,
        totalTickets: allTickets.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Monthly Statistics
 * GET /api/v1/dashboard/student/monthly
 */
export const getMonthlyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // Get tickets from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const tickets = await Ticket.find({
      createdBy: userId,
      createdAt: { $gte: sixMonthsAgo },
    }).select('createdAt status department priority');

    // Group by month
    const monthlyData: { [key: string]: any } = {};

    tickets.forEach(ticket => {
      const monthKey = ticket.createdAt.toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          created: 0,
          resolved: 0,
          byDepartment: {
            PLACEMENT: 0,
            OPERATIONS: 0,
            TRAINING: 0,
            FINANCE: 0,
          },
          byStatus: {
            OPEN: 0,
            IN_PROGRESS: 0,
            RESOLVED: 0,
            CLOSED: 0,
            REOPENED: 0,
          },
        };
      }
      
      monthlyData[monthKey].created++;
      
      if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
        monthlyData[monthKey].resolved++;
      }

      // Count by department
      monthlyData[monthKey].byDepartment[ticket.department]++;

      // Count by status
      monthlyData[monthKey].byStatus[ticket.status]++;
    });

    // Convert to array format and sort by month
    const monthly = Object.keys(monthlyData)
      .sort()
      .map(month => ({
        month,
        created: monthlyData[month].created,
        resolved: monthlyData[month].resolved,
        byDepartment: monthlyData[month].byDepartment,
        byStatus: monthlyData[month].byStatus,
      }));

    res.status(200).json({
      success: true,
      data: {
        monthly,
        totalMonths: monthly.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};
