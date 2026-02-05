import { Request, Response } from 'express';
import User from '../models/User';
import Ticket from '../models/Ticket';
import { UserRole, Department, TicketStatus, Priority } from '../constants';
import { generateExcel } from '../utils/exportUtils';
import fs from 'fs';

/**
 * Get Comprehensive Analytics Overview
 * GET /api/v1/admin/analytics/overview
 */
export const getAnalyticsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30d', startDate: queryStart, endDate: queryEnd } = req.query;

    // Calculate date range
    let startDate = new Date();
    let endDate = new Date();
    
    if (period === 'custom' && queryStart && queryEnd) {
      startDate = new Date(queryStart as string);
      endDate = new Date(queryEnd as string);
    } else {
      const daysMap: Record<string, number> = {
        '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365
      };
      const days = daysMap[period as string] || 30;
      startDate.setDate(startDate.getDate() - days);
    }
    startDate.setHours(0, 0, 0, 0);
    // End date should be end of today to include today's tickets
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    // Get all metrics in parallel
    const [
      // Ticket counts
      totalTickets,
      openTickets,
      assignedTickets,
      inProgressTickets,
      waitingTickets,
      resolvedTickets,
      closedTickets,
      
      // Priority counts
      criticalTickets,
      highTickets,
      mediumTickets,
      lowTickets,
      
      // User counts
      totalUsers,
      totalDeptUsers,
      totalEmployees,
      
      // Average resolution time
      avgResolutionTime,
      
      // First response time (tickets assigned within SLA)
      ticketsByDepartment,
      ticketsByPriority,
      dailyTrends,
      hourlyDistribution,
      topPerformers,
    ] = await Promise.all([
      Ticket.countDocuments(dateFilter),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.OPEN }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.ASSIGNED }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.IN_PROGRESS }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.WAITING_FOR_USER }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.RESOLVED }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.CLOSED }),
      
      Ticket.countDocuments({ ...dateFilter, priority: Priority.CRITICAL }),
      Ticket.countDocuments({ ...dateFilter, priority: Priority.HIGH }),
      Ticket.countDocuments({ ...dateFilter, priority: Priority.MEDIUM }),
      Ticket.countDocuments({ ...dateFilter, priority: Priority.LOW }),
      
      User.countDocuments({ createdAt: { $lte: endDate } }),
      User.countDocuments({ role: UserRole.DEPARTMENT_USER, createdAt: { $lte: endDate } }),
      User.countDocuments({ role: UserRole.EMPLOYEE, createdAt: { $lte: endDate } }),
      
      // Average resolution time calculation
      Ticket.aggregate([
        { 
          $match: { 
            ...dateFilter, 
            resolvedAt: { $ne: null },
            status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
          } 
        },
        {
          $project: {
            resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$resolutionTime' },
            minTime: { $min: '$resolutionTime' },
            maxTime: { $max: '$resolutionTime' }
          }
        }
      ]),
      
      // Tickets by department
      Ticket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.OPEN] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } },
            critical: { $sum: { $cond: [{ $eq: ['$priority', Priority.CRITICAL] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ['$priority', Priority.HIGH] }, 1, 0] } },
          }
        }
      ]),
      
      // Tickets by priority with status breakdown
      Ticket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$priority',
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.OPEN] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.IN_PROGRESS] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } },
          }
        }
      ]),
      
    // Daily trends - get all tickets and group by date
      Ticket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
            created: { $sum: 1 },
            resolved: { 
              $sum: { 
                $cond: [
                  { $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 
                  1, 
                  0
                ] 
              } 
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Hourly distribution
      Ticket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Top performers (staff with most resolved tickets)
      Ticket.aggregate([
        { 
          $match: { 
            ...dateFilter, 
            assignedTo: { $ne: null },
            status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
          } 
        },
        {
          $group: {
            _id: '$assignedTo',
            resolved: { $sum: 1 },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $ne: ['$resolvedAt', null] },
                  { $subtract: ['$resolvedAt', '$createdAt'] },
                  null
                ]
              }
            }
          }
        },
        { $sort: { resolved: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' }
      ])
    ]);

    // Calculate SLA compliance (example: Critical < 4h, High < 8h, Medium < 24h, Low < 48h)
    const slaThresholds = {
      CRITICAL: 4 * 60 * 60 * 1000,   // 4 hours
      HIGH: 8 * 60 * 60 * 1000,       // 8 hours
      MEDIUM: 24 * 60 * 60 * 1000,    // 24 hours
      LOW: 48 * 60 * 60 * 1000,       // 48 hours
    };

    const slaCompliance = await Ticket.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          resolvedAt: { $ne: null } 
        } 
      },
      {
        $project: {
          priority: 1,
          resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] },
          threshold: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'CRITICAL'] }, then: slaThresholds.CRITICAL },
                { case: { $eq: ['$priority', 'HIGH'] }, then: slaThresholds.HIGH },
                { case: { $eq: ['$priority', 'MEDIUM'] }, then: slaThresholds.MEDIUM },
                { case: { $eq: ['$priority', 'LOW'] }, then: slaThresholds.LOW },
              ],
              default: slaThresholds.MEDIUM
            }
          }
        }
      },
      {
        $project: {
          priority: 1,
          withinSLA: { $lte: ['$resolutionTime', '$threshold'] }
        }
      },
      {
        $group: {
          _id: '$priority',
          total: { $sum: 1 },
          withinSLA: { $sum: { $cond: ['$withinSLA', 1, 0] } }
        }
      }
    ]);

    // Format response
    const resolutionStats = avgResolutionTime[0] || { avgTime: 0, minTime: 0, maxTime: 0 };
    
    // Build complete date range for trends (use local date formatting)
    const trendMap = new Map(dailyTrends.map((t: any) => [t._id, t]));
    const completeTrends: Array<{ date: string; created: number; resolved: number }> = [];
    const currentDate = new Date(startDate);
    const endDateForLoop = new Date(endDate);
    endDateForLoop.setHours(23, 59, 59, 999);
    
    while (currentDate <= endDateForLoop) {
      // Format date as YYYY-MM-DD in local timezone to match aggregation
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayData = trendMap.get(dateStr);
      completeTrends.push({
        date: dateStr,
        created: dayData?.created || 0,
        resolved: dayData?.resolved || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build hourly distribution (0-23 hours)
    const hourlyMap = new Map(hourlyDistribution.map((h: any) => [h._id, h.count]));
    const completeHourly = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyMap.get(i) || 0,
      label: `${i.toString().padStart(2, '0')}:00`
    }));

    // Department breakdown
    const departmentStats = Object.values(Department).map(dept => {
      const data = ticketsByDepartment.find((d: any) => d._id === dept) || {
        total: 0, open: 0, resolved: 0, critical: 0, high: 0
      };
      return {
        department: dept,
        total: data.total,
        open: data.open,
        resolved: data.resolved,
        critical: data.critical,
        high: data.high,
        resolutionRate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0
      };
    });

    // Priority breakdown
    const priorityStats = Object.values(Priority).map(p => {
      const data = ticketsByPriority.find((d: any) => d._id === p) || {
        total: 0, open: 0, inProgress: 0, resolved: 0
      };
      return {
        priority: p,
        total: data.total,
        open: data.open,
        inProgress: data.inProgress,
        resolved: data.resolved,
        resolutionRate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0
      };
    });

    // SLA compliance by priority
    const slaStats = Object.values(Priority).map(p => {
      const data = slaCompliance.find((s: any) => s._id === p) || { total: 0, withinSLA: 0 };
      return {
        priority: p,
        total: data.total,
        withinSLA: data.withinSLA,
        breached: data.total - data.withinSLA,
        complianceRate: data.total > 0 ? Math.round((data.withinSLA / data.total) * 100) : 100
      };
    });

    // Format top performers
    const formattedPerformers = topPerformers.map((p: any) => ({
      id: p._id,
      name: p.user.name,
      email: p.user.email,
      department: p.user.department,
      resolved: p.resolved,
      avgResolutionHours: p.avgResolutionTime 
        ? Number((p.avgResolutionTime / (1000 * 60 * 60)).toFixed(1))
        : null
    }));

    res.status(200).json({
      success: true,
      data: {
        period: { start: startDate, end: endDate, label: period },
        summary: {
          tickets: {
            total: totalTickets,
            open: openTickets,
            assigned: assignedTickets,
            inProgress: inProgressTickets,
            waiting: waitingTickets,
            resolved: resolvedTickets,
            closed: closedTickets,
            resolutionRate: totalTickets > 0 
              ? Math.round(((resolvedTickets + closedTickets) / totalTickets) * 100) 
              : 0
          },
          priority: {
            critical: criticalTickets,
            high: highTickets,
            medium: mediumTickets,
            low: lowTickets
          },
          users: {
            total: totalUsers,
            departmentUsers: totalDeptUsers,
            employees: totalEmployees
          },
          resolution: {
            avgHours: resolutionStats.avgTime 
              ? Number((resolutionStats.avgTime / (1000 * 60 * 60)).toFixed(1))
              : 0,
            minHours: resolutionStats.minTime
              ? Number((resolutionStats.minTime / (1000 * 60 * 60)).toFixed(1))
              : 0,
            maxHours: resolutionStats.maxTime
              ? Number((resolutionStats.maxTime / (1000 * 60 * 60)).toFixed(1))
              : 0
          }
        },
        byDepartment: departmentStats,
        byPriority: priorityStats,
        slaCompliance: slaStats,
        trends: completeTrends,
        hourlyDistribution: completeHourly,
        topPerformers: formattedPerformers
      }
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Department Performance Analytics
 * GET /api/v1/admin/analytics/departments
 */
export const getDepartmentAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30d' } = req.query;
    
    const daysMap: Record<string, number> = {
      '7d': 7, '30d': 30, '90d': 90, '180d': 180
    };
    const days = daysMap[period as string] || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const departmentStats = await Ticket.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.OPEN] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.ASSIGNED] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.IN_PROGRESS] }, 1, 0] } },
          waiting: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.WAITING_FOR_USER] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.RESOLVED] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.CLOSED] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', Priority.CRITICAL] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', Priority.HIGH] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', Priority.MEDIUM] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$priority', Priority.LOW] }, 1, 0] } },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ]);

    // Get staff count per department
    const staffCounts = await User.aggregate([
      { 
        $match: { 
          role: UserRole.DEPARTMENT_USER,
          department: { $exists: true }
        } 
      },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          heads: { $sum: { $cond: ['$isHead', 1, 0] } },
          staff: { $sum: { $cond: ['$isHead', 0, 1] } }
        }
      }
    ]);

    const staffMap = new Map(staffCounts.map((s: any) => [s._id, s]));

    const formattedStats = Object.values(Department).map(dept => {
      const ticketData = departmentStats.find((d: any) => d._id === dept) || {
        total: 0, open: 0, assigned: 0, inProgress: 0, waiting: 0, 
        resolved: 0, closed: 0, critical: 0, high: 0, medium: 0, low: 0,
        avgResolutionTime: null
      };
      const staffData = staffMap.get(dept) || { total: 0, heads: 0, staff: 0 };
      
      const resolvedCount = ticketData.resolved + ticketData.closed;
      
      return {
        department: dept,
        tickets: {
          total: ticketData.total,
          open: ticketData.open,
          assigned: ticketData.assigned,
          inProgress: ticketData.inProgress,
          waiting: ticketData.waiting,
          resolved: ticketData.resolved,
          closed: ticketData.closed,
          resolutionRate: ticketData.total > 0 
            ? Math.round((resolvedCount / ticketData.total) * 100) 
            : 0
        },
        priority: {
          critical: ticketData.critical,
          high: ticketData.high,
          medium: ticketData.medium,
          low: ticketData.low
        },
        staff: {
          total: staffData.total,
          heads: staffData.heads,
          members: staffData.staff
        },
        avgResolutionHours: ticketData.avgResolutionTime
          ? Number((ticketData.avgResolutionTime / (1000 * 60 * 60)).toFixed(1))
          : null,
        ticketsPerStaff: staffData.total > 0 
          ? Number((ticketData.total / staffData.total).toFixed(1))
          : 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        departments: formattedStats
      }
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Staff Performance Analytics
 * GET /api/v1/admin/analytics/staff
 */
export const getStaffAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30d', department } = req.query;
    
    const daysMap: Record<string, number> = {
      '7d': 7, '30d': 30, '90d': 90
    };
    const days = daysMap[period as string] || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const matchStage: any = { 
      createdAt: { $gte: startDate },
      assignedTo: { $ne: null }
    };
    if (department) {
      matchStage.department = department;
    }

    const staffPerformance = await Ticket.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$assignedTo',
          department: { $first: '$department' },
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.OPEN] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.IN_PROGRESS] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', Priority.CRITICAL] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', Priority.HIGH] }, 1, 0] } },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $sort: { resolved: -1 } }
    ]);

    const formattedPerformance = staffPerformance.map((p: any) => ({
      id: p._id,
      name: p.user.name,
      email: p.user.email,
      department: p.user.department,
      isHead: p.user.isHead || false,
      tickets: {
        total: p.total,
        open: p.open,
        inProgress: p.inProgress,
        resolved: p.resolved,
        resolutionRate: p.total > 0 ? Math.round((p.resolved / p.total) * 100) : 0
      },
      priority: {
        critical: p.critical,
        high: p.high
      },
      avgResolutionHours: p.avgResolutionTime
        ? Number((p.avgResolutionTime / (1000 * 60 * 60)).toFixed(1))
        : null
    }));

    res.status(200).json({
      success: true,
      data: {
        period,
        staff: formattedPerformance
      }
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Export Tickets to Excel
 * GET /api/v1/admin/analytics/export/tickets
 */
export const exportTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      status, 
      priority, 
      department, 
      startDate: queryStart, 
      endDate: queryEnd 
    } = req.query;

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (department) filter.department = department;
    if (queryStart || queryEnd) {
      filter.createdAt = {};
      if (queryStart) filter.createdAt.$gte = new Date(queryStart as string);
      if (queryEnd) filter.createdAt.$lte = new Date(queryEnd as string);
    }

    // Get tickets
    const tickets = await Ticket.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Prepare data for export
    const exportData = tickets.map(ticket => ({
      ticketId: ticket._id.toString(),
      subject: ticket.subject,
      description: ticket.description?.substring(0, 200) || '',
      status: ticket.status,
      priority: ticket.priority,
      department: ticket.department,
      createdBy: ticket.createdByName || ticket.contactName || 'Unknown',
      contactEmail: ticket.contactEmail || '',
      assignedTo: (ticket.assignedTo as any)?.name || 'Unassigned',
      createdAt: new Date(ticket.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      resolvedAt: ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
    }));

    const headers = [
      { id: 'ticketId', title: 'Ticket ID' },
      { id: 'subject', title: 'Subject' },
      { id: 'description', title: 'Description' },
      { id: 'status', title: 'Status' },
      { id: 'priority', title: 'Priority' },
      { id: 'department', title: 'Department' },
      { id: 'createdBy', title: 'Created By' },
      { id: 'contactEmail', title: 'Contact Email' },
      { id: 'assignedTo', title: 'Assigned To' },
      { id: 'createdAt', title: 'Created At' },
      { id: 'resolvedAt', title: 'Resolved At' },
    ];

    const timestamp = Date.now();
    const filename = `tickets_export_${timestamp}.xlsx`;
    const filePath = await generateExcel(exportData, headers, filename);
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Cleanup file after sending
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting export file:', err);
      });
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Export Analytics Report to Excel
 * GET /api/v1/admin/analytics/export/report
 */
