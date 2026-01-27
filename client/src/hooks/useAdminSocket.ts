import { useEffect } from 'react'
import { getSocket, subscribeToEvent, connectSocket } from '@/services/socket'
import { getCurrentAdminUser, isAdminAuthenticated } from '@/services/adminAuthService'

/**
 * Hook for admin users to listen to real-time user events
 */
export function useAdminSocketEvents(options: {
  onUserCreated?: () => void
  onUserUpdated?: () => void
} = {}) {
  const { onUserCreated, onUserUpdated } = options

  useEffect(() => {
    if (!isAdminAuthenticated()) return

    const adminUser = getCurrentAdminUser()
    if (!adminUser) return

    // Connect socket for admin user (no department needed)
    let socket = getSocket()
    if (!socket || !socket.connected) {
      socket = connectSocket(adminUser.id, undefined) // Admin users don't have department
      if (!socket) return
    }

    // Wait for connection if not connected
    if (!socket.connected) {
      const handleConnect = () => {
        socket?.emit('authenticate', { userId: adminUser.id, department: undefined })
      }
      socket.on('connect', handleConnect)
      
      // Also try to authenticate immediately if already connected
      if (socket.connected) {
        socket.emit('authenticate', { userId: adminUser.id, department: undefined })
      }

      return () => {
        socket?.off('connect', handleConnect)
      }
    } else {
      // Already connected, authenticate immediately
      socket.emit('authenticate', { userId: adminUser.id, department: undefined })
    }

    // Subscribe to user events
    const unsubscribers: (() => void)[] = []

    if (onUserCreated) {
      unsubscribers.push(
        subscribeToEvent('user:created', () => {
          onUserCreated()
        })
      )
    }

    if (onUserUpdated) {
      unsubscribers.push(
        subscribeToEvent('user:updated', () => {
          onUserUpdated()
        })
      )
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [onUserCreated, onUserUpdated])
}
