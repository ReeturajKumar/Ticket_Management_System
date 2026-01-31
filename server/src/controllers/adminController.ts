import { Request, Response } from 'express';
import User from '../models/User';
import Ticket from '../models/Ticket';
import { UserRole, Department, TicketStatus, Priority } from '../constants';
import AppError from '../utils/AppError';
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL, invalidateDepartmentCache, invalidateAdminCache } from '../utils/cache';
import { hashPassword } from '../utils/password';
import { emitUserCreated, emitUserUpdated } from '../utils/socket';

/**
 * Get Pending Department User Requests
 * GET /api/v1/admin/pending-users
 */
export const getPendingUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find all department users with PENDING status
    const pendingUsers = await User.find({
      role: { $in: [UserRole.DEPARTMENT_USER, UserRole.EMPLOYEE] },
      approvalStatus: 'PENDING',
      isVerified: true, // Only show verified users
    }).select('name email department isHead role createdAt');

    res.status(200).json({
      success: true,
      data: {
        pendingUsers: pendingUsers.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          department: user.department || 'N/A',
          isHead: user.role === UserRole.DEPARTMENT_USER ? user.isHead : undefined,
          role: user.role,
          requestedAt: user.createdAt,
        })),
        count: pendingUsers.length,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Create User (Admin)
 * POST /api/v1/admin/users
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, department, isHead, approvalStatus } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      throw new AppError('Please provide name, email, password, and role', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Prevent creating admin users
    if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
      throw new AppError('Cannot create admin users through this interface', 400);
    }

    // Validate department if role is DEPARTMENT_USER
    if (role === UserRole.DEPARTMENT_USER && !department) {
      throw new AppError('Department is required for department users', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      department: role === UserRole.DEPARTMENT_USER ? department : undefined,
      isHead: role === UserRole.DEPARTMENT_USER ? (isHead || false) : undefined,
      approvalStatus: role === UserRole.DEPARTMENT_USER ? (approvalStatus || 'APPROVED') : undefined,
      isApproved: role === UserRole.DEPARTMENT_USER ? (approvalStatus === 'APPROVED') : true,
      isVerified: true, // Admin-created users are auto-verified
      approvedBy: role === UserRole.DEPARTMENT_USER && approvalStatus === 'APPROVED' ? req.user!.userId as any : undefined,
      approvedAt: role === UserRole.DEPARTMENT_USER && approvalStatus === 'APPROVED' ? new Date() : undefined,
      sessions: [],
    });

    // Invalidate caches
    if (user.department) {
      invalidateDepartmentCache(user.department);
    }
    invalidateAdminCache();

    // Emit real-time update
    emitUserCreated(user);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isHead: user.isHead,
          approvalStatus: user.approvalStatus,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Approve Department User
 * POST /api/v1/admin/approve-user/:userId
 */
export const approveUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is department user or employee
    if (user.role !== UserRole.DEPARTMENT_USER && user.role !== UserRole.EMPLOYEE) {
      throw new AppError('User is not a department user or employee', 400);
    }

    // Check if already approved
    if (user.approvalStatus === 'APPROVED') {
      throw new AppError('User is already approved', 400);
    }

    // Approve user
    user.approvalStatus = 'APPROVED';
    user.isApproved = true;
    user.approvedBy = adminId as any;
    user.approvedAt = new Date();
    user.rejectionReason = undefined;

    await user.save();

    // Invalidate caches
    if (user.department) {
      invalidateDepartmentCache(user.department);
    }
    invalidateAdminCache();

    // Emit real-time update
    emitUserUpdated(user);

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          approvalStatus: user.approvalStatus,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Reject Department User
 * POST /api/v1/admin/reject-user/:userId
 */
