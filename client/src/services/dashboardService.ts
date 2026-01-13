import { fetchWithAuth } from "@/lib/tokenRefresh"

const API_URL = import.meta.env.VITE_API_URL

interface DashboardSummary {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  closedTickets: number
  reopenedTickets: number
}

interface StudentOverviewResponse {
  success: boolean
  data: {
    summary: DashboardSummary
    recentTickets: Array<{
      id: string
      subject: string
      status: string
      priority: string
      department: string
      createdAt: string
    }>
  }
}

/**
 * Get student dashboard overview stats
 */
export async function getStudentDashboardStats(): Promise<StudentOverviewResponse> {
  const response = await fetchWithAuth(`${API_URL}/dashboard/student/overview`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch dashboard stats')
  }

  return result
}

interface MonthlyStat {
  month: string
  created: number
  resolved: number
  byDepartment: {
    PLACEMENT: number
    OPERATIONS: number
    TRAINING: number
    FINANCE: number
  }
  byStatus: {
    OPEN: number
    IN_PROGRESS: number
    RESOLVED: number
    CLOSED: number
    REOPENED: number
  }
}

interface MonthlyStatsResponse {
  success: boolean
  data: {
    monthly: MonthlyStat[]
    totalMonths: number
  }
}

/**
 * Get student monthly statistics for charts
 */
export async function getStudentMonthlyStats(): Promise<MonthlyStatsResponse> {
  const response = await fetchWithAuth(`${API_URL}/dashboard/student/monthly`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch monthly stats')
  }

  return result
}

export interface DepartmentStat {
  department: string
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  reopened: number
  lowPriority: number
  mediumPriority: number
  highPriority: number
  criticalPriority: number
}

interface DepartmentStatsResponse {
  success: boolean
  data: {
    departments: DepartmentStat[]
    totalTickets: number
  }
}

/**
 * Get student department-wise statistics
 */
export async function getStudentDepartmentStats(): Promise<DepartmentStatsResponse> {
  const response = await fetchWithAuth(`${API_URL}/dashboard/student/departments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch department stats')
  }

  return result
}
