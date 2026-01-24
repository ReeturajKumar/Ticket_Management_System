import { useEffect, useCallback, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  subscribeToEvent,
  joinTicketRoom,
  leaveTicketRoom,
  type TicketCreatedEvent,
  type TicketAssignedEvent,
  type TicketStatusChangedEvent,
  type TicketPriorityChangedEvent,
  type TicketCommentAddedEvent,
  type BulkOperationEvent,
} from '@/services/socket'
import { useAuth } from '@/contexts/AuthContext'

// ============================================================================
// SOCKET CONNECTION HOOK
// Manages socket connection lifecycle with auth state
// ============================================================================

interface UseSocketConnectionOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean
  /** Show connection status toasts (default: false) */
  showToasts?: boolean
}

/**
 * useSocketConnection - Manages socket connection with auth state
 * Automatically connects when authenticated and disconnects on logout
 */
export function useSocketConnection(options: UseSocketConnectionOptions = {}) {
  const { autoConnect = true, showToasts = false } = options
  const { user, isAuthenticated } = useAuth()
  const [isConnected, setIsConnected] = useState(isSocketConnected())
  const connectionAttempted = useRef<string | null>(null) // Track which user we attempted to connect for

  // Connect to socket when authenticated
  useEffect(() => {
    if (!autoConnect || !isAuthenticated || !user) {
      return
    }

    // Reset connection attempt if user changed (logout/login scenario)
    const userKey = `${user.id}-${user.department}`
    if (connectionAttempted.current !== userKey) {
      connectionAttempted.current = userKey
    } else {
      // Already attempted for this user, just check current status
      const currentSocket = getSocket()
      if (currentSocket) {
        setIsConnected(currentSocket.connected)
      }
      return
    }

    const socket = connectSocket(user.id, user.department)

    if (socket) {
      // Listen for connection state changes
      const handleConnect = () => {
        setIsConnected(true)
        if (showToasts) {
          toast.success('Real-time updates connected', { autoClose: 2000 })
        }
      }

      const handleDisconnect = () => {
        setIsConnected(false)
        if (showToasts) {
          toast.warn('Real-time updates disconnected', { autoClose: 2000 })
        }
      }

      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)

      // Check initial state - socket might already be connected
      setIsConnected(socket.connected)

      // Also check periodically in case connection happens asynchronously
      // This handles the case where socket connects after the initial check
      // Only check if not already connected to avoid unnecessary checks
      let checkInterval: ReturnType<typeof setInterval> | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      if (!socket.connected) {
        checkInterval = setInterval(() => {
          const currentSocket = getSocket()
          if (currentSocket?.connected) {
            setIsConnected(true)
            if (showToasts) {
              toast.success('Real-time updates connected', { autoClose: 2000 })
            }
            // Stop checking once connected
            if (checkInterval) {
              clearInterval(checkInterval)
              checkInterval = null
            }
          }
        }, 500)

        // Clear interval after 5 seconds (connection should happen by then)
        timeoutId = setTimeout(() => {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        }, 5000)
      }

      // Return cleanup function
      return () => {
        if (checkInterval) {
          clearInterval(checkInterval)
        }
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
      }
    }
  }, [autoConnect, isAuthenticated, user?.id, user?.department, showToasts])

  // Disconnect when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket()
      setIsConnected(false)
      connectionAttempted.current = null // Reset on logout
    }
  }, [isAuthenticated])

  // Manual connect/disconnect
  const connect = useCallback(() => {
    if (user && isAuthenticated) {
      connectSocket(user.id, user.department)
    }
  }, [user, isAuthenticated])

  const disconnect = useCallback(() => {
    disconnectSocket()
    setIsConnected(false)
  }, [])

  return {
    isConnected,
    connect,
    disconnect,
  }
}

// ============================================================================
// REAL-TIME TICKET HOOKS
// Subscribe to ticket-related socket events
// ============================================================================

