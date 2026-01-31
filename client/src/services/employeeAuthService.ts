import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface EmployeeAuthResponse {
  success: boolean
  message: string
  data?: any
}

/**
 * Register internal employee
 */
export async function registerEmployee(data: {
  name: string
  email: string
  password: string
}): Promise<EmployeeAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/employee-auth/register`, data)
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Registration failed')
  }
}

/**
 * Login internal employee
 */
export async function loginEmployee(email: string, password: string): Promise<EmployeeAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/employee-auth/login`, {
      email,
      password,
    })
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed')
  }
}
/**
 * Logout internal employee
 */
export async function logoutEmployee(): Promise<void> {
  const refreshToken = localStorage.getItem('dept_refreshToken')
  const accessToken = localStorage.getItem('dept_accessToken')
  
  if (refreshToken && accessToken) {
    try {
      await axios.post(
        `${API_URL}/employee-auth/logout`,
        { refreshToken },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
}
