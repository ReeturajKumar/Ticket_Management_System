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
      role: 'ADMIN' | 'SUPER_ADMIN'
    }
    accessToken?: string
    refreshToken?: string
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
    throw new Error(error.response?.data?.message || 'Admin login failed')
  }
}

/**
 * Refresh admin token
 */
export async function refreshAdminToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('admin_refreshToken')
    if (!refreshToken) {
      return null
    }

    const response = await axios.post(`${API_URL}/admin-auth/refresh`, {
      refreshToken,
    })

    if (response.data.success && response.data.data.accessToken) {
      localStorage.setItem('admin_accessToken', response.data.data.accessToken)
      if (response.data.data.refreshToken) {
        localStorage.setItem('admin_refreshToken', response.data.data.refreshToken)
      }
      return response.data.data.accessToken
    }

    return null
  } catch (error: any) {
    // If refresh fails, clear tokens
    localStorage.removeItem('admin_accessToken')
    localStorage.removeItem('admin_refreshToken')
    localStorage.removeItem('admin_user')
    return null
  }
}

/**
 * Logout admin user
 */
export async function logoutAdminUser(): Promise<void> {
  const refreshToken = localStorage.getItem('admin_refreshToken')
  const accessToken = localStorage.getItem('admin_accessToken')
  
  if (refreshToken && accessToken) {
    try {
      await axios.post(
        `${API_URL}/admin-auth/logout`,
        { refreshToken },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    } catch (error: any) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error)
    }
  }

  // Clear local storage
  localStorage.removeItem('admin_accessToken')
  localStorage.removeItem('admin_refreshToken')
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
  return !!localStorage.getItem('admin_accessToken')
}

/**
 * Store admin user data after login
 */
export function storeAdminUser(user: any, accessToken: string, refreshToken: string): void {
  localStorage.setItem('admin_user', JSON.stringify(user))
  localStorage.setItem('admin_accessToken', accessToken)
  localStorage.setItem('admin_refreshToken', refreshToken)
}
