import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react'

// ============================================================================
// NOTIFICATION STORE
// Manages real-time notifications for the application
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'ticket'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  data?: {
    ticketId?: string
    department?: string
    priority?: string
    [key: string]: any
  }
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp' | 'read'> }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' }

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
}

// Maximum notifications to keep
const MAX_NOTIFICATIONS = 50

// Generate unique ID
function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const newNotification: Notification = {
        ...action.payload,
        id: generateId(),
        timestamp: new Date(),
        read: false,
      }
      
      // Keep only the latest notifications
      const notifications = [newNotification, ...state.notifications].slice(0, MAX_NOTIFICATIONS)
      
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      }
    }
    
    case 'MARK_AS_READ': {
      const notifications = state.notifications.map(n =>
        n.id === action.payload ? { ...n, read: true } : n
      )
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      }
    }
    
    case 'MARK_ALL_AS_READ': {
      const notifications = state.notifications.map(n => ({ ...n, read: true }))
      return {
        notifications,
        unreadCount: 0,
      }
    }
    
    case 'REMOVE_NOTIFICATION': {
      const notifications = state.notifications.filter(n => n.id !== action.payload)
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      }
    }
    
    case 'CLEAR_ALL': {
      return initialState
    }
    
    default:
      return state
  }
}

// Context type
interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

// Provider props
interface NotificationProviderProps {
  children: ReactNode
}

// Load from localStorage
function loadNotifications(): NotificationState {
  try {
    const saved = localStorage.getItem('notifications')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Convert timestamp strings back to Date objects
      const notifications = parsed.notifications.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }))
      return {
        notifications,
        unreadCount: notifications.filter((n: Notification) => !n.read).length,
      }
    }
  } catch (error) {
    console.error('Failed to load notifications from localStorage:', error)
  }
  return initialState
}

// Save to localStorage
function saveNotifications(state: NotificationState): void {
  try {
    localStorage.setItem('notifications', JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save notifications to localStorage:', error)
  }
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, initialState, loadNotifications)

  // Save to localStorage when state changes
  useEffect(() => {
    saveNotifications(state)
  }, [state])

  // Actions
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
  }, [])

  const markAsRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: id })
  }, [])

  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_AS_READ' })
  }, [])

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [])

  const contextValue = useMemo<NotificationContextType>(() => ({
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  }), [state.notifications, state.unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll])

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext)
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  
  return context
}

// Hook to get only unread count
export function useUnreadCount() {
  const { unreadCount } = useNotifications()
  return unreadCount
}

export default NotificationProvider
