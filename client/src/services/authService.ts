import type { SignUpFormData } from "@/lib/validations/auth"

const API_URL = import.meta.env.VITE_API_URL

interface AuthResponse {
  success: boolean
  message: string
  data?: {
    email?: string
    otpExpiresIn?: string
    user?: {
      id: string
      name: string
      email: string
      role: string
      department?: string
    }
    accessToken?: string
    refreshToken?: string
  }
}

/**
 * Register a new user (sends OTP to email)
 */
export async function registerUser(data: SignUpFormData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      password: data.password,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Registration failed')
  }

  return result
}

/**
 * Verify OTP and complete registration
 */
export async function verifyOTP(email: string, otp: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      otp,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'OTP verification failed')
  }

  return result
}

/**
 * Resend OTP to user's email
 */
export async function resendOTP(email: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/resend-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to resend OTP')
  }

  return result
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
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
    throw new Error(result.message || 'Login failed')
  }

  return result
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken')
  
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
  
  // Clear local storage regardless of API call success
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

/**
 * Request password reset email
 */
export async function forgotPassword(email: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
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
export async function resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
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
 * Store authentication tokens in localStorage
 */
export function storeAuthTokens(accessToken: string, refreshToken: string, user: any) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  localStorage.setItem('user', JSON.stringify(user))
}
