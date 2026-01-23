/**
 * Auth utilities for Department Users
 * Note: Student auth has been removed - students now use a public form
 */

/**
 * Check if department user is authenticated
 */
export function isDepartmentAuthenticated(): boolean {
  const accessToken = localStorage.getItem('dept_accessToken')
  const user = localStorage.getItem('dept_user')
  return !!(accessToken && user)
}

/**
 * Get current department user from localStorage
 */
export function getDepartmentUser() {
  const userStr = localStorage.getItem('dept_user')
  if (!userStr) return null
  
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Get department access token
 */
export function getDepartmentAccessToken(): string | null {
  return localStorage.getItem('dept_accessToken')
}

/**
 * Clear all department auth data (logout)
 */
export function clearDepartmentAuthData() {
  localStorage.removeItem('dept_accessToken')
  localStorage.removeItem('dept_refreshToken')
  localStorage.removeItem('dept_user')
}

/**
 * Logout department user and redirect to login
 */
export async function logoutDepartment() {
  const { logoutDepartmentUser } = await import('@/services/departmentAuthService')
  await logoutDepartmentUser()
  window.location.href = '/department/login'
}
