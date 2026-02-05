import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

interface AdminAuthResponse {
  success: boolean
  message: string
  data?: {
    user?: {
      id: string
      name: string
      email: string
      role: 'ADMIN'
    }
    token?: string
    expiresAt?: string
  }
}

/**
 * Login admin user
 */
export async function loginAdminUser(email: string, password: string, rememberMe: boolean = false): Promise<AdminAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/admin-auth/login`, {
      email,
      password,
      rememberMe,
    })

    return response.data
  } catch (error: any) {
    const message = error.response?.data?.error?.userMessage || 
                   error.response?.data?.message || 
                   'Admin login failed';
    throw new Error(message)
  }
}

/**
 * Logout admin user
 */
export async function logoutAdminUser(): Promise<void> {
  // Clear local storage
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
}

/**
 * Get current admin user from localStorage
 */
export function getCurrentAdminUser() {
  const userStr = localStorage.getItem('admin_user')
  return userStr ? JSON.parse(userStr) : null
}

/**
 * Check if admin user is authenticated
 */
export function isAdminAuthenticated(): boolean {
  return !!localStorage.getItem('admin_token')
}

/**
 * Store admin user data after login
 */
export function storeAdminUser(user: any, token: string): void {
  localStorage.setItem('admin_user', JSON.stringify(user))
  localStorage.setItem('admin_token', token)
}
