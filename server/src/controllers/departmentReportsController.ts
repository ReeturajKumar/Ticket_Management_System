import { Request, Response } from 'express';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { TicketStatus, Priority, UserRole } from '../constants';
import AppError from '../utils/AppError';
import { generateCSV, generatePDF, generateExcel, cleanupOldExports } from '../utils/exportUtils';
import fs from 'fs';

/**
 * Generate summary report for the department
 * GET /api/v1/department/reports/summary
 */
export const getSummaryReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { startDate, endDate, period } = req.query;

    // Calculate date range
    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else if (period) {
      end = new Date();
      start = new Date();

      switch (period) {
        case 'week':
          start.setDate(start.getDate() - 7);
          break;
        case 'month':
          start.setMonth(start.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(start.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start.setDate(start.getDate() - 7); // Default to week
      }
    } else {
      // Default to current month
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    // Get all tickets in the date range for this department
    const tickets = await Ticket.find({
      department: user.department,
      createdAt: { $gte: start, $lte: end },
    });

    // Calculate summary statistics
    const totalTickets = tickets.length;
    const resolved = tickets.filter((t) => t.status === TicketStatus.RESOLVED).length;
    const open = tickets.filter((t) => t.status === TicketStatus.OPEN).length;
    const inProgress = tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length;

    // Calculate average resolution time
    const resolvedTickets = tickets.filter((t) => t.resolvedAt);
    let avgResolutionTime = '0 hours';

    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        const createdAt = new Date(ticket.createdAt).getTime();
        const resolvedAt = new Date(ticket.resolvedAt!).getTime();
        return sum + (resolvedAt - createdAt);
      }, 0);

      const avgTimeMs = totalTime / resolvedTickets.length;
      const avgTimeHours = (avgTimeMs / (1000 * 60 * 60)).toFixed(1);
      avgResolutionTime = `${avgTimeHours} hours`;
    }

    // Calculate SLA compliance (assuming 24-hour SLA)
    const slaCompliantTickets = resolvedTickets.filter((ticket) => {
      const createdAt = new Date(ticket.createdAt).getTime();
      const resolvedAt = new Date(ticket.resolvedAt!).getTime();
      const timeDiff = resolvedAt - createdAt;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      return hoursDiff <= 24;
    });

    const slaCompliance =
      resolvedTickets.length > 0
        ? Math.round((slaCompliantTickets.length / resolvedTickets.length) * 100)
        : 0;

    // Group by priority
    const byPriority: any = {};
    Object.values(Priority).forEach((priority) => {
      byPriority[priority] = tickets.filter((t) => t.priority === priority).length;
    });

    // Group by status
    const byStatus: any = {};
    Object.values(TicketStatus).forEach((status) => {
      byStatus[status] = tickets.filter((t) => t.status === status).length;
    });

    // Get team performance
    const teamMembers = await User.find({
      role: UserRole.DEPARTMENT_USER,
      department: user.department,
      isApproved: true,
      isHead: false,
    }).select('name');

    const teamPerformance = await Promise.all(
      teamMembers.map(async (member) => {
        const memberTickets = tickets.filter(
          (t) => t.assignedTo && t.assignedTo.toString() === member._id.toString()
        );

        const memberResolved = memberTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;

        // Calculate average resolution time for this member
        const memberResolvedTickets = memberTickets.filter((t) => t.resolvedAt);
        let memberAvgTime = '0 hours';

        if (memberResolvedTickets.length > 0) {
          const totalTime = memberResolvedTickets.reduce((sum, ticket) => {
            const createdAt = new Date(ticket.createdAt).getTime();
            const resolvedAt = new Date(ticket.resolvedAt!).getTime();
            return sum + (resolvedAt - createdAt);
          }, 0);

          const avgTimeMs = totalTime / memberResolvedTickets.length;
          const avgTimeHours = (avgTimeMs / (1000 * 60 * 60)).toFixed(1);
          memberAvgTime = `${avgTimeHours} hours`;
        }

        return {
          name: member.name,
          resolved: memberResolved,
          avgTime: memberAvgTime,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalTickets,
          resolved,
          open,
          inProgress,
          avgResolutionTime,
          slaCompliance: `${slaCompliance}%`,
        },
        byPriority,
        byStatus,
        teamPerformance,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Export department data in CSV or PDF format
 * GET /api/v1/department/reports/export
 */
export const exportReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { format, type, startDate, endDate } = req.query;

    // Calculate date range
    let start: Date = new Date();
    start.setMonth(start.getMonth() - 1);
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    }

    const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const extension = format === 'excel' ? 'xlsx' : format;
    const fileName = `${user.department.toLowerCase()}-${type}-${dateStr}.${extension}`;

    let filePath: string;

    if (format === 'csv' || format === 'excel') {
      const generator = format === 'excel' ? generateExcel : generateCSV;

      // Generate CSV or Excel
      if (type === 'tickets') {
        const tickets = await Ticket.find({
          department: user.department,
          createdAt: { $gte: start, $lte: end },
        }).select('subject status priority createdBy createdByName assignedToName createdAt resolvedAt');

        const data = tickets.map((t) => ({
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          createdBy: t.createdByName,
          assignedTo: t.assignedToName || 'Unassigned',
          createdAt: new Date(t.createdAt).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          resolvedAt: t.resolvedAt ? new Date(t.resolvedAt).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }) : 'N/A',
        }));

        filePath = await generator(
          data,
          [
            { id: 'subject', title: 'Subject' },
            { id: 'status', title: 'Status' },
            { id: 'priority', title: 'Priority' },
            { id: 'createdBy', title: 'Created By' },
            { id: 'assignedTo', title: 'Assigned To' },
            { id: 'createdAt', title: 'Created At' },
            { id: 'resolvedAt', title: 'Resolved At' },
          ],
          fileName
        );
      } else if (type === 'team') {
        const teamMembers = await User.find({
          role: UserRole.DEPARTMENT_USER,
          department: user.department,
          isApproved: true,
        }).select('name email isHead');

        const data = await Promise.all(
          teamMembers.map(async (member) => {
            const tickets = await Ticket.find({
              assignedTo: member._id,
              department: user.department,
            });
            const resolved = tickets.filter((t) => t.status === TicketStatus.RESOLVED).length;

            return {
              name: member.name,
              email: member.email,
              role: member.isHead ? 'Head' : 'Staff',
              totalAssigned: tickets.length,
              resolved,
            };
          })
        );

        filePath = await generator(
          data,
          [
            { id: 'name', title: 'Name' },
            { id: 'email', title: 'Email' },
            { id: 'role', title: 'Role' },
            { id: 'totalAssigned', title: 'Total Assigned' },
            { id: 'resolved', title: 'Resolved' },
          ],
          fileName
        );
      } else {
        // Handle summary type for Excel/CSV
        const tickets = await Ticket.find({
          department: user.department,
          createdAt: { $gte: start, $lte: end },
        });

        const summary = {
          totalTickets: tickets.length,
          resolved: tickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
          open: tickets.filter((t) => t.status === TicketStatus.OPEN).length,
          inProgress: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
        };

        const byPriority: any = {};
        Object.values(Priority).forEach((priority) => {
          byPriority[priority] = tickets.filter((t) => t.priority === priority).length;
        });

        const byStatus: any = {};
        Object.values(TicketStatus).forEach((status) => {
          byStatus[status] = tickets.filter((t) => t.status === status).length;
        });

        const data = [
          { category: 'General Summary', label: 'Total Tickets', count: summary.totalTickets },
          { category: 'General Summary', label: 'Resolved', count: summary.resolved },
          { category: 'General Summary', label: 'Open', count: summary.open },
          { category: 'General Summary', label: 'In Progress', count: summary.inProgress },
          { category: '', label: '', count: '' },
          ...Object.entries(byPriority).map(([p, count]) => ({ category: 'By Priority', label: p, count })),
          { category: '', label: '', count: '' },
          ...Object.entries(byStatus).map(([s, count]) => ({ category: 'By Status', label: s, count }))
        ];

        filePath = await generator(
          data,
          [
            { id: 'category', title: 'Category' },
            { id: 'label', title: 'Metric' },
            { id: 'count', title: 'Count' },
          ],
          fileName
        );
      }
    } else {
      // Generate PDF
      const tickets = await Ticket.find({
        department: user.department,
        createdAt: { $gte: start, $lte: end },
      });

      const summary = {
        totalTickets: tickets.length,
        resolved: tickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
        open: tickets.filter((t) => t.status === TicketStatus.OPEN).length,
        inProgress: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
      };

      const byPriority: any = {};
      Object.values(Priority).forEach((priority) => {
        byPriority[priority] = tickets.filter((t) => t.priority === priority).length;
      });

      const byStatus: any = {};
      Object.values(TicketStatus).forEach((status) => {
        byStatus[status] = tickets.filter((t) => t.status === status).length;
      });

      const teamMembers = await User.find({
        role: UserRole.DEPARTMENT_USER,
        department: user.department,
        isApproved: true,
        isHead: false,
      }).select('name');

      const teamPerformance = await Promise.all(
        teamMembers.map(async (member) => {
          const memberTickets = tickets.filter(
            (t) => t.assignedTo && t.assignedTo.toString() === member._id.toString()
          );
          const resolved = memberTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;

          return {
            name: member.name,
            resolved,
            avgTime: 'N/A',
          };
        })
      );

      filePath = await generatePDF(
        `${user.department} Department Report`,
        {
          summary,
          byPriority,
          byStatus,
          teamPerformance,
        },
        fileName
      );
    }

    // Stream the file for download
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('File download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Could not download file' });
        }
      }
      
      // Cleanup file after download is complete/failed to save space
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.error('Error cleaning up export file:', cleanupErr);
      }
    });
  } catch (error: any) {
    throw error;
  }
};
