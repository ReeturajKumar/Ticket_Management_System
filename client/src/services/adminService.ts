import adminAxios from './adminAxios'

// ============================================================================
// ADMIN SERVICE
// API calls for admin dashboard and management
// ============================================================================

export interface PendingUser {
  id: string
  name: string
  email: string
  department: string
  isHead: boolean
  requestedAt: string
}

export interface AdminDashboardOverview {
  summary: {
    totalUsers: number
    departmentUsers: number
    pendingUsers: number
    approvedUsers: number
    totalTickets: number
    openTickets: number
    inProgressTickets: number
    resolvedTickets: number
    closedTickets: number
  }
  byPriority: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
  }
  byDepartment: Record<string, number>
  usersByDepartment: Record<string, {
    total: number
    heads: number
    staff: number
  }>
  recentTickets: Array<{
    id: string
    subject: string
    status: string
    priority: string
    department: string
    createdByName: string
    createdAt: string
  }>
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  department?: string
  isHead: boolean
  approvalStatus?: string
  isApproved: boolean
  createdAt: string
}

export interface AdminUserDetails extends AdminUser {
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  updatedAt: string
  ticketStats?: {
    assignedTickets: number
    resolvedTickets: number
    activeTickets: number
  }
}

export interface AdminTicket {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  department: string
  assignedTo: {
    id: string
    name: string
    email: string
  } | null
  createdBy: {
    id: string
    name: string
    email: string
  } | null
  createdByName: string
  contactEmail?: string
  contactName?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AdminAnalytics {
  period: string
  trends: Array<{
    date: string
    created: number
    resolved: number
  }>
  departmentPerformance: Array<{
    department: string
    total: number
    resolved: number
    resolutionRate: number
    avgResolutionHours: string | null
  }>
}

export interface SystemStats {
  users: {
    total: number
    byRole: Record<string, number>
    byDepartment: Record<string, number>
  }
  tickets: {
    total: number
    active: number
  }
}

// ============================================================================
// DASHBOARD & OVERVIEW
// ============================================================================

/**
 * Get Admin Dashboard Overview
 */
export const getAdminDashboardOverview = async (): Promise<{
  success: boolean
  data: AdminDashboardOverview
  cached?: boolean
}> => {
  const response = await adminAxios.get('/admin/dashboard/overview')
  return response.data
}

/**
 * Get Admin Analytics
 */
export const getAdminAnalytics = async (period: string = '30d'): Promise<{
  success: boolean
  data: AdminAnalytics
  cached?: boolean
}> => {
  const response = await adminAxios.get('/admin/analytics', {
    params: { period },
  })
  return response.data
}

/**
 * Get System Statistics
 */
export const getSystemStats = async (): Promise<{
  success: boolean
  data: SystemStats
}> => {
  const response = await adminAxios.get('/admin/stats')
  return response.data
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Create User
 */
export const createUser = async (data: {
  name: string
  email: string
  password: string
  role: string
  department?: string
  isHead?: boolean
  approvalStatus?: string
}): Promise<{
  success: boolean
  message: string
  data: {
    user: AdminUser
  }
}> => {
  const response = await adminAxios.post('/admin/users', data)
  return response.data
}

/**
 * Get Pending Users
 */
export const getPendingUsers = async (): Promise<{
  success: boolean
  data: {
    pendingUsers: PendingUser[]
    count: number
  }
}> => {
  const response = await adminAxios.get('/admin/pending-users')
  return response.data
}

/**
 * Get All Users
 */
export const getAllUsers = async (params?: {
  role?: string
  department?: string
  approvalStatus?: string
  page?: number
  limit?: number
  search?: string
}): Promise<{
  success: boolean
  data: {
    users: AdminUser[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
}> => {
  const response = await adminAxios.get('/admin/users', { params })
  return response.data
}

/**
 * Get User Details
 */
export const getUserDetails = async (userId: string): Promise<{
  success: boolean
  data: {
    user: AdminUserDetails
    ticketStats?: {
      assignedTickets: number
      resolvedTickets: number
      activeTickets: number
    }
  }
}> => {
  const response = await adminAxios.get(`/admin/users/${userId}`)
  return response.data
}

/**
 * Update User
 */
export const updateUser = async (
  userId: string,
  data: {
    name?: string
    email?: string
    role?: string
    department?: string
    isHead?: boolean
    approvalStatus?: string
  }
): Promise<{
  success: boolean
  message: string
  data: {
    user: AdminUser
  }
}> => {
  const response = await adminAxios.patch(`/admin/users/${userId}`, data)
  return response.data
}

/**
 * Approve User
 */
export const approveUser = async (userId: string): Promise<{
  success: boolean
  message: string
  data: {
    user: AdminUser
  }
}> => {
  const response = await adminAxios.post(`/admin/approve-user/${userId}`)
  return response.data
}

/**
 * Reject User
 */
export const rejectUser = async (
  userId: string,
  reason: string
): Promise<{
  success: boolean
  message: string
  data: {
    user: {
      id: string
      name: string
      email: string
      rejectionReason: string
    }
  }
}> => {
  const response = await adminAxios.post(`/admin/reject-user/${userId}`, {
    reason,
  })
  return response.data
}

// ============================================================================
// TICKET MANAGEMENT
// ============================================================================

/**
 * Get All Tickets (Admin View)
 */
export const getAllTickets = async (params?: {
  status?: string
  priority?: string
  department?: string
  assignedTo?: string
  page?: number
  limit?: number
  search?: string
  startDate?: string
  endDate?: string
}): Promise<{
  success: boolean
  data: {
    tickets: AdminTicket[]
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
}> => {
  const response = await adminAxios.get('/admin/tickets', { params })
  return response.data
}

/**
 * Get Ticket Details (Admin View)
 */
export const getTicketDetails = async (ticketId: string): Promise<{
  success: boolean
  data: {
    ticket: AdminTicket & {
      ticketId?: string
      comments?: any[]
    }
  }
}> => {
  const response = await adminAxios.get(`/admin/tickets/${ticketId}`)
  return response.data
}
