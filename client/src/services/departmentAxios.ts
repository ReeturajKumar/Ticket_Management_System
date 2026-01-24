import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { toast } from 'react-toastify'
import { refreshDepartmentToken } from './departmentAuthService'

// ============================================================================
// DEPARTMENT AXIOS INSTANCE
// Configured with security features, rate limiting, and token management
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

// Create axios instance for department APIs
const departmentAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token refresh state
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

// Rate limiting state
let rateLimitedUntil: number | null = null
const RATE_LIMIT_TOAST_ID = 'rate-limit-toast'

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

/**
 * Handle rate limiting with user feedback
 */
const handleRateLimit = (error: AxiosError): void => {
  const response = error.response as AxiosResponse<any>
  const data = response?.data
  
  // Extract retry information from response
  const retryAfterHeader = response?.headers?.['retry-after']
  const retryAfterSeconds = data?.error?.retryAfterSeconds || 
                           data?.retryAfter || 
                           (retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60)
  
  const rateLimitRemaining = response?.headers?.['x-ratelimit-remaining']
  const rateLimitReset = response?.headers?.['x-ratelimit-reset']
  
  // Set rate limit expiry
  rateLimitedUntil = Date.now() + (retryAfterSeconds * 1000)
  
  // User-friendly message
  const message = retryAfterSeconds <= 60
    ? `Too many requests. Please wait ${retryAfterSeconds} seconds.`
    : `Too many requests. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`
  
  // Show toast (only one at a time)
  toast.error(message, {
    toastId: RATE_LIMIT_TOAST_ID,
    autoClose: Math.min(retryAfterSeconds * 1000, 10000),
  })
  
  // Log for debugging
  console.warn('Rate limited:', {
    retryAfterSeconds,
    remaining: rateLimitRemaining,
    resetAt: rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000) : null,
  })
}

/**
 * Handle network errors with user feedback
 */
const handleNetworkError = (error: AxiosError): void => {
  if (!error.response) {
    // Network error (no response from server)
    toast.error('Network error. Please check your connection.', {
      toastId: 'network-error',
      autoClose: 5000,
    })
  }
}

/**
 * Handle server errors (5xx)
 */
const handleServerError = (error: AxiosError): void => {
  const status = error.response?.status
  
  if (status && status >= 500) {
    toast.error('Server error. Please try again later.', {
      toastId: `server-error-${status}`,
      autoClose: 5000,
    })
  }
}

/**
 * Handle forbidden errors (403)
 */
const handleForbiddenError = (error: AxiosError): void => {
  const data = error.response?.data as any
  const message = data?.message || data?.error?.message || 'You do not have permission to perform this action.'
  
  toast.error(message, {
    toastId: 'forbidden-error',
    autoClose: 5000,
  })
}

/**
 * Clear auth data and redirect to login
 */
const clearAuthAndRedirect = (): void => {
  localStorage.removeItem('dept_accessToken')
  localStorage.removeItem('dept_refreshToken')
  localStorage.removeItem('dept_user')
  window.location.href = '/department/login'
}

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

departmentAxios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check if currently rate limited
    if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
      const waitTime = Math.ceil((rateLimitedUntil - Date.now()) / 1000)
      return Promise.reject(new Error(`Rate limited. Please wait ${waitTime} seconds.`))
    }
    
    // Add auth token
    const token = localStorage.getItem('dept_accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request timestamp for debugging
    (config as any).metadata = { startTime: Date.now() }
    
    return config
  },
  (error) => Promise.reject(error)
)

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

departmentAxios.interceptors.response.use(
  (response: AxiosResponse) => {
    // Clear rate limit if successful
    rateLimitedUntil = null
    
    // Log slow requests in development
    const config = response.config as any
    if (config.metadata) {
      const duration = Date.now() - config.metadata.startTime
      if (duration > 3000 && import.meta.env.DEV) {
        console.warn(`Slow request (${duration}ms):`, config.url)
      }
    }
    
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    const status = error.response?.status

    // Handle rate limiting (429)
    if (status === 429) {
      handleRateLimit(error)
      return Promise.reject(error)
    }

    // Handle network errors
    if (!error.response) {
      handleNetworkError(error)
      return Promise.reject(error)
    }

    // Handle server errors (5xx)
    if (status && status >= 500) {
      handleServerError(error)
      return Promise.reject(error)
    }

    // Handle forbidden (403)
    if (status === 403) {
      handleForbiddenError(error)
      return Promise.reject(error)
    }

    // Handle unauthorized (401) with token refresh
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return departmentAxios(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newAccessToken = await refreshDepartmentToken()
        
        if (newAccessToken) {
          processQueue(null, newAccessToken)
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          }
          return departmentAxios(originalRequest)
        } else {
          // Refresh failed, logout user
          processQueue(new Error('Token refresh failed'), null)
          clearAuthAndRedirect()
          return Promise.reject(error)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuthAndRedirect()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if currently rate limited
 */
export function isRateLimited(): boolean {
  return rateLimitedUntil !== null && Date.now() < rateLimitedUntil
}

/**
 * Get remaining rate limit wait time in seconds
 */
export function getRateLimitWaitTime(): number {
  if (!rateLimitedUntil || Date.now() >= rateLimitedUntil) {
    return 0
  }
  return Math.ceil((rateLimitedUntil - Date.now()) / 1000)
}

/**
 * Clear rate limit state (for testing)
 */
export function clearRateLimitState(): void {
  rateLimitedUntil = null
}

export default departmentAxios
