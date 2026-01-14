import departmentAxios from './departmentAxios'

const API_BASE_URL = '/department'

// === Dashboard & Analytics ===

export const getDepartmentOverview = async () => {
    const response = await departmentAxios.get(`${API_BASE_URL}/dashboard/overview`)
    return response.data
}

export const getTeamPerformance = async () => {
    const response = await departmentAxios.get(`${API_BASE_URL}/dashboard/team-performance`)
    return response.data
}

export const getAnalytics = async (period: string = '7d') => {
    const response = await departmentAxios.get(`${API_BASE_URL}/dashboard/analytics?period=${period}`)
    return response.data
}

// === Ticket Management (Head Access) ===

export const getAllTickets = async (params?: any) => {
    const response = await departmentAxios.get('/department/tickets', { params })
    return response.data
}

export const getTicketDetails = async (id: string) => {
    const response = await departmentAxios.get(`${API_BASE_URL}/tickets/${id}`)
    return response.data
}

export const assignTicket = async (id: string, assignedTo: string) => {
    const response = await departmentAxios.patch(`${API_BASE_URL}/tickets/${id}/assign`, { assignedTo })
    return response.data
}

export const updateTicketStatus = async (id: string, status: string) => {
    const response = await departmentAxios.patch(`${API_BASE_URL}/tickets/${id}/status`, { status })
    return response.data
}

export const changeTicketPriority = async (id: string, priority: string) => {
    const response = await departmentAxios.patch(`${API_BASE_URL}/tickets/${id}/priority`, { priority })
    return response.data
}

export const addInternalNote = async (id: string, note: string) => {
    const response = await departmentAxios.post(`${API_BASE_URL}/tickets/${id}/notes`, { note })
    return response.data
}

export const bulkAssignTickets = async (ticketIds: string[], assignedTo: string) => {
    const response = await departmentAxios.post(`${API_BASE_URL}/tickets/bulk-assign`, { ticketIds, assignedTo })
    return response.data
}

export const bulkUpdateStatus = async (ticketIds: string[], status: string) => {
    const response = await departmentAxios.post(`${API_BASE_URL}/tickets/bulk-status`, { ticketIds, status })
    return response.data
}

// === Team Management ===

export const getTeamMembers = async () => {
    const response = await departmentAxios.get(`${API_BASE_URL}/team`)
    return response.data
}

export const getTeamMemberTickets = async (userId: string) => {
    const response = await departmentAxios.get(`${API_BASE_URL}/team/${userId}/tickets`)
    return response.data
}

export const getMemberPerformance = async (userId: string) => {
    const response = await departmentAxios.get(`${API_BASE_URL}/team/${userId}/performance`)
    return response.data
}

// === Reports ===

export const getSummaryReport = async (startDate?: string, endDate?: string) => {
    const response = await departmentAxios.get(`${API_BASE_URL}/reports/summary`, { params: { startDate, endDate } })
    return response.data
}

export const exportReport = async (format: 'csv' | 'excel' | 'pdf', type: 'tickets' | 'team' | 'summary', startDate?: string, endDate?: string) => {
    const response = await departmentAxios.get(`${API_BASE_URL}/reports/export`, {
        params: { format, type, startDate, endDate },
        responseType: 'blob'
    })
    return response.data
}
