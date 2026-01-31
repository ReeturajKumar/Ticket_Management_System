import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Ticket from '../models/Ticket';
import { UserRole } from '../constants';
import AppError from '../utils/AppError';
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

/**
 * Get Dashboard Overview - OPTIMIZED with MongoDB Aggregation
 * GET /api/v1/department/dashboard/overview
 */
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = req.user!.department;
    const cacheKey = `${CACHE_KEYS.DASHBOARD_OVERVIEW}:${department}`;

    // Check cache first
    const cachedData = cacheGet(cacheKey);
    if (cachedData) {
      res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
      return;
    }

    // Use MongoDB Aggregation Pipeline for optimized statistics
    const [statsResult] = await Ticket.aggregate([
      { $match: { department } },
      {
        $facet: {
          // Summary statistics in a single pass
          summary: [
            {
              $group: {
                _id: null,
                totalTickets: { $sum: 1 },
                openTickets: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
                assignedTickets: { $sum: { $cond: [{ $eq: ['$status', 'ASSIGNED'] }, 1, 0] } },
                inProgressTickets: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
                waitingTickets: { $sum: { $cond: [{ $eq: ['$status', 'WAITING_FOR_USER'] }, 1, 0] } },
                resolvedTickets: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
                closedTickets: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
                reopenedTickets: { $sum: { $cond: [{ $eq: ['$status', 'REOPENED'] }, 1, 0] } },
                unassignedTickets: { $sum: { $cond: [{ $eq: ['$assignedTo', null] }, 1, 0] } },
              },
            },
          ],
          // Priority breakdown
          byPriority: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 },
              },
            },
          ],
          // Recent tickets
          recentTickets: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'creator',
              },
            },
            {
              $project: {
                _id: 1,
                subject: 1,
                status: 1,
                priority: 1,
                createdAt: 1,
                createdByName: 1,
                assignedToName: 1,
                contactName: 1,
                contactEmail: 1,
                creator: { $arrayElemAt: ['$creator', 0] },
              },
            },
          ],
        },
      },
    ]);

    // Process aggregation results
    const summaryData = statsResult.summary[0] || {
      totalTickets: 0,
      openTickets: 0,
      assignedTickets: 0,
      inProgressTickets: 0,
      waitingTickets: 0,
      resolvedTickets: 0,
      closedTickets: 0,
      reopenedTickets: 0,
      unassignedTickets: 0,
    };

    // Format summary
    const summary = {
      totalTickets: summaryData.totalTickets,
      openTickets: summaryData.openTickets,
      inProgressTickets: summaryData.inProgressTickets,
      resolvedTickets: summaryData.resolvedTickets,
      closedTickets: summaryData.closedTickets,
      unassignedTickets: summaryData.unassignedTickets,
    };

    // Format priority breakdown
    const byPriority: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    statsResult.byPriority.forEach((p: { _id: string; count: number }) => {
      if (p._id && byPriority.hasOwnProperty(p._id)) {
        byPriority[p._id] = p.count;
      }
    });

    // Format recent tickets
    const formattedRecentTickets = statsResult.recentTickets.map((ticket: any) => ({
      id: ticket._id,
      ticketId: `#T-${ticket._id.toString().slice(-4).toUpperCase()}`,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      staffName: ticket.assignedToName || 'Unassigned',
      userName: ticket.creator?.name || ticket.createdByName || ticket.contactName || 'Unknown',
      userEmail: ticket.creator?.email || ticket.contactEmail || 'Unknown',
    }));

    // Specialized Metrics for HR and Tech Support (using aggregation)
    let specializedMetrics: any = {};

    if (department === 'HR') {
      const [hrMetrics] = await Ticket.aggregate([
        { $match: { department: 'HR', category: 'ONBOARDING' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $not: { $in: ['$status', ['RESOLVED', 'CLOSED']] } }, 1, 0],
              },
            },
            pendingChecks: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: { $toLower: '$description' }, regex: 'background check' } },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const onboardingData = hrMetrics || { total: 0, active: 0, pendingChecks: 0 };
      const completionRate = onboardingData.total > 0
        ? Math.round(((onboardingData.total - onboardingData.active) / onboardingData.total) * 100)
        : 0;

      // TODO: Replace mock data with real metrics from HR systems integration
      // These are placeholder values for demo/development purposes
      specializedMetrics = {
        onboarding: {
          active: onboardingData.active,
          pendingChecks: onboardingData.pendingChecks,
          completionRate: completionRate || 65, // Fallback to 65% if no data
        },
        policies: {
          // Mock: Replace with actual compliance tracking system data
          complianceRate: 92 + Math.floor(Math.random() * 6),
        },
        wellness: {
          // Mock: Replace with actual employee wellness survey data
          score: (4.5 + Math.random() * 0.4).toFixed(1),
          trend: Array.from({ length: 7 }, () => 40 + Math.floor(Math.random() * 50)),
        },
      };
    } else if (department === 'TECHNICAL_SUPPORT') {
      // TODO: Replace mock data with real infrastructure monitoring integration
      // These are placeholder values for demo/development purposes
      specializedMetrics = {
        // Mock: Replace with actual uptime monitoring (e.g., UptimeRobot, Pingdom)
        uptime: (99.95 + Math.random() * 0.04).toFixed(2),
        uptimeHistory: Array.from({ length: 24 }, () => (Math.random() > 0.05 ? 'healthy' : 'warning')),
        // Mock: Replace with actual server metrics (e.g., from Prometheus, CloudWatch)
        infraLoad: {
          cpu: (30 + Math.random() * 30).toFixed(1),
          memory: { used: (10 + Math.random() * 5).toFixed(1), total: 32 },
          storage: { used: 1.2, total: 5 },
        },
        // Mock: Replace with actual security audit data
        security: {
          grade: 'A',
          nextAuditDays: 14,
          sslStatus: 'Active',
          cdnStatus: 'Optimal',
        },
      };
    }

    const responseData = {
      summary,
      byPriority,
      recentTickets: formattedRecentTickets,
      specializedMetrics,
    };

    // Cache the results
    cacheSet(cacheKey, responseData, CACHE_TTL.DASHBOARD);

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Team Performance - OPTIMIZED with MongoDB Aggregation
 * GET /api/v1/department/dashboard/team-performance
 */
