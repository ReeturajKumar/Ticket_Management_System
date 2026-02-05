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
        subscribeToEvent<TicketCreatedEvent>('ticket:created', () => {
          if (!isMounted) return
          // Removed redundant store logic to prevent duplicates.
          // Formal notifications now arrive via the generic 'notification' event.
        })
      )
 
      // Ticket assigned
      unsubscribers.push(
        subscribeToEvent<TicketAssignedEvent>('ticket:assigned', () => {
          if (!isMounted) return
          // Removed redundant store logic.
        })
      )
 
      // Ticket priority changed
      unsubscribers.push(
        subscribeToEvent<TicketPriorityChangedEvent>('ticket:priority-changed', () => {
          if (!isMounted) return
          // Removed redundant store logic.
        })
      )
      
      // Ticket comment added
      unsubscribers.push(
        subscribeToEvent<any>('ticket:comment-added', () => {
          if (!isMounted) return
          // Typed events now only handle real-time UI data refreshes in other hooks.
          // Bell notifications are handled by the generic listener below.
        })
      )
      
      // Generic notification event
      unsubscribers.push(
        subscribeToEvent<any>('notification', (data) => {
          if (!isMounted) return
          const currentUser = userRef.current
          if (!currentUser) return

          // Enhanced self-notification prevention check
          // Checks multiple possible ID fields and ensure string comparison
          const currentUserId = currentUser.id || (currentUser as any)._id || (currentUser as any).userId;
          const senderId = data.senderId?.toString();
          
          if (senderId && currentUserId && senderId === currentUserId.toString()) {
            return;
          }

          playNotificationSound()
          addNotificationRef.current({
            type: data.type || 'info',
            title: data.title || 'Notification',
            message: data.message || '',
            data: data.data || {},
          })
        })
      )
      
      return true
    }

    // Try to setup immediately if socket is available
    const socket = getSocket()
    if (socket?.connected) {
      setupSubscriptions()
    } else {
      checkInterval = setInterval(() => {
        if (!isMounted) {
          if (checkInterval) clearInterval(checkInterval)
          return
        }
        const currentSocket = getSocket()
        if (currentSocket?.connected && setupSubscriptions()) {
          if (checkInterval) clearInterval(checkInterval)
        }
      }, 500)
      
      if (socket) {
        const handleConnect = () => {
          if (!isMounted) return
          if (setupSubscriptions() && checkInterval) clearInterval(checkInterval)
        }
        socket.on('connect', handleConnect)
        unsubscribers.push(() => socket.off('connect', handleConnect))
      }
    }

    return () => {
      isMounted = false
      if (checkInterval) clearInterval(checkInterval)
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [user?.id, user?.department])
}

export default useNotificationSocket
