import { Request, Response } from 'express';
import User from '../models/User';
import Ticket from '../models/Ticket';
import { UserRole, TicketStatus } from '../constants';
import AppError from '../utils/AppError';

/**
 * List all team members in the department
 * GET /api/v1/department/team
 */
export const listTeamMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const teamMembers = await User.find({
      role: UserRole.DEPARTMENT_USER,
      department: user.department,
      isApproved: true,
    }).select('name email isHead createdAt');

    const teamMembersWithStats = await Promise.all(
      teamMembers.map(async (member) => {
        const assignedTickets = await Ticket.countDocuments({
          assignedTo: member._id,
          department: user.department,
        });

        const activeTickets = await Ticket.countDocuments({
          assignedTo: member._id,
          department: user.department,
          status: { $in: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_USER] },
        });

        return {
          id: member._id,
          name: member.name,
          email: member.email,
          isHead: member.isHead,
          isApproved: member.isApproved,
          assignedTickets,
          activeTickets,
          joinedAt: member.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        teamMembers: teamMembersWithStats,
        count: teamMembersWithStats.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get all tickets assigned to a specific team member
 * GET /api/v1/department/team/:userId/tickets
 */
export const getTeamMemberTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { userId } = req.params;
    const { status } = req.query;

    const teamMember = await User.findById(userId);
    if (!teamMember) {
      throw new AppError('Team member not found', 404);
    }

    if (teamMember.department !== user.department) {
      throw new AppError('Team member does not belong to your department', 403);
    }

    const filter: any = {
      assignedTo: userId,
      department: user.department,
    };

    if (status) {
      filter.status = status;
    }

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .select('subject status priority createdAt updatedAt');

    res.status(200).json({
      success: true,
      data: {
        teamMember: {
          id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
        },
        tickets,
        count: tickets.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get detailed performance stats for a team member
 * GET /api/v1/department/team/:userId/performance
 */
export const getTeamMemberPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { userId } = req.params;

    const teamMember = await User.findById(userId);

    if (!teamMember) {
      throw new AppError('Team member not found', 404);
    }

    if (teamMember.department !== user.department) {
      throw new AppError('Team member does not belong to your department', 403);
    }

    const allTickets = await Ticket.find({
      assignedTo: userId,
      department: user.department,
    });

    const totalAssigned = allTickets.length;
    const resolved = allTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;
    const inProgress = allTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length;
    const open = allTickets.filter(
      (t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.ASSIGNED
    ).length;


    const resolvedTickets = allTickets.filter((t) => t.resolvedAt);
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


    const performance = totalAssigned > 0 ? Math.round((resolved / totalAssigned) * 100) : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeekTickets = allTickets.filter(
      (t) => new Date(t.createdAt) >= oneWeekAgo
    );
    const thisWeekAssigned = thisWeekTickets.length;
    const thisWeekResolved = thisWeekTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;

    // Get this month's stats
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const thisMonthTickets = allTickets.filter(
      (t) => new Date(t.createdAt) >= oneMonthAgo
    );
    const thisMonthAssigned = thisMonthTickets.length;
    const thisMonthResolved = thisMonthTickets.filter((t) => t.status === TicketStatus.RESOLVED).length;

    res.status(200).json({
      success: true,
      data: {
        teamMember: {
          id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
        },
        stats: {
          totalAssigned,
          resolved,
          inProgress,
          open,
          avgResolutionTime,
          performance: `${performance}%`,
          thisWeek: {
            assigned: thisWeekAssigned,
            resolved: thisWeekResolved,
          },
          thisMonth: {
            assigned: thisMonthAssigned,
            resolved: thisMonthResolved,
          },
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};
