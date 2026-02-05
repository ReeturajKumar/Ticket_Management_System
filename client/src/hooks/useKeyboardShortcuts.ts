import { useEffect } from 'react'

/**
 * Hook to handle Escape key press
 */
export function useEscapeKey(handler: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handler, isActive])
}

export type KeyboardShortcutHandler = (event: KeyboardEvent) => void

export interface KeyboardShortcutConfig {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  preventDefault?: boolean
}

/**
 * General purpose keyboard shortcut hook
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, KeyboardShortcutHandler>,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = shortcuts[event.key]
      if (handler) {
        handler(event)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, isActive])
}


// Placeholder implementations for other exports to satisfy potential imports
export function useArrowNavigation() {}
export function useTicketPageShortcuts() {}
export function getShortcutDisplay(key: string) { return key }
