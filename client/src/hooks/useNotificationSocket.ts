import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/stores/notificationStore'
import {
  getSocket,
  subscribeToEvent,
  type TicketCreatedEvent,
  type TicketAssignedEvent,
  type TicketPriorityChangedEvent,
} from '@/services/socket'

// ============================================================================
// NOTIFICATION SOUND MANAGER
// Handles browser autoplay restrictions by unlocking audio on first user interaction
// ============================================================================

// Notification sound path (in public folder)
const NOTIFICATION_SOUND_PATH = '/new-notification-022-370046.mp3'

// Sound manager state
let notificationAudio: HTMLAudioElement | null = null
let isAudioUnlocked = false
let isAudioLoaded = false

/**
 * Initialize and preload the audio element
 */
function initializeAudio(): HTMLAudioElement {
  if (!notificationAudio) {
    notificationAudio = new Audio(NOTIFICATION_SOUND_PATH)
    notificationAudio.volume = 0.5 // 50% volume
    notificationAudio.preload = 'auto'
    
    // Mark as loaded when ready
    notificationAudio.addEventListener('canplaythrough', () => {
      isAudioLoaded = true
    })
    
    // Try to load
    notificationAudio.load()
  }
  return notificationAudio
}

/**
 * Unlock audio playback - must be called from a user interaction event
 * Browsers require user interaction before audio can play
 */
function unlockAudio() {
  if (isAudioUnlocked) return
  
  const audio = initializeAudio()
  
  // Play a silent/very short audio to unlock
  audio.volume = 0
  audio.currentTime = 0
  
  const playPromise = audio.play()
  
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        // Immediately pause after playing
        audio.pause()
        audio.currentTime = 0
        audio.volume = 0.5 // Restore volume
        isAudioUnlocked = true
      })
      .catch(() => {
        // Still locked, will try again on next interaction
      })
  }
}

/**
 * Set up user interaction listeners to unlock audio
 */
function setupAudioUnlockListeners() {
  const events = ['click', 'touchstart', 'keydown']
  
  const handleInteraction = () => {
    unlockAudio()
    
    // Remove listeners once unlocked
    if (isAudioUnlocked) {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction)
      })
    }
  }
  
  events.forEach(event => {
    document.addEventListener(event, handleInteraction, { once: false, passive: true })
  })
}

// Initialize audio system immediately
if (typeof window !== 'undefined') {
  initializeAudio()
  setupAudioUnlockListeners()
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  try {
    const audio = initializeAudio()
    
    // If audio not loaded yet, skip this time
    if (!isAudioLoaded) {
      return
    }
    
    // Reset to start
    audio.currentTime = 0
    audio.volume = 0.5
    
    // Try to play
    const playPromise = audio.play()
    
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // If play fails, try unlocking again
        // This can happen if the page was inactive
        isAudioUnlocked = false
      })
    }
  } catch {
    // Silently ignore audio errors
  }
}

// ============================================================================
// NOTIFICATION SOCKET HOOK
// Listens to socket events and adds them to the notification store
// ============================================================================

export function useNotificationSocket() {
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  
  // Use refs to store values that shouldn't trigger re-subscriptions
  const userRef = useRef(user)
  const addNotificationRef = useRef(addNotification)
  
  // Keep refs updated
  useEffect(() => {
    userRef.current = user
    addNotificationRef.current = addNotification
  }, [user, addNotification])

  useEffect(() => {
    // Don't subscribe if no user
    if (!user) return
    
    // Track if component is still mounted to prevent memory leaks
    let isMounted = true
    
    // Store unsubscribe functions
    const unsubscribers: (() => void)[] = []
    let isSetup = false
    let checkInterval: ReturnType<typeof setInterval> | null = null

    function setupSubscriptions(): boolean {
      const socket = getSocket()
      if (!socket || !socket.connected) return false
      
      // Prevent setup if already done or component unmounted
      if (isSetup || !isMounted) return isSetup
      
      // Mark as setup BEFORE subscribing to prevent race conditions
      isSetup = true

      // New ticket created
      unsubscribers.push(
        subscribeToEvent<TicketCreatedEvent>('ticket:created', (data) => {
          // Check if still mounted before processing
          if (!isMounted) return
          
          const currentUser = userRef.current
          // Only notify for tickets in user's department
          if (currentUser && data.department === currentUser.department) {
            // Play notification sound
            playNotificationSound()
            
            addNotificationRef.current({
              type: 'ticket',
              title: 'New Ticket Created',
              message: data.subject,
              data: {
                ticketId: data.ticketId,
                department: data.department,
                priority: data.priority,
              },
            })
          }
        })
      )

      // Ticket assigned
      unsubscribers.push(
        subscribeToEvent<TicketAssignedEvent>('ticket:assigned', (data) => {
          console.log('🔔 Notification hook - Ticket assigned event received:', data)
          
          if (!isMounted) return
          
          const currentUser = userRef.current
          if (!currentUser) return
          
          // Notify only if assigned to this user
          if (data.assigneeId === currentUser.id) {
            console.log('✅ Adding notification to bell for assigned ticket')
            
            // Play notification sound
            playNotificationSound()
            
            addNotificationRef.current({
              type: 'info',
              title: 'Ticket Assigned to You',
              message: data.subject,
              data: {
                ticketId: data.ticketId,
                department: data.department,
              },
            })
          }
        })
      )

      // Ticket status changed
      // NOTE: Status changes are intentionally NOT added to the bell icon
      // They only show toast notifications (handled by useRealTimeTickets hook)
      // This prevents clutter when users change their own ticket statuses

      // Ticket priority changed
      unsubscribers.push(
        subscribeToEvent<TicketPriorityChangedEvent>('ticket:priority-changed', (data) => {
          if (!isMounted) return
          
          const currentUser = userRef.current
          if (currentUser && data.department === currentUser.department) {
            // Play notification sound
            playNotificationSound()
            
            const type = data.newPriority === 'CRITICAL' || data.newPriority === 'HIGH' ? 'warning' : 'info'
            addNotificationRef.current({
              type,
              title: 'Ticket Priority Updated',
              message: `Priority changed from ${data.previousPriority} to ${data.newPriority}`,
              data: {
                ticketId: data.ticketId,
                department: data.department,
                priority: data.newPriority,
              },
            })
          }
        })
      )
      
      return true // Successfully set up
    }

    // Try to setup immediately if socket is available
    const socket = getSocket()
    if (socket?.connected) {
      setupSubscriptions()
    } else {
      // Socket not ready yet - wait for it
      // Check periodically for socket availability (with mount check)
      checkInterval = setInterval(() => {
        if (!isMounted) {
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
          return
        }
        
        const currentSocket = getSocket()
        if (currentSocket?.connected && setupSubscriptions()) {
          // Successfully set up, stop checking
          if (checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        }
      }, 500)
      
      // Also listen for connect event if socket exists but not connected
      if (socket) {
        const handleConnect = () => {
          if (!isMounted) return
          
          if (setupSubscriptions() && checkInterval) {
            clearInterval(checkInterval)
            checkInterval = null
          }
        }
        socket.on('connect', handleConnect)
        unsubscribers.push(() => socket.off('connect', handleConnect))
      }
    }

    // Cleanup function - properly unsubscribe all listeners
    return () => {
      // Mark as unmounted first to prevent any new subscriptions
      isMounted = false
      
      if (checkInterval) {
        clearInterval(checkInterval)
        checkInterval = null
      }
      
      // Cleanup all subscriptions
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [user?.id, user?.department]) // Only re-run if user identity changes
}

export default useNotificationSocket
