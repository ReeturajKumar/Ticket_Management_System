import departmentAxios from './departmentAxios';
import type { Ticket, DashboardData } from '@/types/ticket';

export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const employeeService = {
  // Dashboard Stats
  getDashboardStats: async (): Promise<APIResponse<DashboardData & { weeklyTrends?: any[], monthlyTrends?: any[], recentTickets?: Ticket[] }>> => {
    const response = await departmentAxios.get('/employee/dashboard-stats');
    return response.data;
  },

  getWeeklyStats: async (): Promise<APIResponse<any[]>> => {
    const response = await departmentAxios.get('/employee/dashboard-stats/weekly');
    return response.data;
  },

  getMonthlyStats: async (): Promise<APIResponse<any[]>> => {
    const response = await departmentAxios.get('/employee/dashboard-stats/monthly');
    return response.data;
  },

  // Tickets
  createTicket: async (ticketData: FormData | Partial<Ticket>): Promise<APIResponse<Ticket>> => {
    const config = ticketData instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const response = await departmentAxios.post('/employee/tickets', ticketData, config);
    return response.data;
  },

  listMyTickets: async (params: { status?: string; page?: number; limit?: number } = {}): Promise<APIResponse<{ tickets: Ticket[], total: number }>> => {
    const response = await departmentAxios.get('/employee/tickets', { params });
    return response.data;
  },

  // Ticket Details
  getTicketDetails: async (id: string): Promise<APIResponse<Ticket>> => {
    const response = await departmentAxios.get(`/employee/tickets/${id}`);
    return response.data;
  },

  // Comments
  addComment: async (id: string, comment: string, files?: File[]): Promise<APIResponse<Ticket>> => {
    let payload: FormData | { comment: string } = { comment };
    let config = {};

    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('comment', comment);
      files.forEach(file => formData.append('attachments', file));
      payload = formData;
      config = { headers: { 'Content-Type': 'multipart/form-data' } };
    }

    const response = await departmentAxios.post(`/employee/tickets/${id}/comments`, payload, config);
    return response.data;
  }
};
