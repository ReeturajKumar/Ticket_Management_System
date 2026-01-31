import { useEffect, useCallback, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  connectSocket,
  disconnectSocket,
  getSocket,
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
  const [isConnected, setIsConnected] = useState(false) // Start as false, will update when connected
  const connectionAttempted = useRef<string | null>(null) // Track which user we attempted to connect for

  console.log('🔌 Socket connection hook initialized', { 
    autoConnect, 
    isAuthenticated, 
    userId: user?.id, 
    department: user?.department 
  })

  // Connect to socket when authenticated
  useEffect(() => {
    if (!autoConnect || !isAuthenticated || !user) {
      setIsConnected(false)
      return
    }

    // Check if socket already exists and is connected
    const existingSocket = getSocket()
    if (existingSocket?.connected) {
      console.log('🔌 Socket already connected, skipping reconnection')
      setIsConnected(true)
      return
    }

    // Reset connection attempt if user changed (logout/login scenario)
    const userKey = `${user.id}-${user.department || 'no-dept'}`
    if (connectionAttempted.current !== userKey) {
      connectionAttempted.current = userKey
      // Disconnect existing socket if user changed
      if (existingSocket) {
        console.log('🔌 User changed, disconnecting existing socket')
        disconnectSocket()
      }
      // Reset connection state when user changes
      setIsConnected(false)
    } else {
      // Already attempted for this user, check current status immediately
      const currentSocket = getSocket()
      if (currentSocket?.connected) {
        setIsConnected(true)
        return
      }
      // If not connected, continue to set up connection
    }

    const socket = connectSocket(user.id, user.department)

    if (socket) {
      // Listen for connection state changes - set up IMMEDIATELY
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

      // Set up event listeners FIRST, before checking state
      // This ensures we catch the connect event even if it fires immediately
      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
      
      // Also listen for 'authenticated' event (fires after successful auth)
      const handleAuthenticated = () => {
        // Socket is fully authenticated and ready
        setIsConnected(true)
      }
      socket.on('authenticated', handleAuthenticated)

      // Check initial state immediately - socket might already be connected
      // Do this AFTER setting up listeners so we catch any immediate connections
      // Use multiple quick checks to catch fast connections
      const checkConnectionState = () => {
        const currentSocket = getSocket()
        if (currentSocket?.connected) {
          setIsConnected(true)
          return true
        }
        return false
      }

      // Store all timeouts/intervals for cleanup
      const quickCheckTimeouts: ReturnType<typeof setTimeout>[] = []
      let checkInterval: ReturnType<typeof setInterval> | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      // Check immediately (synchronous check)
      const isAlreadyConnected = checkConnectionState()
      
      // Also check after a microtask (next event loop tick) to catch very fast connections
      setTimeout(() => checkConnectionState(), 0)
      
      // If not connected yet, set up aggressive checking
      if (!isAlreadyConnected) {
        // Not connected yet - set up aggressive checking
        // Check multiple times quickly to catch fast connections
        const quickChecks = [0, 25, 50, 100, 150, 200, 300, 500] // Check at these intervals (ms)
        
        quickChecks.forEach((delay) => {
          const timeoutId = setTimeout(() => {
            if (checkConnectionState() && delay > 0 && showToasts) {
              toast.success('Real-time updates connected', { autoClose: 2000 })
            }
          }, delay)
          quickCheckTimeouts.push(timeoutId)
        })

        // Also use interval for ongoing check (in case connection takes longer)
        checkInterval = setInterval(() => {
          if (checkConnectionState()) {
            if (showToasts) {
              toast.success('Real-time updates connected', { autoClose: 2000 })
            }
            // Stop checking once connected
            if (checkInterval) {
              clearInterval(checkInterval)
              checkInterval = null
            }
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            // Clear quick check timeouts
            quickCheckTimeouts.forEach(clearTimeout)
          }
        }, 50) // Very fast check (50ms) for immediate feedback

        // Clear interval after 2 seconds (connection should happen quickly)
        timeoutId = setTimeout(() => {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        }, 2000)
      }

      // Return cleanup function
      return () => {
        quickCheckTimeouts.forEach(clearTimeout)
        if (checkInterval) {
          clearInterval(checkInterval)
        }
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
        socket.off('authenticated', handleAuthenticated)
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
  
  // Keep refs updated
  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user) return

    console.log('🔌 Setting up real-time ticket listeners for user:', user.id, user.department)

    const unsubscribers: (() => void)[] = []

    // Ticket created
    unsubscribers.push(
      subscribeToEvent<TicketCreatedEvent>('ticket:created', (data) => {
        console.log('🎫 Ticket created event received:', data)
        console.log('👤 Current user:', user.id, user.department)
        
        // Different logic for employees vs department users
        const shouldNotify = user.department 
          ? data.department === user.department  // Department users only get their department's tickets
          : data.createdBy === user.id     // Employees only get their own tickets
          
        if (showNotifications && shouldNotify) {
          toast.info(`New ticket: ${data.subject}`, {
            autoClose: 5000,
            onClick: () => {
              // Could navigate to ticket
              window.location.href = `/employee/tickets`
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
        // Debug logging to track events
        console.log('🎫 Ticket assigned event received:', data)
        console.log('👤 Current user:', user.id, user.department)
        
        // For ticket assignment, notify if assigned to this user (regardless of department)
        const shouldNotify = data.assigneeId === user.id
        
        if (showNotifications && shouldNotify) {
          toast.info(`Ticket assigned to you: ${data.subject}`, {
            autoClose: 5000,
          })
        }
        onTicketAssigned?.(data)
        refreshRef.current?.()
      })
    )

    // Ticket status changed - for employees, check if they created the ticket or it's assigned to them
    unsubscribers.push(
      subscribeToEvent<TicketStatusChangedEvent>('ticket:status-changed', (data) => {
        // Note: We don't have ticket creator/assignee info in this event, so employees get all status changes
        // In a real implementation, you'd want to filter by user involvement
        if (showNotifications) {
          toast.info(
            `Ticket status changed: ${data.previousStatus} → ${data.newStatus}`,
            { autoClose: 3000 }
          )
        }
        onTicketStatusChanged?.(data)
        refreshRef.current?.()
      })
    )

    // Ticket priority changed - similar logic to status changes
    unsubscribers.push(
      subscribeToEvent<TicketPriorityChangedEvent>('ticket:priority-changed', (data) => {
        if (showNotifications) {
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
  }, [user, showNotifications, onTicketCreated, onTicketAssigned, onTicketStatusChanged, onTicketPriorityChanged])
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
