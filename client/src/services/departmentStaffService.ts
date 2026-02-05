import departmentAxios from './departmentAxios'

const API_URL = '/department/staff'

// Types
export interface StaffDashboardStats {
    assignedTickets: number;
    activeTickets: number;
    resolvedTickets: number;
    avgResolutionTime: string;
}

export interface TicketSummary {
    id: string;
    subject: string;
    status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    createdAt: string;
    userName?: string;
}

// === Dashboard & Performance ===

export const getStaffDashboardStats = async () => {
    const response = await departmentAxios.get(`${API_URL}/my-dashboard`)
    return response.data
}

export const getStaffPerformance = async () => {
    const response = await departmentAxios.get(`${API_URL}/my-performance`)
    return response.data
}

// === Ticket Management ===

export const getMyTickets = async (status?: string) => {
    let url = `${API_URL}/my-tickets`
    if (status) {
        url += `?status=${status}`
    }
    const response = await departmentAxios.get(url)
    return response.data
}

export const getMyTicketDetails = async (id: string) => {
    const response = await departmentAxios.get(`${API_URL}/my-tickets/${id}`)
    return response.data
}

export const updateMyTicketStatus = async (id: string, status: string) => {
    const response = await departmentAxios.patch(`${API_URL}/my-tickets/${id}/status`, { status })
    return response.data
}

export const addCommentToMyTicket = async (id: string, comment: string, isInternal: boolean = false) => {
    const response = await departmentAxios.post(`${API_URL}/my-tickets/${id}/comments`, { comment, isInternal })
    return response.data
}

export const getUnassignedTickets = async () => {
    const response = await departmentAxios.get(`${API_URL}/unassigned-tickets`)
    return response.data
}

export const pickupTicket = async (id: string) => {
    const response = await departmentAxios.post(`${API_URL}/unassigned-tickets/${id}/pickup`, {})
    return response.data
}

export const createInternalTicket = async (data: { subject: string; description: string; department: string; priority: string }) => {
    const response = await departmentAxios.post(`${API_URL}/internal-ticket`, data)
    return response.data
}

export const getMyInternalRequests = async () => {
    const response = await departmentAxios.get(`${API_URL}/my-requests`)
    return response.data
}
