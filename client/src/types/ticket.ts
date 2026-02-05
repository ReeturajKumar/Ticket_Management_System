export type TicketStatus = 
  | 'OPEN' 
  | 'IN_PROGRESS' 
  | 'RESOLVED' 
  | 'CLOSED' 
  | 'WAITING_FOR_USER' 
  | 'REOPENED' 
  | 'PENDING'

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface UserReference {
  _id: string
  name: string
  email: string
  role: string
  avatar?: string
}

export interface TicketComment {
  _id: string
  content?: string // Standard field
  comment?: string // Alternative field used in some components/responses
  author?: UserReference // Standard field
  user?: UserReference | string // Alternative field
  userName?: string // Flattened author name
  createdAt: string
  isInternal: boolean
}

export interface Ticket {
  _id: string
  id?: string // Handle both formats from API
  ticketId: string // The human-readable ID like #INC-123
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  department: string
  category: string
  createdBy: UserReference | string
  assignedTo?: UserReference | string
  userName?: string // From flattened responses
  userEmail?: string
  contactEmail?: string
  createdAt: string
  updatedAt: string
  lastCommentAt?: string
  tags?: string[]
  attachments?: string[]
  comments?: TicketComment[]
}

export interface DashboardSummary {
  total: number
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  closedTickets: number
  pending: number
  resolved: number
  inProgress: number
  averageResponseTime?: number
  averageResolutionTime?: number
}

export interface DashboardData {
  summary: DashboardSummary
  stats?: {
    total: number
    resolved: number
    inProgress: number
    pending: number
  }
  recentTickets: Ticket[]
  weeklyTrends?: any[]
  monthlyTrends?: any[]
  analytics?: {
    trends: {
      date: string
      created: number
      resolved: number
    }[]
  }
}
