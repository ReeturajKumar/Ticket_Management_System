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
  const { autoConnect = true } = options
  const { user, isAuthenticated } = useAuth()
  const [isConnected, setIsConnected] = useState(false)

  // Sync connection state with current socket
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsConnected(false)
      return
    }

    const socket = getSocket()
    
    // Function to update local state based on actual socket state
    const updateStatus = () => {
      const currentSocket = getSocket()
      setIsConnected(currentSocket?.connected || false)
    }

    // Initial check
    updateStatus()

    if (socket) {
      // Listen for status changes
      socket.on('connect', updateStatus)
      socket.on('authenticated', updateStatus)
      socket.on('disconnect', updateStatus)

      // Handle auto-connect if requested and not connected
      if (autoConnect && !socket.connected) {
        connectSocket(user.id, user.department)
      }

      return () => {
        socket.off('connect', updateStatus)
        socket.off('authenticated', updateStatus)
        socket.off('disconnect', updateStatus)
      }
    } else if (autoConnect) {
      // Create new socket
      connectSocket(user.id, user.department)
      
      // We'll catch the 'connect' event on the next render through getSocket()
      // But let's check again in a moment
      const timer = setTimeout(updateStatus, 500)
      return () => clearTimeout(timer)
    }
  }, [autoConnect, isAuthenticated, user?.id, user?.department])

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
  /** Callback when comment is added to any ticket */
  onCommentAdded?: (data: TicketCommentAddedEvent) => void
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
    onCommentAdded,
    showNotifications = true,
    onRefresh,
  } = options

  const { user } = useAuth()
  const { isConnected } = useSocketConnection({ autoConnect: false }) // Just get state
  const refreshRef = useRef(onRefresh)
  
  // Keep refs updated
  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user || !isConnected) return

    const unsubscribers: (() => void)[] = []

    // Ticket created
    unsubscribers.push(
      subscribeToEvent<TicketCreatedEvent>('ticket:created', (data) => {
        console.log('[WebSocket] ticket:created event received:', data);
        
        // Different logic for employees vs department users
        let shouldNotify = false;
        let shouldRefresh = false;
        
        // Check if the current user is the one who triggered this event
        const currentUserId = user.id || (user as any)._id || (user as any).userId;
        // For ticket creations, authorId in the payload contains the ID of the creator
        const actorId = (data as any).senderId || data.authorId;
        const isSelfAction = actorId && currentUserId && actorId.toString() === currentUserId.toString();

        // Different logic for employees vs department users
        if (user.role === 'DEPARTMENT_USER' && user.department) {
           // Refresh if:
           // 1. Ticket is in same department (for department tickets)
           // 2. Current user created it (for internal requests/my requests)
           shouldRefresh = data.department === user.department || isSelfAction;
           // Only notify if someone else created it in same department
           shouldNotify = data.department === user.department && !isSelfAction;
        }
        else if (user.role === 'EMPLOYEE') {
           // For employees, refresh if it's for them
           shouldRefresh = data.authorId === user.id;
           // Notify if someone else created it
           shouldNotify = shouldRefresh && !isSelfAction;
        }
          
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
        
        // Always refresh if it's relevant to this user/department
        if (shouldRefresh) {
          console.log('[WebSocket] Refreshing dashboard due to ticket:created');
          refreshRef.current?.()
        } else {
          console.log('[WebSocket] Skipping refresh - not relevant to current user/department');
        }
      })
    )

    // Ticket assigned
    unsubscribers.push(
      subscribeToEvent<TicketAssignedEvent>('ticket:assigned', (data) => {
        console.log('[WebSocket] ticket:assigned event received:', data);
        const currentUserId = user.id || (user as any)._id || (user as any).userId;
        const actorId = (data as any).senderId || (data as any).assignedBy;
        const isSelfAction = actorId && currentUserId && actorId.toString() === currentUserId.toString();
        
        let shouldNotify = false;
        let shouldRefresh = false;
        
        // Refresh if in same department or assigned to current user
        if (user.role === 'DEPARTMENT_USER' && user.department) {
          shouldRefresh = data.department === user.department;
          shouldNotify = data.assigneeId === currentUserId && !isSelfAction;
        } else if (user.role === 'EMPLOYEE') {
          shouldRefresh = data.assigneeId === currentUserId;
          shouldNotify = shouldRefresh && !isSelfAction;
        }
        
        if (showNotifications && shouldNotify) {
          toast.info(`Ticket assigned to you: ${data.subject}`, {
            autoClose: 5000,
          })
        }
        onTicketAssigned?.(data)
        if (shouldRefresh) {
          console.log('[WebSocket] Refreshing dashboard due to ticket:assigned');
          refreshRef.current?.()
        }
      })
    )

    // Ticket status changed
    unsubscribers.push(
      subscribeToEvent<TicketStatusChangedEvent>('ticket:status-changed', (data) => {
        console.log('[WebSocket] ticket:status-changed event received:', data);
        const currentUserId = user.id || (user as any)._id || (user as any).userId;
        const actorId = (data as any).senderId || (data as any).changedBy;
        const isSelfAction = actorId && currentUserId && actorId.toString() === currentUserId.toString();

        let shouldRefresh = false;
        
        // Always refresh if in same department
        if (user.role === 'DEPARTMENT_USER' && user.department) {
          shouldRefresh = data.department === user.department;
        } else if (user.role === 'EMPLOYEE') {
          shouldRefresh = true; // Employees should refresh for any status change
        }

        if (showNotifications && !isSelfAction && shouldRefresh) {
          toast.info(
            `Ticket status changed: ${data.previousStatus} → ${data.newStatus}`,
            { autoClose: 3000 }
          )
        }
        onTicketStatusChanged?.(data)
        if (shouldRefresh) {
          console.log('[WebSocket] Refreshing dashboard due to ticket:status-changed');
          refreshRef.current?.()
        }
      })
    )

    // Ticket priority changed
    unsubscribers.push(
      subscribeToEvent<TicketPriorityChangedEvent>('ticket:priority-changed', (data) => {
        console.log('[WebSocket] ticket:priority-changed event received:', data);
        const currentUserId = user.id || (user as any)._id || (user as any).userId;
        const actorId = (data as any).senderId || (data as any).changedBy;
        const isSelfAction = actorId && currentUserId && actorId.toString() === currentUserId.toString();

        let shouldRefresh = false;
        
        // Always refresh if in same department
        if (user.role === 'DEPARTMENT_USER' && user.department) {
          shouldRefresh = data.department === user.department;
        } else if (user.role === 'EMPLOYEE') {
          shouldRefresh = true; // Employees should refresh for any priority change
        }

        if (showNotifications && !isSelfAction && shouldRefresh) {
          toast.info(
            `Ticket priority changed: ${data.previousPriority} → ${data.newPriority}`,
            { autoClose: 3000 }
          )
        }
        onTicketPriorityChanged?.(data)
        if (shouldRefresh) {
          console.log('[WebSocket] Refreshing dashboard due to ticket:priority-changed');
          refreshRef.current?.()
        }
      })
    )

    // Ticket comment added
    unsubscribers.push(
      subscribeToEvent<TicketCommentAddedEvent>('ticket:comment-added', (data) => {
        // Toast notification disabled as per request - using bell icon notifications instead
        /*
        if (showNotifications && data.authorId !== user.id) {
          toast.info(`New comment on ticket "${data.ticketSubject}" by ${data.authorName}`, {
            autoClose: 4000,
          })
        }
        */
        onCommentAdded?.(data)
        refreshRef.current?.()
      })
    )

    // Cleanup
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [user, isConnected, showNotifications, onTicketCreated, onTicketAssigned, onTicketStatusChanged, onTicketPriorityChanged, onCommentAdded])
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
  const { isConnected } = useSocketConnection({ autoConnect: false })
  const [viewers, setViewers] = useState<string[]>([])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !ticketId || !user || !isConnected) return

    // Join ticket room for detailed updates
    joinTicketRoom(ticketId)

    const unsubscribers: (() => void)[] = []

    // Comment added
    unsubscribers.push(
      subscribeToEvent<TicketCommentAddedEvent>('ticket:comment-added', (data) => {
        if (data.ticketId === ticketId) {
          // Toast notifications disabled - using header notifications
          /*
          if (showNotifications && data.authorId !== user.id) {
            toast.info(`New comment from ${data.authorName}`, { autoClose: 3000 })
          }
          */
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
  }, [ticketId, user, isConnected, showNotifications, onCommentAdded, onStatusChanged, onViewersChanged])

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
