import { fetchWithAuth } from "@/lib/tokenRefresh"

const API_URL = import.meta.env.VITE_API_URL

interface ProfileResponse {
  success: boolean
  message?: string
  data?: {
    user: {
      id: string
      name: string
      email: string
      role: string
      department?: string
      isVerified: boolean
      createdAt: string
      updatedAt: string
    }
  }
}

/**
 * Get user profile
 */
export async function getProfile(): Promise<ProfileResponse> {
  const response = await fetchWithAuth(`${API_URL}/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch profile')
  }

  return result
}

/**
 * Update user profile (name only)
 */
export async function updateProfile(name: string): Promise<ProfileResponse> {
  const response = await fetchWithAuth(`${API_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to update profile')
  }

  return result
}

/**
 * Change user password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ProfileResponse> {
  const response = await fetchWithAuth(`${API_URL}/profile/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to change password')
  }

  return result
}
