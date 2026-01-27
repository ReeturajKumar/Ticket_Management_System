import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

const publicAxios = axios.create({
  baseURL: API_BASE_URL,
})

export interface PublicTicketData {
  name: string
  email: string
  subject: string
  description: string
  department: string
  priority?: string
}

export interface PublicConfig {
  departments: string[]
  priorities: string[]
}

export const getPublicConfig = async () => {
  try {
    const response = await publicAxios.get('/public/config')
    return { success: true, data: response.data.data }
  } catch (error: any) {
    // Silently handle connection errors (server not running)
    // Only log if it's not a connection refused error
    if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED') {
      console.error('Failed to fetch public config:', error)
    }
    return { success: false, message: 'Failed to load configuration' }
  }
}

export const createPublicTicket = async (data: PublicTicketData) => {
  try {
    const response = await publicAxios.post('/public/tickets', data)
    return { success: true, data: response.data, message: response.data.message }
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to submit ticket'
    return { success: false, message }
  }
}
