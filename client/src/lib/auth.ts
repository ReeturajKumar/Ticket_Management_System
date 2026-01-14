/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const accessToken = localStorage.getItem('accessToken')
  const user = localStorage.getItem('user')
  return !!(accessToken && user)
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser() {
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Get access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

/**
 * Clear all auth data (logout)
 */
export function clearAuthData() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

/**
 * Logout and redirect to login
 */
export async function logout() {
  // Import dynamically to avoid circular dependency
  const { logoutUser } = await import('@/services/authService')
  await logoutUser()
  window.location.href = '/login'
}
