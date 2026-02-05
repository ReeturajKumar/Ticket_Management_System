import { Request, Response } from 'express';
import User from '../models/User';
import Ticket from '../models/Ticket';
import { UserRole, Department, TicketStatus, Priority } from '../constants';
import AppError from '../utils/AppError';
import { hashPassword } from '../utils/security';
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

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

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
      approvedBy: role === UserRole.DEPARTMENT_USER && approvalStatus === 'APPROVED' ? req.user!.userId as any : undefined,
      approvedAt: role === UserRole.DEPARTMENT_USER && approvalStatus === 'APPROVED' ? new Date() : undefined,
    });


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
    const { period = 'all', startDate: queryStartDate, endDate: queryEndDate } = req.query;
    
    // Calculate date filter
    let dateFilter: any = {};
    if (period !== 'all') {
      const startDate = new Date();
      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'last_week') {
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'last_month') {
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'last_3_months') {
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'last_6_months') {
        startDate.setDate(startDate.getDate() - 180);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'custom' && queryStartDate) {
        dateFilter.createdAt = { 
          $gte: new Date(queryStartDate as string),
          $lte: queryEndDate ? new Date(queryEndDate as string) : new Date()
        };
      }
      
      if (period !== 'custom' && period !== 'all') {
        dateFilter.createdAt = { $gte: startDate };
      }
    }

    // Get counts with unified date filter
    const [
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
      waitingForUserTickets
    ] = await Promise.all([
      User.countDocuments(dateFilter),
      User.countDocuments({ ...dateFilter, role: UserRole.DEPARTMENT_USER }),
      User.countDocuments({ ...dateFilter, role: UserRole.EMPLOYEE }),
      User.countDocuments({ ...dateFilter, role: { $in: [UserRole.DEPARTMENT_USER, UserRole.EMPLOYEE] }, approvalStatus: 'PENDING' }),
      User.countDocuments({ ...dateFilter, role: { $in: [UserRole.DEPARTMENT_USER, UserRole.EMPLOYEE] }, approvalStatus: 'APPROVED' }),
      Ticket.countDocuments(dateFilter),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.OPEN }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.IN_PROGRESS }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.RESOLVED }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.CLOSED }),
      Ticket.countDocuments({ ...dateFilter, status: TicketStatus.WAITING_FOR_USER }),
    ]);

    // Get tickets by priority with filter
    const ticketsByPriority = await Ticket.aggregate([
      { $match: dateFilter },
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

    // Get tickets by department with filter
    const ticketsByDepartment = await Ticket.aggregate([
      { $match: dateFilter },
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

    // Get users by department with date filter
    const usersByDepartment = await User.aggregate([
      {
        $match: {
          ...dateFilter,
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

    // Get ticket trends for the period
    const ticketTrendsPromise = Ticket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const resolvedTrendsPromise = Ticket.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          resolvedAt: { $ne: null }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const [ticketTrends, resolvedTrends] = await Promise.all([ticketTrendsPromise, resolvedTrendsPromise]);

    // Calculate the full date range for the selected period
    const trends: Array<{ date: string; created: number; resolved: number }> = [];
    const now = new Date();
    let daysToBackfill = 0;

    if (period === 'today') daysToBackfill = 1;
    else if (period === 'last_week') daysToBackfill = 7;
    else if (period === 'last_month') daysToBackfill = 30;
    else if (period === 'last_3_months') daysToBackfill = 90;
    else if (period === 'last_6_months') daysToBackfill = 180;
    else if (period === 'all') daysToBackfill = 30; // Default to 30 for 'all' to show some context

    const createdMap = new Map(ticketTrends.map((t: any) => [t._id, t.count]));
    const resolvedMap = new Map(resolvedTrends.map((t: any) => [t._id, t.count]));

    for (let i = daysToBackfill - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trends.push({
        date: dateStr,
        created: createdMap.get(dateStr) || 0,
        resolved: resolvedMap.get(dateStr) || 0,
      });
    }

    // Get recent tickets (Always global for the activity stream)
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
        waitingForUserTickets
      },
      byPriority: priorityBreakdown,
      byDepartment: departmentBreakdown,
      usersByDepartment: departmentUsersBreakdown,
      trends,
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

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get All Users (Admin View)
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
    
    // Exclude admin users (ADMIN) from the list
    filter.role = { $nin: [UserRole.ADMIN] };
    
    if (role) {
      // If a specific role is requested, apply it but still exclude admins
      if (role === UserRole.ADMIN) {
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
      .select('-password -refreshToken -sessions')
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
    const updateData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update fields
    if (updateData.name) user.name = updateData.name;
    if (updateData.email) user.email = updateData.email.toLowerCase();
    
    if (updateData.role) {
      user.role = updateData.role;
      // If role changes, handle department/isHead accordingly
      if (updateData.role === UserRole.DEPARTMENT_USER) {
        if (updateData.department !== undefined) user.department = updateData.department;
        if (updateData.isHead !== undefined) user.isHead = updateData.isHead;
      } else {
        user.department = undefined;
        user.isHead = undefined;
      }
    } else if (user.role === UserRole.DEPARTMENT_USER) {
      if (updateData.department !== undefined) user.department = updateData.department;
      if (updateData.isHead !== undefined) user.isHead = updateData.isHead;
    }

    if (updateData.approvalStatus) {
      user.approvalStatus = updateData.approvalStatus;
      user.isApproved = updateData.approvalStatus === 'APPROVED';
      if (user.isApproved && !user.approvedBy) {
        user.approvedBy = req.user!.userId as any;
        user.approvedAt = new Date();
      }
    }

    await user.save();

    // Emit real-time update
    emitUserUpdated(user);

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
          isApproved: user.isApproved,
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

/**
 * Get Admin Constants (Roles, Departments, etc.)
 * GET /api/v1/admin/constants
 */
export const getAdminConstants = async (req: Request, res: Response): Promise<void> => {
  try {
    // Filter out admin roles - these should not be assignable through the UI
    const assignableRoles = Object.values(UserRole).filter(
      role => role !== UserRole.ADMIN
    );

    res.status(200).json({
      success: true,
      data: {
        roles: assignableRoles,
        departments: Object.values(Department),
      },
    });
  } catch (error: any) {
    throw error;
  }
};