export const getTeamPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = req.user!.department;
    const cacheKey = `${CACHE_KEYS.DASHBOARD_TEAM_PERFORMANCE}:${department}`;

    // Check cache first
    const cachedData = cacheGet(cacheKey);
    if (cachedData) {
      res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
      return;
    }

    // Get team members and their performance in a single aggregation
    const teamPerformance = await User.aggregate([
      // Match department users
      {
        $match: {
          role: UserRole.DEPARTMENT_USER,
          department,
          isApproved: true,
        },
      },
      // Lookup tickets assigned to each user
      {
        $lookup: {
          from: 'tickets',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedTo', '$$userId'] },
                    { $eq: ['$department', department] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalAssigned: { $sum: 1 },
                resolved: {
                  $sum: {
                    $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0],
                  },
                },
                inProgress: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0],
                  },
                },
                // Calculate total resolution time for resolved tickets
                totalResolutionTime: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ['$resolvedAt', null] },
                          { $in: ['$status', ['RESOLVED', 'CLOSED']] },
                        ],
                      },
                      { $subtract: ['$resolvedAt', '$createdAt'] },
                      0,
                    ],
                  },
                },
                resolvedCount: {
                  $sum: {
                    $cond: [
                      { $and: [{ $ne: ['$resolvedAt', null] }, { $in: ['$status', ['RESOLVED', 'CLOSED']] }] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: 'ticketStats',
        },
      },
      // Project final shape
      {
        $project: {
          userId: '$_id',
          name: 1,
          email: 1,
          isHead: 1,
          stats: { $arrayElemAt: ['$ticketStats', 0] },
        },
      },
    ]);

    // Format the results
    const formattedPerformance = teamPerformance.map((member) => {
      const stats = member.stats || {
        totalAssigned: 0,
        resolved: 0,
        inProgress: 0,
        totalResolutionTime: 0,
        resolvedCount: 0,
      };

      // Calculate average resolution time in hours
      const avgResolutionTime =
        stats.resolvedCount > 0
          ? stats.totalResolutionTime / stats.resolvedCount / (1000 * 60 * 60)
          : 0;

      // Calculate performance percentage
      const performance =
        stats.totalAssigned > 0 ? Math.round((stats.resolved / stats.totalAssigned) * 100) : 0;

      return {
        userId: member.userId,
        name: member.name,
        email: member.email,
        isHead: member.isHead,
        assignedTickets: stats.totalAssigned,
        resolvedTickets: stats.resolved,
        inProgressTickets: stats.inProgress,
        avgResolutionTime: avgResolutionTime > 0 ? `${avgResolutionTime.toFixed(1)} hours` : 'N/A',
        performance: `${performance}%`,
      };
    });

    // Calculate team stats
    const teamStats = {
      totalMembers: formattedPerformance.length,
      activeMembers: formattedPerformance.filter((m) => !m.isHead).length,
      totalAssigned: formattedPerformance.reduce((sum, m) => sum + m.assignedTickets, 0),
      totalResolved: formattedPerformance.reduce((sum, m) => sum + m.resolvedTickets, 0),
    };

    const responseData = {
      teamMembers: formattedPerformance,
      teamStats,
    };

    // Cache the results
    cacheSet(cacheKey, responseData, CACHE_TTL.TEAM_PERFORMANCE);

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Analytics - OPTIMIZED with MongoDB Aggregation
 * GET /api/v1/department/dashboard/analytics
 */
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = req.user!.department;
    const period = (req.query.period as string) || '7d';

    // Calculate date range
    let daysAgo = 7;
    if (period === '30d') daysAgo = 30;
    if (period === '90d') daysAgo = 90;

    const cacheKey = `${CACHE_KEYS.DASHBOARD_ANALYTICS}:${department}:${period}`;

    // Check cache first
    const cachedData = cacheGet(cacheKey);
    if (cachedData) {
      res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
      return;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);

    // Use aggregation for all analytics calculations
    const [analyticsResult] = await Ticket.aggregate([
      {
        $match: {
          department,
          createdAt: { $gte: startDate },
        },
      },
      {
        $facet: {
          // Daily trends for created tickets
          createdTrends: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          // Daily trends for resolved tickets
          resolvedTrends: [
            { $match: { resolvedAt: { $ne: null } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          // Resolution time and SLA metrics
          resolutionMetrics: [
            {
              $match: {
                resolvedAt: { $ne: null },
                status: { $in: ['RESOLVED', 'CLOSED'] },
              },
            },
            {
              $project: {
                resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] },
              },
            },
            {
              $group: {
                _id: null,
                totalResolutionTime: { $sum: '$resolutionTime' },
                count: { $sum: 1 },
                slaCompliant: {
                  $sum: {
                    $cond: [
                      { $lte: ['$resolutionTime', 24 * 60 * 60 * 1000] }, // 24 hours
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          // Issue categorization by keywords
          issueCategories: [
            {
              $project: {
                subjectLower: { $toLower: '$subject' },
              },
            },
            {
              $project: {
                category: {
                  $switch: {
                    branches: [
                      {
                        case: { $regexMatch: { input: '$subjectLower', regex: 'login' } },
                        then: 'Login Issues',
                      },
                      {
                        case: {
                          $or: [
                            { $regexMatch: { input: '$subjectLower', regex: 'payment' } },
                            { $regexMatch: { input: '$subjectLower', regex: 'fee' } },
                          ],
                        },
                        then: 'Payment Issues',
                      },
                      {
                        case: {
                          $or: [
                            { $regexMatch: { input: '$subjectLower', regex: 'access' } },
                            { $regexMatch: { input: '$subjectLower', regex: 'permission' } },
                          ],
                        },
                        then: 'Access Issues',
                      },
                    ],
                    default: 'Other Issues',
                  },
                },
              },
            },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    // Generate complete date range for trends
    const dateRange: string[] = [];
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }

    // Map created trends to complete date range
    const createdMap = new Map(
      analyticsResult.createdTrends.map((t: { _id: string; count: number }) => [t._id, t.count])
    );
    const ticketsCreated = dateRange.map((date) => ({
      date,
      count: createdMap.get(date) || 0,
    }));

    // Map resolved trends to complete date range
    const resolvedMap = new Map(
      analyticsResult.resolvedTrends.map((t: { _id: string; count: number }) => [t._id, t.count])
    );
    const ticketsResolved = dateRange.map((date) => ({
      date,
      count: resolvedMap.get(date) || 0,
    }));

    // Calculate resolution metrics
    const resolutionData = analyticsResult.resolutionMetrics[0] || {
      totalResolutionTime: 0,
      count: 0,
      slaCompliant: 0,
    };

    const avgResolutionTime =
      resolutionData.count > 0
        ? resolutionData.totalResolutionTime / resolutionData.count / (1000 * 60 * 60)
        : 0;

    const slaCompliance =
      resolutionData.count > 0
        ? Math.round((resolutionData.slaCompliant / resolutionData.count) * 100)
        : 0;

    // Format top issues
    const topIssues = analyticsResult.issueCategories.map((cat: { _id: string; count: number }) => ({
      category: cat._id,
      count: cat.count,
    }));

    const responseData = {
      period,
      trends: {
        ticketsCreated,
        ticketsResolved,
      },
      avgResolutionTime: avgResolutionTime > 0 ? `${avgResolutionTime.toFixed(1)} hours` : 'N/A',
      slaCompliance: `${slaCompliance}%`,
      topIssues,
    };

    // Cache the results
    cacheSet(cacheKey, responseData, CACHE_TTL.ANALYTICS);

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    throw error;
  }
};
