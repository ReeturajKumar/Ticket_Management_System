import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface DepartmentAuthResponse {
  success: boolean
  message: string
  data?: {
    user?: {
      id: string
      name: string
      email: string
      role: 'DEPARTMENT_USER' | 'EMPLOYEE'
      department?: string
      isHead?: boolean
    }
    token?: string
    expiresAt?: string
  }
}

/**
 * Login department user
 */
export async function loginDepartmentUser(email: string, password: string): Promise<DepartmentAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/department-auth/login`, {
      email,
      password,
    })

    return response.data
  } catch (error: any) {
    const message = error.response?.data?.error?.userMessage || 
                   error.response?.data?.message || 
                   'Department login failed';
    throw new Error(message)
  }
}

/**
 * Logout department user
 */
export async function logoutDepartmentUser(): Promise<void> {
  localStorage.removeItem('dept_token')
  localStorage.removeItem('dept_user')
}

export function storeDepartmentTokens(token: string, user: any) {
  localStorage.setItem('dept_token', token)
  localStorage.setItem('dept_user', JSON.stringify(user))
}

export function getCurrentDepartmentUser() {
  const userStr = localStorage.getItem('dept_user')
  return userStr ? JSON.parse(userStr) : null
}

export function isDepartmentAuthenticated(): boolean {
  return !!localStorage.getItem('dept_token')
}

export async function registerDepartmentUser(data: {
  name: string
  email: string
  password: string
  department: string
  isHead: boolean
}): Promise<DepartmentAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/department-auth/register`, data)

    return response.data
  } catch (error: any) {
    const message = error.response?.data?.error?.userMessage || 
                   error.response?.data?.message || 
                   'Registration failed';
    throw new Error(message)
  }
}