interface UseRealTimeTicketsOptions {
  /** Callback when new ticket is created */
  onTicketCreated?: (ticket: TicketCreatedEvent) => void
  /** Callback when ticket is assigned */
  onTicketAssigned?: (data: TicketAssignedEvent) => void
  /** Callback when ticket status changes */
  onTicketStatusChanged?: (data: TicketStatusChangedEvent) => void
  /** Callback when ticket priority changes */
  onTicketPriorityChanged?: (data: TicketPriorityChangedEvent) => void
  /** Show toast notifications (default: true) */
  showNotifications?: boolean
  /** Auto-refresh data callback */
  onRefresh?: () => void
}

/**
 * useRealTimeTickets - Subscribe to real-time ticket updates
 * Provides callbacks for ticket events and auto-refresh
 */
export function useRealTimeTickets(options: UseRealTimeTicketsOptions = {}) {
  const {
    onTicketCreated,
    onTicketAssigned,
    onTicketStatusChanged,
    onTicketPriorityChanged,
    showNotifications = true,
    onRefresh,
  } = options

  const { user } = useAuth()
  const refreshRef = useRef(onRefresh)
  const [socketReady, setSocketReady] = useState(false)
  
  // Keep refs updated
  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  // Monitor socket connection state
  useEffect(() => {
    const checkSocket = () => {
      const socket = getSocket()
      if (socket?.connected) {
        setSocketReady(true)
      }
    }
    
    // Check immediately
    checkSocket()
    
    // Also check periodically for late connections
    // Reduced from 500ms to 2000ms to reduce aggressive polling
    // Socket events should handle most connection state changes
    const interval = setInterval(checkSocket, 2000)
    
    // Listen for socket connection
    const socket = getSocket()
    if (socket) {
      const handleConnect = () => setSocketReady(true)
      const handleDisconnect = () => setSocketReady(false)
      
      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
      
      return () => {
        clearInterval(interval)
        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
      }
    }
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user || !socketReady) return

    const unsubscribers: (() => void)[] = []

    // Ticket created
    unsubscribers.push(
      subscribeToEvent<TicketCreatedEvent>('ticket:created', (data) => {
        if (showNotifications && data.department === user.department) {
          toast.info(`New ticket: ${data.subject}`, {
            autoClose: 5000,
            onClick: () => {
              // Could navigate to ticket
              window.location.href = `/department/tickets/${data.ticketId}`
            },
          })
        }
        onTicketCreated?.(data)
        refreshRef.current?.()
      })
    )

    // Ticket assigned
    unsubscribers.push(
      subscribeToEvent<TicketAssignedEvent>('ticket:assigned', (data) => {
        if (showNotifications) {
          if (data.assigneeId === user.id) {
            toast.info(`Ticket assigned to you: ${data.subject}`, {
              autoClose: 5000,
            })
          } else if (data.department === user.department) {
            toast.info(`Ticket assigned to ${data.assigneeName}`, {
              autoClose: 3000,
            })
          }
        }
        onTicketAssigned?.(data)
        refreshRef.current?.()
      })
    )

    // Ticket status changed
    unsubscribers.push(
      subscribeToEvent<TicketStatusChangedEvent>('ticket:status-changed', (data) => {
        if (showNotifications && data.department === user.department) {
          toast.info(
            `Ticket status changed: ${data.previousStatus} → ${data.newStatus}`,
            { autoClose: 3000 }
          )
        }
        onTicketStatusChanged?.(data)
        refreshRef.current?.()
      })
    )

    // Ticket priority changed
    unsubscribers.push(
      subscribeToEvent<TicketPriorityChangedEvent>('ticket:priority-changed', (data) => {
        if (showNotifications && data.department === user.department) {
          toast.info(
            `Ticket priority changed: ${data.previousPriority} → ${data.newPriority}`,
            { autoClose: 3000 }
          )
        }
        onTicketPriorityChanged?.(data)
        refreshRef.current?.()
      })
    )

    // Cleanup
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [user, showNotifications, socketReady, onTicketCreated, onTicketAssigned, onTicketStatusChanged, onTicketPriorityChanged])
}

// ============================================================================
// SINGLE TICKET REAL-TIME HOOK
// For detailed ticket view - receives comments, viewing users, etc.
// ============================================================================

