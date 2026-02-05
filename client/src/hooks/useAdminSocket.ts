import { useEffect } from 'react'
import { getSocket, subscribeToEvent } from '@/services/socket'
import { useAuth } from '@/contexts/AuthContext'


export function useAdminSocketEvents(options: {
  onUserCreated?: () => void
  onUserUpdated?: () => void
  onTicketCreated?: () => void
  onTicketUpdated?: () => void
} = {}) {
  const { onUserCreated, onUserUpdated, onTicketCreated, onTicketUpdated } = options
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'ADMIN') {
      return
    }

    // Wait a bit for socket to be ready
    const setupTimeout = setTimeout(() => {
      const socket = getSocket()
      if (!socket || !socket.connected) {
        return
      }

      const unsubscribers: (() => void)[] = []

      if (onUserCreated) {
        unsubscribers.push(
          subscribeToEvent('user:created', onUserCreated)
        )
      }

      if (onUserUpdated) {
        unsubscribers.push(
          subscribeToEvent('user:updated', onUserUpdated)
        )
      }

      if (onTicketCreated) {
        unsubscribers.push(
          subscribeToEvent('ticket:created', onTicketCreated)
        )
      }

      if (onTicketUpdated) {
        unsubscribers.push(
          subscribeToEvent('ticket:updated', onTicketUpdated)
        )
        unsubscribers.push(
          subscribeToEvent('ticket:status-changed', onTicketUpdated)
        )
        unsubscribers.push(
          subscribeToEvent('ticket:priority-changed', onTicketUpdated)
        )
        unsubscribers.push(
          subscribeToEvent('ticket:assigned', onTicketUpdated)
        )
      }

      // Cleanup function
      return () => {
        unsubscribers.forEach((unsubscribe) => unsubscribe())
      }
    }, 500)

    return () => {
      clearTimeout(setupTimeout)
    }
  }, [user?.id, onUserCreated, onUserUpdated, onTicketCreated, onTicketUpdated]) // Include all callback dependencies
}
