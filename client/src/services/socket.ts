import { io, Socket } from 'socket.io-client'

// ============================================================================
// SOCKET.IO CLIENT SERVICE
// Manages WebSocket connection for real-time updates
// ============================================================================

// Socket instance (singleton)
let socket: Socket | null = null

// Connection state
let isConnecting = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000

// Event listeners registry (for cleanup)
const eventListeners = new Map<string, Set<Function>>()

// Socket configuration
// Extract base URL from API URL (remove /api/v1 path if present)
function getSocketUrl(): string {
  const wsUrl = import.meta.env.VITE_WS_URL
  if (wsUrl) return wsUrl
  
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    try {
      const url = new URL(apiUrl)
      // Return only origin (protocol + host + port), without any path
      return url.origin
    } catch {
      // If URL parsing fails, try to extract base manually
      const match = apiUrl.match(/^(https?:\/\/[^\/]+)/)
      if (match) return match[1]
    }
  }
  
  return 'http://localhost:5000'
}

const SOCKET_URL = getSocketUrl()

/**
 * Connect to the WebSocket server
 * Creates a new connection if one doesn't exist
 */
export function connectSocket(userId: string, department: string): Socket | null {
  // Return existing connected socket
  if (socket?.connected) {
    return socket
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return socket
  }

  isConnecting = true
  const token = localStorage.getItem('dept_accessToken')

  if (!token) {
    console.warn('Cannot connect socket: No access token')
    isConnecting = false
    return null
  }

  try {
    socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
      timeout: 10000,
    })

    // Connection event handlers
    socket.on('connect', () => {
      isConnecting = false
      reconnectAttempts = 0

      // Authenticate and join department room
      // Note: Server expects 'authenticate' and 'join:department' events (with colon)
      socket?.emit('authenticate', { userId, department })
      socket?.emit('join:department', department)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message)
      isConnecting = false
      reconnectAttempts++

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached')
      }
    })

    socket.on('disconnect', (reason) => {
      isConnecting = false

      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket?.connect()
      }
    })

    socket.on('reconnect', (_attemptNumber) => {
      reconnectAttempts = 0

      // Re-authenticate after reconnection
      socket?.emit('authenticate', { userId, department })
      socket?.emit('join:department', department)
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    // Authentication response
    socket.on('authenticated', (_data) => {
      // Successfully authenticated
    })

    socket.on('authentication-error', (error) => {
      console.error('Socket authentication failed:', error)
      disconnectSocket()
    })

    return socket
  } catch (error) {
    console.error('Failed to create socket connection:', error)
    isConnecting = false
    return null
  }
}

/**
 * Disconnect from the WebSocket server
 * Cleans up all event listeners
 */
export function disconnectSocket(): void {
  if (socket) {
    // Remove all registered listeners
    eventListeners.forEach((listeners, event) => {
      listeners.forEach((listener) => {
        socket?.off(event, listener as any)
      })
    })
    eventListeners.clear()

    socket.disconnect()
    socket = null
    isConnecting = false
    reconnectAttempts = 0
  }
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

/**
 * Subscribe to a socket event
 * Returns an unsubscribe function for cleanup
 */
export function subscribeToEvent<T = any>(
  event: string,
  callback: (data: T) => void
): () => void {
  if (!socket) {
    console.warn(`Cannot subscribe to ${event}: Socket not connected`)
    return () => {}
  }

  // Track listener for cleanup
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set())
  }
  eventListeners.get(event)?.add(callback)

  // Add listener
  socket.on(event, callback)

  // Return unsubscribe function
  return () => {
    socket?.off(event, callback)
    eventListeners.get(event)?.delete(callback)
  }
}

/**
 * Emit an event to the server
 */
export function emitEvent<T = any>(event: string, data?: T): void {
  if (!socket?.connected) {
    console.warn(`Cannot emit ${event}: Socket not connected`)
    return
  }

  socket.emit(event, data)
}

/**
 * Emit an event and wait for acknowledgment
 */
export function emitWithAck<T = any, R = any>(
  event: string,
  data?: T,
  timeout = 5000
): Promise<R> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'))
      return
    }

    const timeoutId = setTimeout(() => {
      reject(new Error(`Socket event ${event} timed out`))
    }, timeout)

    socket.emit(event, data, (response: R) => {
      clearTimeout(timeoutId)
      resolve(response)
    })
  })
}

// ============================================================================
// TYPED EVENT EMITTERS
// Convenience functions for common socket events
// ============================================================================

/**
 * Join a specific department room
 */
export function joinDepartment(department: string): void {
  emitEvent('join:department', department)
}

/**
 * Leave a department room
 */
export function leaveDepartment(department: string): void {
  emitEvent('leave:department', department)
}

/**
 * Join a specific ticket room for detailed updates
 */
export function joinTicketRoom(ticketId: string): void {
  emitEvent('join-ticket', ticketId)
}

/**
 * Leave a ticket room
 */
export function leaveTicketRoom(ticketId: string): void {
  emitEvent('leave-ticket', ticketId)
}

/**
 * Notify server that user is viewing a ticket
 */
export function notifyTicketViewing(ticketId: string, userId: string): void {
  emitEvent('ticket:viewing', { ticketId, userId })
}

/**
 * Notify server that user stopped viewing a ticket
 */
export function notifyTicketViewingEnded(ticketId: string, userId: string): void {
  emitEvent('ticket:viewing-ended', { ticketId, userId })
}

// ============================================================================
// SOCKET EVENT TYPES (for TypeScript)
// ============================================================================

export interface TicketCreatedEvent {
  ticketId: string
  subject: string
  department: string
  priority: string
  createdBy: string
  createdAt: string
}

export interface TicketAssignedEvent {
  ticketId: string
  subject: string
  assigneeId: string
  assigneeName: string
  assignedBy: string
  department: string
}

export interface TicketStatusChangedEvent {
  ticketId: string
  previousStatus: string
  newStatus: string
  changedBy: string
  department: string
}

export interface TicketPriorityChangedEvent {
  ticketId: string
  previousPriority: string
  newPriority: string
  changedBy: string
  department: string
}

export interface TicketCommentAddedEvent {
  ticketId: string
  commentId: string
  content: string
  authorId: string
  authorName: string
  createdAt: string
}

export interface BulkOperationEvent {
  operationId: string
  type: 'bulk-assign' | 'bulk-close' | 'bulk-update'
  userId: string
  progress?: {
    total: number
    processed: number
    failed: number
  }
  result?: {
    success: boolean
    message: string
    processed: number
    failed: number
  }
}

export interface UserPresenceEvent {
  userId: string
  userName: string
  status: 'online' | 'offline' | 'away'
  department: string
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isSocketConnected,
  subscribeToEvent,
  emitEvent,
  emitWithAck,
  joinDepartment,
  leaveDepartment,
  joinTicketRoom,
  leaveTicketRoom,
}