export const exportAnalyticsReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30d' } = req.query;
    
    const daysMap: Record<string, number> = {
      '7d': 7, '30d': 30, '90d': 90, '180d': 180
    };
    const days = daysMap[period as string] || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    // Gather comprehensive analytics data
    const [
      totalTickets,
      openTickets,
      assignedTickets,
      inProgressTickets,
      waitingTickets,
      resolvedTickets,
      closedTickets,
      criticalTickets,
      highTickets,
      mediumTickets,
      lowTickets,
      ticketsByDepartment
    ] = await Promise.all([
      Ticket.countDocuments(dateFilter),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.OPEN }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.ASSIGNED }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.IN_PROGRESS }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.WAITING_FOR_USER }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.RESOLVED }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.CLOSED }),
      Ticket.countDocuments({ ...dateFilter, priority: Priority.CRITICAL }),
      Ticket.countDocuments({ ...dateFilter, priority: Priority.HIGH }),
      Ticket.countDocuments({ ...dateFilter, priority: Priority.MEDIUM }),
      Ticket.countDocuments({ ...dateFilter, priority: Priority.LOW }),
      Ticket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', TicketStatus.OPEN] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] } },
          }
        }
      ])
    ]);

    // Prepare summary data for Excel
    const summaryData = [
      { metric: 'Report Period', value: `Last ${days} days` },
      { metric: 'Generated On', value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
      { metric: '', value: '' },
      { metric: 'TICKET SUMMARY', value: '' },
      { metric: 'Total Tickets', value: totalTickets },
      { metric: 'Open', value: openTickets },
      { metric: 'Assigned', value: assignedTickets },
      { metric: 'In Progress', value: inProgressTickets },
      { metric: 'Waiting for User', value: waitingTickets },
      { metric: 'Resolved', value: resolvedTickets },
      { metric: 'Closed', value: closedTickets },
      { metric: 'Resolution Rate', value: totalTickets > 0 ? `${Math.round(((resolvedTickets + closedTickets) / totalTickets) * 100)}%` : '0%' },
      { metric: '', value: '' },
      { metric: 'BY PRIORITY', value: '' },
      { metric: 'Critical', value: criticalTickets },
      { metric: 'High', value: highTickets },
      { metric: 'Medium', value: mediumTickets },
      { metric: 'Low', value: lowTickets },
    ];

    // Add department breakdown
    summaryData.push({ metric: '', value: '' });
    summaryData.push({ metric: 'BY DEPARTMENT', value: '' });
    Object.values(Department).forEach(dept => {
      const deptData = ticketsByDepartment.find((d: any) => d._id === dept);
      if (deptData && deptData.total > 0) {
        summaryData.push({ 
          metric: dept.replace(/_/g, ' '), 
          value: `${deptData.total} (${deptData.resolved} resolved)` 
        });
      }
    });

    const headers = [
      { id: 'metric', title: 'Metric' },
      { id: 'value', title: 'Value' },
    ];

    const timestamp = Date.now();
    const filename = `analytics_report_${timestamp}.xlsx`;
    const filePath = await generateExcel(summaryData, headers, filename);
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting export file:', err);
      });
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Export Users to Excel
 * GET /api/v1/admin/analytics/export/users
 */
