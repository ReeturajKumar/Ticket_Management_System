import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Get token from storage - consistent with other roles
const getAuthHeaders = () => {
  const token = localStorage.getItem('dept_accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const employeeService = {
  // Dashboard Stats
  getDashboardStats: async () => {
    try {
      console.log('📊 Calling employee dashboard-stats API...')
      const response = await axios.get(`${API_URL}/employee/dashboard-stats`, getAuthHeaders());
      console.log('✅ Employee dashboard API response:', response.data)
      return response.data;
    } catch (error) {
      console.error('❌ Employee dashboard API error:', error)
      throw error;
    }
  },

  // Tickets
  createTicket: async (ticketData: { 
    subject: string; 
    description: string; 
    department: string; 
    priority: string 
  }) => {
    const response = await axios.post(`${API_URL}/employee/tickets`, ticketData, getAuthHeaders());
    return response.data;
  },

  listMyTickets: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const response = await axios.get(`${API_URL}/employee/tickets`, {
      ...getAuthHeaders(),
      params
    });
    return response.data;
  },

  // Ticket Details
  getTicketDetails: async (id: string) => {
    const response = await axios.get(`${API_URL}/employee/tickets/${id}`, getAuthHeaders());
    return response.data;
  },

  // Comments
  addComment: async (id: string, comment: string) => {
    const response = await axios.post(`${API_URL}/employee/tickets/${id}/comments`, { comment }, getAuthHeaders());
    return response.data;
  }
};
