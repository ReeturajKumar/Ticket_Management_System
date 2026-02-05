import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { toast } from 'react-toastify'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

interface ClientConfig {
  storagePrefix: string // 'admin' or 'dept'
  loginRedirect: string
  onAuthFailure?: () => void
}

/**
 * Creates a configured Axios instance with:
 * - Automatic Bearer token attachment
 * - Global error handling (toasts)
 * - Rate limit handling
 */
export function createAPIClient(config: ClientConfig) {
  const { storagePrefix, loginRedirect } = config
  
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Rate limiting state
  let rateLimitedUntil: number | null = null

  const clearAuthAndRedirect = () => {
    localStorage.removeItem(`${storagePrefix}_token`)
    localStorage.removeItem(`${storagePrefix}_user`)
    if (config.onAuthFailure) config.onAuthFailure()
    window.location.href = loginRedirect
  }

  // --- REQUEST INTERCEPTOR ---
  client.interceptors.request.use(
    (axiosConfig: InternalAxiosRequestConfig) => {
      // Check rate limit
      if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
        const waitTime = Math.ceil((rateLimitedUntil - Date.now()) / 1000)
        return Promise.reject(new Error(`Rate limited. Wait ${waitTime}s.`))
      }

      const token = localStorage.getItem(`${storagePrefix}_token`)
      if (token && axiosConfig.headers) {
        axiosConfig.headers.Authorization = `Bearer ${token}`
      }

      (axiosConfig as any).metadata = { startTime: Date.now() }
      return axiosConfig
    },
    (error) => Promise.reject(error)
  )

  // --- RESPONSE INTERCEPTOR ---
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      rateLimitedUntil = null
      return response
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as any
      const status = error.response?.status

      // 1. Handle Rate Limiting (429)
      if (status === 429) {
        const retryAfter = Number(error.response?.headers?.['retry-after']) || 60
        rateLimitedUntil = Date.now() + (retryAfter * 1000)
        toast.error(`Too many requests. Please wait ${retryAfter}s.`, { toastId: 'rate-limit' })
        return Promise.reject(error)
      }

      // 2. Handle Unauthorized (401)
      if (status === 401 && !originalRequest._retry) {
        clearAuthAndRedirect()
        return Promise.reject(error)
      }

      // 3. Handle Forbidden (403)
      if (status === 403) {
        toast.error('Access denied. You do not have permission.', { toastId: 'forbidden' })
      }

      // 4. Handle Server Errors (5xx)
      if (status && status >= 500) {
        toast.error('Server error. Please try again later.', { toastId: 'server-error' })
      }

      // 5. Handle Network Errors
      if (!error.response) {
        toast.error('Network error. Check your connection.', { toastId: 'network-error' })
      }

      return Promise.reject(error)
    }
  )

  return client
}