export const exportUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, department, approvalStatus } = req.query;

    // Build filter
    const filter: any = {
      role: { $nin: [UserRole.ADMIN] }
    };
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (approvalStatus) filter.approvalStatus = approvalStatus;

    // Get users
    const users = await User.find(filter)
      .select('name email role department isHead approvalStatus createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Prepare data for export
    const exportData = users.map(user => ({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || 'N/A',
      isHead: user.isHead ? 'Yes' : 'No',
      approvalStatus: user.approvalStatus || 'N/A',
      createdAt: new Date(user.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }));

    const headers = [
      { id: 'name', title: 'Name' },
      { id: 'email', title: 'Email' },
      { id: 'role', title: 'Role' },
      { id: 'department', title: 'Department' },
      { id: 'isHead', title: 'Is Head' },
      { id: 'approvalStatus', title: 'Approval Status' },
      { id: 'createdAt', title: 'Created At' },
    ];

    const timestamp = Date.now();
    const filename = `users_export_${timestamp}.xlsx`;
    const filePath = await generateExcel(exportData, headers, filename);
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting export file:', err);
      });
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Ticket Trends (for charts)
 * GET /api/v1/admin/analytics/trends
 */
export const getTicketTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;
    
    const daysMap: Record<string, number> = {
      '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365
    };
    const days = daysMap[period as string] || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    let dateFormat = '%Y-%m-%d';
    if (groupBy === 'week') dateFormat = '%Y-W%V';
    if (groupBy === 'month') dateFormat = '%Y-%m';

    const [createdTrends, resolvedTrends] = await Promise.all([
      Ticket.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Ticket.aggregate([
        { 
          $match: { 
            resolvedAt: { $gte: startDate },
            status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$resolvedAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Merge trends
    const createdMap = new Map(createdTrends.map((t: any) => [t._id, t.count]));
    const resolvedMap = new Map(resolvedTrends.map((t: any) => [t._id, t.count]));
    
    const allDates = new Set([...createdMap.keys(), ...resolvedMap.keys()]);
    const trends = Array.from(allDates).sort().map(date => ({
      date,
      created: createdMap.get(date) || 0,
      resolved: resolvedMap.get(date) || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        period,
        groupBy,
        trends
      }
    });
  } catch (error: any) {
    throw error;
  }
};
