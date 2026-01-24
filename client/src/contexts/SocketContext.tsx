import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import {
  connectSocket,
  disconnectSocket,
  isSocketConnected,
  subscribeToEvent,
  emitEvent,
} from '@/services/socket'
import { useAuth } from './AuthContext'

// ============================================================================
// SOCKET CONTEXT
// Provides socket connection state and utilities across the app
// ============================================================================

interface SocketContextType {
  /** Whether socket is connected */
  isConnected: boolean
  /** Connect to socket server */
  connect: () => void
  /** Disconnect from socket server */
  disconnect: () => void
  /** Subscribe to a socket event */
  subscribe: <T = any>(event: string, callback: (data: T) => void) => () => void
  /** Emit a socket event */
  emit: <T = any>(event: string, data?: T) => void
  /** Connection error if any */
  connectionError: string | null
}

const SocketContext = createContext<SocketContextType | null>(null)

interface SocketProviderProps {
  children: ReactNode
  /** Auto-connect when authenticated (default: true) */
  autoConnect?: boolean
}

export function SocketProvider({ children, autoConnect = true }: SocketProviderProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Connect when authenticated
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    // Connect if authenticated and autoConnect is enabled
    if (autoConnect && isAuthenticated && user) {
      const socket = connectSocket(user.id, user.department)

      if (socket) {
        const handleConnect = () => {
          setIsConnected(true)
          setConnectionError(null)
        }

        const handleDisconnect = () => {
          setIsConnected(false)
        }

        const handleError = (error: Error) => {
          setConnectionError(error.message)
        }

        socket.on('connect', handleConnect)
        socket.on('disconnect', handleDisconnect)
        socket.on('connect_error', handleError)

        // Check initial state
        if (socket.connected) {
          setIsConnected(true)
        }

        return () => {
          socket.off('connect', handleConnect)
          socket.off('disconnect', handleDisconnect)
          socket.off('connect_error', handleError)
        }
      }
    }

    // Disconnect if not authenticated
    if (!isAuthenticated && isSocketConnected()) {
      disconnectSocket()
      setIsConnected(false)
    }
  }, [autoConnect, isAuthenticated, user, authLoading])

  // Manual connect
  const connect = useCallback(() => {
    if (user && isAuthenticated) {
      const socket = connectSocket(user.id, user.department)
      if (socket) {
        setIsConnected(socket.connected)
      }
    }
  }, [user, isAuthenticated])

  // Manual disconnect
  const disconnect = useCallback(() => {
    disconnectSocket()
    setIsConnected(false)
  }, [])

  // Subscribe to event
  const subscribe = useCallback(<T = any>(
    event: string,
    callback: (data: T) => void
  ): (() => void) => {
    return subscribeToEvent(event, callback)
  }, [])

  // Emit event
  const emit = useCallback(<T = any>(event: string, data?: T) => {
    emitEvent(event, data)
  }, [])

  const contextValue = useMemo<SocketContextType>(() => ({
    isConnected,
    connect,
    disconnect,
    subscribe,
    emit,
    connectionError,
  }), [isConnected, connect, disconnect, subscribe, emit, connectionError])

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  )
}

/**
 * useSocket - Access socket context
 */
export function useSocket() {
  const context = useContext(SocketContext)

  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }

  return context
}

/**
 * useSocketStatus - Get socket connection status
 */
export function useSocketStatus() {
  const { isConnected, connectionError } = useSocket()
  return { isConnected, connectionError }
}

export default SocketProvider
