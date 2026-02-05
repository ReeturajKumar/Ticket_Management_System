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
  isHead?: boolean
  role: string
  requestedAt: string
}

export interface AdminDashboardOverview {
  summary: {
    totalUsers: number
    departmentUsers: number
    employees: number
    pendingUsers: number
    approvedUsers: number
    totalTickets: number
    openTickets: number
    inProgressTickets: number
    resolvedTickets: number
    closedTickets: number
    waitingForUserTickets: number
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
  trends: Array<{
    date: string
    created: number
    resolved: number
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

// Comprehensive Analytics Types
export interface AnalyticsOverview {
  period: {
    start: string
    end: string
    label: string
  }
  summary: {
    tickets: {
      total: number
      open: number
      assigned: number
      inProgress: number
      waiting: number
      resolved: number
      closed: number
      resolutionRate: number
    }
    priority: {
      critical: number
      high: number
      medium: number
      low: number
    }
    users: {
      total: number
      departmentUsers: number
      employees: number
    }
    resolution: {
      avgHours: number
      minHours: number
      maxHours: number
    }
  }
  byDepartment: Array<{
    department: string
    total: number
    open: number
    resolved: number
    critical: number
    high: number
    resolutionRate: number
  }>
  byPriority: Array<{
    priority: string
    total: number
    open: number
    inProgress: number
    resolved: number
    resolutionRate: number
  }>
  slaCompliance: Array<{
    priority: string
    total: number
    withinSLA: number
    breached: number
    complianceRate: number
  }>
  trends: Array<{
    date: string
    created: number
    resolved: number
  }>
  hourlyDistribution: Array<{
    hour: number
    count: number
    label: string
  }>
  topPerformers: Array<{
    id: string
    name: string
    email: string
    department: string
    resolved: number
    avgResolutionHours: number | null
  }>
}

export interface DepartmentAnalytics {
  period: string
  departments: Array<{
    department: string
    tickets: {
      total: number
      open: number
      assigned: number
      inProgress: number
      waiting: number
      resolved: number
      closed: number
      resolutionRate: number
    }
    priority: {
      critical: number
      high: number
      medium: number
      low: number
    }
    staff: {
      total: number
      heads: number
      members: number
    }
    avgResolutionHours: number | null
    ticketsPerStaff: number
  }>
}

export interface StaffAnalytics {
  period: string
  staff: Array<{
    id: string
    name: string
    email: string
    department: string
    isHead: boolean
    tickets: {
      total: number
      open: number
      inProgress: number
      resolved: number
      resolutionRate: number
    }
    priority: {
      critical: number
      high: number
    }
    avgResolutionHours: number | null
  }>
}

export interface TicketTrends {
  period: string
  groupBy: string
  trends: Array<{
    date: string
    created: number
    resolved: number
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
export const getAdminDashboardOverview = async (period: string = 'all', startDate?: string, endDate?: string): Promise<{
  success: boolean
  data: AdminDashboardOverview
  cached?: boolean
}> => {
  const response = await adminAxios.get('/admin/dashboard/overview', {
    params: { period, startDate, endDate }
  })
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
/**
 * Get Admin Constants
 */
export const getAdminConstants = async (): Promise<{
  success: boolean
  data: {
    roles: string[]
    departments: string[]
  }
}> => {
  const response = await adminAxios.get('/admin/constants')
  return response.data
}

// ============================================================================
// ANALYTICS - COMPREHENSIVE
// ============================================================================

/**
 * Get Comprehensive Analytics Overview
 */
export const getAnalyticsOverview = async (params?: {
  period?: string
  startDate?: string
  endDate?: string
}): Promise<{
  success: boolean
  data: AnalyticsOverview
}> => {
  const response = await adminAxios.get('/admin/analytics/overview', { params })
  return response.data
}

/**
 * Get Department Analytics
 */
export const getDepartmentAnalytics = async (period: string = '30d'): Promise<{
  success: boolean
  data: DepartmentAnalytics
}> => {
  const response = await adminAxios.get('/admin/analytics/departments', {
    params: { period }
  })
  return response.data
}

/**
 * Get Staff Analytics
 */
export const getStaffAnalytics = async (params?: {
  period?: string
  department?: string
}): Promise<{
  success: boolean
  data: StaffAnalytics
}> => {
  const response = await adminAxios.get('/admin/analytics/staff', { params })
  return response.data
}

/**
 * Get Ticket Trends
 */
export const getTicketTrends = async (params?: {
  period?: string
  groupBy?: 'day' | 'week' | 'month'
}): Promise<{
  success: boolean
  data: TicketTrends
}> => {
  const response = await adminAxios.get('/admin/analytics/trends', { params })
  return response.data
}

// ============================================================================
// ANALYTICS - EXPORT
// ============================================================================

/**
 * Export Tickets to Excel
 */
export const exportTickets = async (params?: {
  status?: string
  priority?: string
  department?: string
  startDate?: string
  endDate?: string
}): Promise<Blob> => {
  const response = await adminAxios.get('/admin/analytics/export/tickets', {
    params,
    responseType: 'blob'
  })
  return response.data
}

/**
 * Export Users to Excel
 */
export const exportUsers = async (params?: {
  role?: string
  department?: string
  approvalStatus?: string
}): Promise<Blob> => {
  const response = await adminAxios.get('/admin/analytics/export/users', {
    params,
    responseType: 'blob'
  })
  return response.data
}

/**
 * Export Analytics Report to Excel
 */
export const exportAnalyticsReport = async (period: string = '30d'): Promise<Blob> => {
  const response = await adminAxios.get('/admin/analytics/export/report', {
    params: { period },
    responseType: 'blob'
  })
  return response.data
}

/**
 * Download exported file helper
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.parentNode?.removeChild(link)
  window.URL.revokeObjectURL(url)
}
