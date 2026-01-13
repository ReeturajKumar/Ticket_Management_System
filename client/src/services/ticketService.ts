import { fetchWithAuth } from "@/lib/tokenRefresh"

const API_URL = import.meta.env.VITE_API_URL

export interface Ticket {
  id: string
  ticketId?: string
  subject: string
  description?: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  department: 'PLACEMENT' | 'OPERATIONS' | 'TRAINING' | 'FINANCE'
  createdAt: string
  updatedAt?: string
}

export interface CreateTicketData {
  subject: string
  description: string
  department: string
  priority: string
}

export async function createTicket(data: CreateTicketData): Promise<{ success: boolean; data: Ticket }> {
  const response = await fetchWithAuth(`${API_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to create ticket')
  }

  return result
}

interface TicketListResponse {
  success: boolean
  data: {
    tickets: Ticket[]
    count: number
  }
}

export async function getMyTickets(): Promise<TicketListResponse> {
  const response = await fetchWithAuth(`${API_URL}/tickets`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch tickets')
  }

  return result
}

export interface TicketDetails extends Ticket {
  createdByName: string
  assignedTo: string | null
  comments: Array<{
    userName: string
    comment: string
    createdAt: string
  }>
  reopenHistory: Array<{
    reopenedBy: string
    reason: string
    reopenedAt: string
  }>
}

interface TicketDetailsResponse {
  success: boolean
  data: {
    ticket: TicketDetails
  }
}

export async function getTicketById(id: string): Promise<TicketDetailsResponse> {
  const response = await fetchWithAuth(`${API_URL}/tickets/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch ticket details')
  }

  return result
}

export async function addComment(id: string, comment: string): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/tickets/${id}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to add comment')
  }

  return result
}

export async function reopenTicket(id: string, reason: string): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/tickets/${id}/reopen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to reopen ticket')
  }

  return result
}

export async function updateTicket(id: string, data: { description?: string; priority?: string }): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/tickets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to update ticket')
  }

  return result
}
