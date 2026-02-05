import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface EmployeeAuthResponse {
  success: boolean
  message: string
  data?: any
}

export async function registerEmployee(data: {
  name: string
  email: string
  password: string
}): Promise<EmployeeAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/employee-auth/register`, data)
    return response.data
  } catch (error: any) {
    const message = error.response?.data?.error?.userMessage || 
                   error.response?.data?.message || 
                   'Registration failed';
    throw new Error(message)
  }
}

export async function loginEmployee(email: string, password: string): Promise<EmployeeAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/employee-auth/login`, {
      email,
      password,
    })
    return response.data
  } catch (error: any) {
    const message = error.response?.data?.error?.userMessage || 
                   error.response?.data?.message || 
                   'Login failed';
    throw new Error(message)
  }
}

export async function logoutEmployee(): Promise<void> {
  localStorage.removeItem('dept_token')
  localStorage.removeItem('dept_user')
}
