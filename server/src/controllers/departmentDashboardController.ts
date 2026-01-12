import { Request, Response } from 'express';
import User from '../models/User';
import Ticket from '../models/Ticket';
import { UserRole } from '../constants';
import AppError from '../utils/AppError';

/**
 * Get Dashboard Overview
 * GET /api/v1/department/dashboard/overview
 */
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = req.user!.department;

    // Get all tickets for this department
    const tickets = await Ticket.find({ department });

    // Calculate summary statistics
    const summary = {
      totalTickets: tickets.length,
      openTickets: tickets.filter(t => t.status === 'OPEN').length,
      inProgressTickets: tickets.filter(t => t.status === 'IN_PROGRESS').length,
      resolvedTickets: tickets.filter(t => t.status === 'RESOLVED').length,
      closedTickets: tickets.filter(t => t.status === 'CLOSED').length,
      unassignedTickets: tickets.filter(t => !t.assignedTo).length,
    };

    // Calculate by priority
    const byPriority = {
      CRITICAL: tickets.filter(t => t.priority === 'CRITICAL').length,
      HIGH: tickets.filter(t => t.priority === 'HIGH').length,
      MEDIUM: tickets.filter(t => t.priority === 'MEDIUM').length,
      LOW: tickets.filter(t => t.priority === 'LOW').length,
    };

    // Get recent tickets (last 10)
    const recentTickets = await Ticket.find({ department })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name email')
      .select('subject status priority createdAt');

    const formattedRecentTickets = recentTickets.map(ticket => ({
      id: ticket._id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      studentName: (ticket.createdBy as any)?.name || 'Unknown',
      studentEmail: (ticket.createdBy as any)?.email || 'Unknown',
    }));

    res.status(200).json({
      success: true,
      data: {
        summary,
        byPriority,
        recentTickets: formattedRecentTickets,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Team Performance
 * GET /api/v1/department/dashboard/team-performance
 */
export const getTeamPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = req.user!.department;

    // Get all department users (team members)
    const teamMembers = await User.find({
      role: UserRole.DEPARTMENT_USER,
      department,
      isApproved: true,
    }).select('name email isHead');

    // Calculate performance for each team member
    const teamPerformance = await Promise.all(
      teamMembers.map(async (member) => {
        const assignedTickets = await Ticket.find({
          department,
          assignedTo: member._id,
        });

        const resolvedTickets = assignedTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
        const inProgressTickets = assignedTickets.filter(t => t.status === 'IN_PROGRESS');

        // Calculate average resolution time
        let avgResolutionTime = 0;
        if (resolvedTickets.length > 0) {
          const totalTime = resolvedTickets.reduce((sum, ticket) => {
            if (ticket.resolvedAt && ticket.createdAt) {
              const diff = new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime();
              return sum + diff;
            }
            return sum;
          }, 0);
          avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // Convert to hours
        }

        // Calculate performance percentage
        const performance = assignedTickets.length > 0
          ? Math.round((resolvedTickets.length / assignedTickets.length) * 100)
          : 0;

        return {
          userId: member._id,
          name: member.name,
          email: member.email,
          isHead: member.isHead,
          assignedTickets: assignedTickets.length,
          resolvedTickets: resolvedTickets.length,
          inProgressTickets: inProgressTickets.length,
          avgResolutionTime: avgResolutionTime > 0 ? `${avgResolutionTime.toFixed(1)} hours` : 'N/A',
          performance: `${performance}%`,
        };
      })
    );

    // Calculate team stats
    const teamStats = {
      totalMembers: teamMembers.length,
      activeMembers: teamMembers.filter(m => !m.isHead).length,
      totalAssigned: teamPerformance.reduce((sum, m) => sum + m.assignedTickets, 0),
      totalResolved: teamPerformance.reduce((sum, m) => sum + m.resolvedTickets, 0),
    };

    res.status(200).json({
      success: true,
      data: {
        teamMembers: teamPerformance,
        teamStats,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Analytics
 * GET /api/v1/department/dashboard/analytics
 */
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = req.user!.department;
    const period = req.query.period as string || '7d';

    // Calculate date range
    let daysAgo = 7;
    if (period === '30d') daysAgo = 30;
    if (period === '90d') daysAgo = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get tickets within period
    const tickets = await Ticket.find({
      department,
      createdAt: { $gte: startDate },
    });

    // Calculate daily trends
    const trendsMap = new Map<string, { created: number; resolved: number }>();
    
    for (let i = 0; i < daysAgo; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendsMap.set(dateStr, { created: 0, resolved: 0 });
    }

    tickets.forEach(ticket => {
      const createdDate = new Date(ticket.createdAt).toISOString().split('T')[0];
      if (trendsMap.has(createdDate)) {
        trendsMap.get(createdDate)!.created++;
      }

      if (ticket.resolvedAt) {
        const resolvedDate = new Date(ticket.resolvedAt).toISOString().split('T')[0];
        if (trendsMap.has(resolvedDate)) {
          trendsMap.get(resolvedDate)!.resolved++;
        }
      }
    });

    const trends = {
      ticketsCreated: Array.from(trendsMap.entries())
        .map(([date, data]) => ({ date, count: data.created }))
        .reverse(),
      ticketsResolved: Array.from(trendsMap.entries())
        .map(([date, data]) => ({ date, count: data.resolved }))
        .reverse(),
    };

    // Calculate average resolution time
    const resolvedTickets = tickets.filter(t => t.resolvedAt && t.createdAt);
    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        const diff = new Date(ticket.resolvedAt!).getTime() - new Date(ticket.createdAt).getTime();
        return sum + diff;
      }, 0);
      avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // Hours
    }

    // Calculate SLA compliance (assuming 24 hours SLA)
    const slaCompliantTickets = resolvedTickets.filter(ticket => {
      const resolutionTime = new Date(ticket.resolvedAt!).getTime() - new Date(ticket.createdAt).getTime();
      return resolutionTime <= 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    });
    const slaCompliance = resolvedTickets.length > 0
      ? Math.round((slaCompliantTickets.length / resolvedTickets.length) * 100)
      : 0;

    // Get top issues (by subject keywords - simplified)
    const subjectCounts = new Map<string, number>();
    tickets.forEach(ticket => {
      const subject = ticket.subject.toLowerCase();
      // Simple categorization
      if (subject.includes('login')) {
        subjectCounts.set('Login Issues', (subjectCounts.get('Login Issues') || 0) + 1);
      } else if (subject.includes('payment') || subject.includes('fee')) {
        subjectCounts.set('Payment Issues', (subjectCounts.get('Payment Issues') || 0) + 1);
      } else if (subject.includes('access') || subject.includes('permission')) {
        subjectCounts.set('Access Issues', (subjectCounts.get('Access Issues') || 0) + 1);
      } else {
        subjectCounts.set('Other Issues', (subjectCounts.get('Other Issues') || 0) + 1);
      }
    });

    const topIssues = Array.from(subjectCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        period,
        trends,
        avgResolutionTime: avgResolutionTime > 0 ? `${avgResolutionTime.toFixed(1)} hours` : 'N/A',
        slaCompliance: `${slaCompliance}%`,
        topIssues,
      },
    });
  } catch (error: any) {
    throw error;
  }
};
