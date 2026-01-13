const API_URL = import.meta.env.VITE_API_URL

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: Error) => void
}> = []

const processQueue = (error: Error | null, token: string | null = null) => {
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
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken')

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Token refresh failed')
  }

  // Store new access token
  if (result.data?.accessToken) {
    localStorage.setItem('accessToken', result.data.accessToken)
  }

  return result.data.accessToken
}

/**
 * Fetch with automatic token refresh on 401
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = localStorage.getItem('accessToken')

  // Add authorization header
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  }

  // Make the request
  let response = await fetch(url, { ...options, headers })

  // If 401, try to refresh token
  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true

    try {
      const newToken = await refreshAccessToken()
      isRefreshing = false
      processQueue(null, newToken)

      // Retry the original request with new token
      const newHeaders = {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      }
      response = await fetch(url, { ...options, headers: newHeaders })
    } catch (error) {
      isRefreshing = false
      processQueue(error as Error, null)
      
      // Clear auth data and redirect to login
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
      
      throw error
    }
  } else if (response.status === 401 && isRefreshing) {
    // If already refreshing, queue this request
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: (token: string) => {
          const newHeaders = {
            ...options.headers,
            Authorization: `Bearer ${token}`,
          }
          resolve(fetch(url, { ...options, headers: newHeaders }))
        },
        reject: (error: Error) => {
          reject(error)
        },
      })
    })
  }

  return response
}