interface UseRealTimeTicketOptions {
  ticketId: string
  onCommentAdded?: (comment: TicketCommentAddedEvent) => void
  onStatusChanged?: (data: TicketStatusChangedEvent) => void
  onViewersChanged?: (viewers: string[]) => void
  showNotifications?: boolean
}

/**
 * useRealTimeTicket - Subscribe to updates for a specific ticket
 * Joins ticket room and receives detailed updates
 */
export function useRealTimeTicket(options: UseRealTimeTicketOptions) {
  const {
    ticketId,
    onCommentAdded,
    onStatusChanged,
    onViewersChanged,
    showNotifications = true,
  } = options

  const { user } = useAuth()
  const [viewers, setViewers] = useState<string[]>([])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !ticketId || !user) return

    // Join ticket room for detailed updates
    joinTicketRoom(ticketId)

    const unsubscribers: (() => void)[] = []

    // Comment added
    unsubscribers.push(
      subscribeToEvent<TicketCommentAddedEvent>('ticket:comment-added', (data) => {
        if (data.ticketId === ticketId) {
          if (showNotifications && data.authorId !== user.id) {
            toast.info(`New comment from ${data.authorName}`, { autoClose: 3000 })
          }
          onCommentAdded?.(data)
        }
      })
    )

    // Status changed for this ticket
    unsubscribers.push(
      subscribeToEvent<TicketStatusChangedEvent>('ticket:status-changed', (data) => {
        if (data.ticketId === ticketId) {
          onStatusChanged?.(data)
        }
      })
    )

    // Viewers update
    unsubscribers.push(
      subscribeToEvent<{ ticketId: string; viewers: string[] }>('ticket:viewers-updated', (data) => {
        if (data.ticketId === ticketId) {
          setViewers(data.viewers)
          onViewersChanged?.(data.viewers)
        }
      })
    )

    // Cleanup
    return () => {
      leaveTicketRoom(ticketId)
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [ticketId, user, showNotifications, onCommentAdded, onStatusChanged, onViewersChanged])

  return { viewers }
}

// ============================================================================
// BULK OPERATIONS REAL-TIME HOOK
// Track progress of bulk operations
// ============================================================================

interface UseBulkOperationProgressOptions {
  onProgress?: (progress: BulkOperationEvent['progress']) => void
  onComplete?: (result: BulkOperationEvent['result']) => void
}

/**
 * useBulkOperationProgress - Track bulk operation progress in real-time
 */
export function useBulkOperationProgress(
  operationId: string | null,
  options: UseBulkOperationProgressOptions = {}
) {
  const { onProgress, onComplete } = options
  const [progress, setProgress] = useState<BulkOperationEvent['progress'] | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [result, setResult] = useState<BulkOperationEvent['result'] | null>(null)

  useEffect(() => {
    if (!operationId) return

    const socket = getSocket()
    if (!socket) return

    const unsubscribers: (() => void)[] = []

    // Progress updates
    unsubscribers.push(
      subscribeToEvent<BulkOperationEvent>('bulk-operation:progress', (data) => {
        if (data.operationId === operationId && data.progress) {
          setProgress(data.progress)
          onProgress?.(data.progress)
        }
      })
    )

    // Completion
    unsubscribers.push(
      subscribeToEvent<BulkOperationEvent>('bulk-operation:completed', (data) => {
        if (data.operationId === operationId) {
          setIsComplete(true)
          setResult(data.result || null)
          onComplete?.(data.result)
        }
      })
    )

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [operationId, onProgress, onComplete])

  return {
    progress,
    isComplete,
    result,
  }
}

// ============================================================================
// GENERIC SOCKET EVENT HOOK
// For subscribing to any socket event
// ============================================================================

/**
 * useSocketEvent - Generic hook for subscribing to socket events
 * 
 * @template T - Type of the event data payload (defaults to unknown for type safety)
 */
export function useSocketEvent<T = unknown>(
  event: string,
  callback: (data: T) => void,
  enabled = true
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    return subscribeToEvent<T>(event, (data) => {
      callbackRef.current(data)
    })
  }, [event, enabled])
}

export default {
  useSocketConnection,
  useRealTimeTickets,
  useRealTimeTicket,
  useBulkOperationProgress,
  useSocketEvent,
}