export const rejectUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.user!.userId;

    if (!reason) {
      throw new AppError('Please provide a rejection reason', 400);
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is department user or employee
    if (user.role !== UserRole.DEPARTMENT_USER && user.role !== UserRole.EMPLOYEE) {
      throw new AppError('User is not a department user or employee', 400);
    }

    // Check if already rejected
    if (user.approvalStatus === 'REJECTED') {
      throw new AppError('User is already rejected', 400);
    }

    // Reject user
    user.approvalStatus = 'REJECTED';
    user.isApproved = false;
    user.approvedBy = adminId as any;
    user.approvedAt = new Date();
    user.rejectionReason = reason;

    await user.save();

    // Invalidate caches
    if (user.department) {
      invalidateDepartmentCache(user.department);
    }
    invalidateAdminCache();

    // Emit real-time update
    emitUserUpdated(user);

    res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rejectionReason: user.rejectionReason,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Admin Dashboard Overview
 * GET /api/v1/admin/dashboard/overview
 */
export const getAdminDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = CACHE_KEYS.ADMIN_DASHBOARD_OVERVIEW;
    const cachedData = cacheGet(cacheKey);
    
    if (cachedData) {
      res.status(200).json({
        success: true,
        data: cachedData,
        cached: true,
      });
      return;
    }

    // Get total users count by role
    const [totalUsers, departmentUsers, employees, pendingUsers, approvedUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: UserRole.DEPARTMENT_USER }),
      User.countDocuments({ role: UserRole.EMPLOYEE }),
      User.countDocuments({ role: { $in: [UserRole.DEPARTMENT_USER, UserRole.EMPLOYEE] }, approvalStatus: 'PENDING' }),
      User.countDocuments({ role: { $in: [UserRole.DEPARTMENT_USER, UserRole.EMPLOYEE] }, approvalStatus: 'APPROVED' }),
    ]);

    // Get total tickets count
    const totalTickets = await Ticket.countDocuments();
    
    // Get tickets by status
    const [openTickets, inProgressTickets, resolvedTickets, closedTickets] = await Promise.all([
      Ticket.countDocuments({ status: TicketStatus.OPEN }),
      Ticket.countDocuments({ status: TicketStatus.IN_PROGRESS }),
      Ticket.countDocuments({ status: TicketStatus.RESOLVED }),
      Ticket.countDocuments({ status: TicketStatus.CLOSED }),
    ]);

    // Get tickets by priority
    const ticketsByPriority = await Ticket.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    const priorityBreakdown: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    ticketsByPriority.forEach((p: { _id: string; count: number }) => {
      if (p._id && priorityBreakdown.hasOwnProperty(p._id)) {
        priorityBreakdown[p._id] = p.count;
      }
    });

    // Get tickets by department
    const ticketsByDepartment = await Ticket.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
    ]);

    const departmentBreakdown: Record<string, number> = {};
    ticketsByDepartment.forEach((d: { _id: string; count: number }) => {
      if (d._id) {
        departmentBreakdown[d._id] = d.count;
      }
    });

    // Get users by department
    const usersByDepartment = await User.aggregate([
      {
        $match: {
          role: UserRole.DEPARTMENT_USER,
          department: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          heads: {
            $sum: { $cond: [{ $eq: ['$isHead', true] }, 1, 0] },
          },
          staff: {
            $sum: { $cond: [{ $eq: ['$isHead', false] }, 1, 0] },
          },
        },
      },
    ]);

    const departmentUsersBreakdown: Record<string, { total: number; heads: number; staff: number }> = {};
    usersByDepartment.forEach((d: { _id: string; count: number; heads: number; staff: number }) => {
      if (d._id) {
        departmentUsersBreakdown[d._id] = {
          total: d.count,
          heads: d.heads,
          staff: d.staff,
        };
      }
    });

    // Get recent tickets (last 10)
    const recentTickets = await Ticket.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('subject status priority department createdAt contactName createdByName')
      .lean();

    const responseData = {
      summary: {
        totalUsers,
        departmentUsers,
        employees,
        pendingUsers,
        approvedUsers,
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
      },
      byPriority: priorityBreakdown,
      byDepartment: departmentBreakdown,
      usersByDepartment: departmentUsersBreakdown,
      recentTickets: recentTickets.map((ticket) => ({
        id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        department: ticket.department,
        createdByName: ticket.createdByName || ticket.contactName || 'Unknown',
        createdAt: ticket.createdAt,
      })),
    };

    // Cache for 5 minutes
    cacheSet(cacheKey, responseData, 5 * 60 * 1000);

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get All Users (with filters)
 * GET /api/v1/admin/users
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, department, approvalStatus, page = '1', limit = '20', search } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: any = {};
    
    // Exclude admin users (ADMIN and SUPER_ADMIN) from the list
    filter.role = { $nin: [UserRole.ADMIN, UserRole.SUPER_ADMIN] };
    
    if (role) {
      // If a specific role is requested, apply it but still exclude admins
      if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
        // If admin role is requested, return empty result
        filter.role = { $in: [] }; // Empty array means no results
      } else {
        filter.role = role;
      }
    }
    
    if (department) {
      filter.department = department;
    }
    
    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
      ];
    }

    // Get users
    const users = await User.find(filter)
      .select('name email role department isHead approvalStatus isApproved createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users: users.map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isHead: user.isHead || false,
          approvalStatus: user.approvalStatus,
          isApproved: user.isApproved || false,
          createdAt: user.createdAt,
        })),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get User Details
 * GET /api/v1/admin/users/:userId
 */
