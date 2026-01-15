import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { refreshDepartmentToken } from './departmentAuthService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

// Create axios instance for department APIs
const departmentAxios = axios.create({
  baseURL: API_BASE_URL,
})

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Request interceptor to add token
departmentAxios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('dept_accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
departmentAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config

    // Check if error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
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
          localStorage.removeItem('dept_accessToken')
          localStorage.removeItem('dept_refreshToken')
          localStorage.removeItem('dept_user')
          window.location.href = '/department/login'
          return Promise.reject(error)
        }
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('dept_accessToken')
        localStorage.removeItem('dept_refreshToken')
        localStorage.removeItem('dept_user')
        window.location.href = '/department/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default departmentAxios
