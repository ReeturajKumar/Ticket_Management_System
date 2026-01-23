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
      role: 'DEPARTMENT_USER'
      department: string
      isHead: boolean
    }
    accessToken?: string
    refreshToken?: string
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
    throw new Error(error.response?.data?.message || 'Department login failed')
  }
}

/**
 * Logout department user
 */
export async function logoutDepartmentUser(): Promise<void> {
  const refreshToken = localStorage.getItem('dept_refreshToken')
  const accessToken = localStorage.getItem('dept_accessToken')
  
  if (refreshToken && accessToken) {
    try {
      await axios.post(
        `${API_URL}/department-auth/logout`,
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
  
  // Clear department local storage
  localStorage.removeItem('dept_accessToken')
  localStorage.removeItem('dept_refreshToken')
  localStorage.removeItem('dept_user')
}

/**
 * Request password reset email
 */
export async function forgotPasswordDepartment(email: string): Promise<DepartmentAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/department-auth/forgot-password`, { email })

    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to send reset email')
  }
}

/**
 * Reset password with token
 */
export async function resetPasswordDepartment(token: string, newPassword: string): Promise<DepartmentAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/department-auth/reset-password`, {
      token,
      newPassword,
    })

    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to reset password')
  }
}

/**
 * Store department authentication tokens in localStorage
 * NOTE: Using separate keys 'dept_*' to avoid conflict with student auth
 */
export function storeDepartmentTokens(accessToken: string, refreshToken: string, user: any) {
  localStorage.setItem('dept_accessToken', accessToken)
  localStorage.setItem('dept_refreshToken', refreshToken)
  localStorage.setItem('dept_user', JSON.stringify(user))
}

/**
 * Get current department user from storage
 */
export function getCurrentDepartmentUser() {
  const userStr = localStorage.getItem('dept_user')
  return userStr ? JSON.parse(userStr) : null
}

/**
 * Check if department user is authenticated
 */
export function isDepartmentAuthenticated(): boolean {
  return !!localStorage.getItem('dept_accessToken')
}

/**
 * Register department user
 */
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
    throw new Error(error.response?.data?.message || 'Registration failed')
  }
}

/**
 * Verify OTP
 */
export async function verifyDepartmentOTP(email: string, otp: string): Promise<DepartmentAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/department-auth/verify-otp`, { email, otp })

    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'OTP verification failed')
  }
}

/**
 * Resend OTP
 */
export async function resendDepartmentOTP(email: string): Promise<DepartmentAuthResponse> {
  try {
    const response = await axios.post(`${API_URL}/department-auth/resend-otp`, { email })

    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to resend OTP')
  }
}

/**
 * Check Registration Status
 */
export async function getRegistrationStatus(email: string): Promise<DepartmentAuthResponse> {
  try {
    const response = await axios.get(`${API_URL}/department-auth/status?email=${encodeURIComponent(email)}`)

    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to check status')
  }
}

/**
 * Refresh Token
 */
export async function refreshDepartmentToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('dept_refreshToken')
  if (!refreshToken) return null

  try {
    const response = await axios.post(`${API_URL}/department-auth/refresh`, {
      refreshToken,
    })

    if (response.data?.success && response.data?.data?.accessToken) {
      localStorage.setItem('dept_accessToken', response.data.data.accessToken)
      if (response.data.data.refreshToken) {
        localStorage.setItem('dept_refreshToken', response.data.data.refreshToken)
      }
      return response.data.data.accessToken
    }
  } catch (error) {
    console.error('Token refresh failed', error)
  }
  
  return null
}

/**
 * Change Password
 */
export async function changePasswordDepartment(currentPassword: string, newPassword: string): Promise<DepartmentAuthResponse> {
  const accessToken = localStorage.getItem('dept_accessToken')
  
  try {
    const response = await axios.patch(
      `${API_URL}/department-auth/change-password`,
      { currentPassword, newPassword },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to change password')
  }
}