export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -refreshToken -sessions -verificationOTP -resetPasswordToken')
      .lean();

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get user's ticket statistics if department user
    let ticketStats = null;
    if (user.role === UserRole.DEPARTMENT_USER && user.department) {
      const [assignedTickets, resolvedTickets, activeTickets] = await Promise.all([
        Ticket.countDocuments({ assignedTo: user._id }),
        Ticket.countDocuments({ assignedTo: user._id, status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } }),
        Ticket.countDocuments({
          assignedTo: user._id,
          status: { $in: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_USER] },
        }),
      ]);

      ticketStats = {
        assignedTickets,
        resolvedTickets,
        activeTickets,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isHead: user.isHead || false,
          approvalStatus: user.approvalStatus,
          isApproved: user.isApproved || false,
          approvedBy: user.approvedBy,
          approvedAt: user.approvedAt,
          rejectionReason: user.rejectionReason,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        ticketStats,
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Update User
 * PATCH /api/v1/admin/users/:userId
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { name, email, role, department, isHead, approvalStatus } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;
    if (isHead !== undefined) user.isHead = isHead;
    if (approvalStatus !== undefined) {
      user.approvalStatus = approvalStatus;
      user.isApproved = approvalStatus === 'APPROVED';
      if (approvalStatus === 'APPROVED') {
        user.approvedBy = req.user!.userId as any;
        user.approvedAt = new Date();
      }
    }

    await user.save();

    // Invalidate caches
    if (user.department) {
      invalidateDepartmentCache(user.department);
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isHead: user.isHead,
          approvalStatus: user.approvalStatus,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get All Tickets (Admin View)
 * GET /api/v1/admin/tickets
 */
export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      priority,
      department,
      assignedTo,
      page = '1',
      limit = '20',
      search,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: any = {};

    if (status) {
      const statusArray = (status as string).split(',');
      filter.status = statusArray.length === 1 ? statusArray[0] : { $in: statusArray };
    }

    if (priority) {
      const priorityArray = (priority as string).split(',');
      filter.priority = priorityArray.length === 1 ? priorityArray[0] : { $in: priorityArray };
    }

    if (department) {
      filter.department = department;
    }

    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        filter.assignedTo = null;
      } else {
        filter.assignedTo = assignedTo;
      }
    }

    if (search) {
      filter.$or = [
        { subject: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
        { contactName: { $regex: search as string, $options: 'i' } },
        { createdByName: { $regex: search as string, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate as string);
      }
    }

    // Get tickets
    const tickets = await Ticket.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    const total = await Ticket.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        tickets: tickets.map((ticket) => ({
          id: ticket._id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          department: ticket.department,
          assignedTo: ticket.assignedTo
            ? {
                id: (ticket.assignedTo as any)._id,
                name: (ticket.assignedTo as any).name,
                email: (ticket.assignedTo as any).email,
              }
            : null,
          createdBy: ticket.createdBy
            ? {
                id: (ticket.createdBy as any)._id,
                name: (ticket.createdBy as any).name,
                email: (ticket.createdBy as any).email,
              }
            : null,
          createdByName: ticket.createdByName || ticket.contactName || 'Unknown',
          contactEmail: ticket.contactEmail,
          contactName: ticket.contactName,
          resolvedAt: ticket.resolvedAt,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        })),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Ticket Details (Admin View)
 * GET /api/v1/admin/tickets/:ticketId
 */
export const getTicketDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findById(ticketId)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .lean();

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        ticket: {
          id: ticket._id,
          ticketId: ticket._id.toString(), // Use _id as ticketId
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          department: ticket.department,
          assignedTo: ticket.assignedTo
            ? {
                id: (ticket.assignedTo as any)._id,
                name: (ticket.assignedTo as any).name,
                email: (ticket.assignedTo as any).email,
              }
            : null,
          createdBy: ticket.createdBy
            ? {
                id: (ticket.createdBy as any)._id,
                name: (ticket.createdBy as any).name,
                email: (ticket.createdBy as any).email,
              }
            : null,
          createdByName: ticket.createdByName || ticket.contactName || 'Unknown',
          contactEmail: ticket.contactEmail,
          contactName: ticket.contactName,
          resolvedAt: ticket.resolvedAt,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          comments: ticket.comments || [],
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get Admin Analytics
 * GET /api/v1/admin/analytics
 */
export const getAdminAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || '30d';
    let daysAgo = 30;
    if (period === '7d') daysAgo = 7;
    if (period === '90d') daysAgo = 90;

    const cacheKey = `${CACHE_KEYS.ADMIN_ANALYTICS}:${period}`;
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

    // Get ticket trends
    const ticketTrends = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          created: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const resolvedTrends = await Ticket.aggregate([
      {
        $match: {
          resolvedAt: { $ne: null, $gte: startDate },
          status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' } },
          resolved: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Generate complete date range
    const dateRange: string[] = [];
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateRange.push(date.toISOString().split('T')[0]);
    }

    // Map trends to complete date range
    const createdMap = new Map(ticketTrends.map((t: { _id: string; created: number }) => [t._id, t.created]));
    const resolvedMap = new Map(resolvedTrends.map((t: { _id: string; resolved: number }) => [t._id, t.resolved]));

    const trends = dateRange.map((date) => ({
      date,
      created: createdMap.get(date) || 0,
      resolved: resolvedMap.get(date) || 0,
    }));

    // Get department performance
    const departmentPerformance = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }, 1, 0] },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    const responseData = {
      period,
      trends,
      departmentPerformance: departmentPerformance.map((d: any) => ({
        department: d._id,
        total: d.total,
        resolved: d.resolved,
        resolutionRate: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0,
        avgResolutionHours: d.avgResolutionTime
          ? (d.avgResolutionTime / (1000 * 60 * 60)).toFixed(1)
          : null,
      })),
    };

    // Cache for 10 minutes
    cacheSet(cacheKey, responseData, 10 * 60 * 1000);

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get System Statistics
 * GET /api/v1/admin/stats
 */
export const getSystemStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalTickets,
      activeTickets,
      departmentCounts,
      userRoleCounts,
    ] = await Promise.all([
      User.countDocuments(),
      Ticket.countDocuments(),
      Ticket.countDocuments({
        status: { $in: [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS] },
      }),
      User.aggregate([
        {
          $match: { role: UserRole.DEPARTMENT_USER, department: { $exists: true } },
        },
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const departmentStats: Record<string, number> = {};
    departmentCounts.forEach((d: { _id: string; count: number }) => {
      if (d._id) {
        departmentStats[d._id] = d.count;
      }
    });

    const roleStats: Record<string, number> = {};
    userRoleCounts.forEach((r: { _id: string; count: number }) => {
      if (r._id) {
        roleStats[r._id] = r.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: roleStats,
          byDepartment: departmentStats,
        },
        tickets: {
          total: totalTickets,
          active: activeTickets,
        },
      },
    });
  } catch (error: any) {
    throw error;
  }
};
