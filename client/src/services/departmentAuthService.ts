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
  const response = await fetch(`${API_URL}/department-auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Department login failed')
  }

  return result
}

/**
 * Logout department user
 */
export async function logoutDepartmentUser(): Promise<void> {
  const refreshToken = localStorage.getItem('dept_refreshToken')
  const accessToken = localStorage.getItem('dept_accessToken')
  
  if (refreshToken && accessToken) {
    try {
      await fetch(`${API_URL}/department-auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ refreshToken }),
      })
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
  const response = await fetch(`${API_URL}/department-auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to send reset email')
  }

  return result
}

/**
 * Reset password with token
 */
export async function resetPasswordDepartment(token: string, newPassword: string): Promise<DepartmentAuthResponse> {
  const response = await fetch(`${API_URL}/department-auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to reset password')
  }

  return result
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
  const response = await fetch(`${API_URL}/department-auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Registration failed')
  }

  return result
}

/**
 * Verify OTP
 */
export async function verifyDepartmentOTP(email: string, otp: string): Promise<DepartmentAuthResponse> {
  const response = await fetch(`${API_URL}/department-auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, otp }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'OTP verification failed')
  }

  return result
}

/**
 * Resend OTP
 */
export async function resendDepartmentOTP(email: string): Promise<DepartmentAuthResponse> {
  const response = await fetch(`${API_URL}/department-auth/resend-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to resend OTP')
  }

  return result
}

/**
 * Check Registration Status
 */
export async function getRegistrationStatus(email: string): Promise<DepartmentAuthResponse> {
  const response = await fetch(`${API_URL}/department-auth/status?email=${encodeURIComponent(email)}`)
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to check status')
  }

  return result
}

/**
 * Refresh Token
 */
export async function refreshDepartmentToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('dept_refreshToken')
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_URL}/department-auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    const result = await response.json()

    if (response.ok && result.success && result.data?.accessToken) {
      localStorage.setItem('dept_accessToken', result.data.accessToken)
      if (result.data.refreshToken) {
        localStorage.setItem('dept_refreshToken', result.data.refreshToken)
      }
      return result.data.accessToken
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
  
  const response = await fetch(`${API_URL}/department-auth/change-password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to change password')
  }

  return result
}
