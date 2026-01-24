import { useEffect, useRef } from 'react'

// ============================================================================
// KEYBOARD SHORTCUTS HOOK
// Provides keyboard navigation and shortcut support for accessibility
// ============================================================================

type KeyModifier = 'ctrl' | 'meta' | 'alt' | 'shift'
type KeyHandler = (event: KeyboardEvent) => void

interface ShortcutDefinition {
  /** Key to listen for (e.g., 'n', 'Escape', 'ArrowUp') */
  key: string
  /** Required modifiers (ctrl, meta/cmd, alt, shift) */
  modifiers?: KeyModifier[]
  /** Handler function */
  handler: KeyHandler
  /** Description for help display */
  description?: string
  /** Whether to prevent default behavior (default: true) */
  preventDefault?: boolean
  /** Whether shortcut is enabled (default: true) */
  enabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are globally enabled */
  enabled?: boolean
  /** Element to attach listeners to (default: window) */
  target?: HTMLElement | Window | null
}

/**
 * useKeyboardShortcuts - Hook for handling keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   {
 *     key: 'n',
 *     modifiers: ['ctrl'],
 *     handler: () => setCreateDialogOpen(true),
 *     description: 'Create new ticket',
 *   },
 *   {
 *     key: 'Escape',
 *     handler: () => clearSelection(),
 *     description: 'Clear selection',
 *   },
 * ]);
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutDefinition[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, target } = options
  const shortcutsRef = useRef(shortcuts)

  // Keep shortcuts ref updated
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const targetElement = event.target as HTMLElement
      if (
        targetElement.tagName === 'INPUT' ||
        targetElement.tagName === 'TEXTAREA' ||
        targetElement.isContentEditable
      ) {
        // Allow Escape in inputs
        if (event.key !== 'Escape') {
          return
        }
      }

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue

        // Check modifiers
        const modifiers = shortcut.modifiers || []
        const ctrlRequired = modifiers.includes('ctrl')
        const metaRequired = modifiers.includes('meta')
        const altRequired = modifiers.includes('alt')
        const shiftRequired = modifiers.includes('shift')

        // Allow ctrl or meta (cmd on Mac) interchangeably for cross-platform
        const ctrlOrMeta = ctrlRequired || metaRequired
        const hasCtrlOrMeta = event.ctrlKey || event.metaKey

        if (ctrlOrMeta && !hasCtrlOrMeta) continue
        if (!ctrlOrMeta && hasCtrlOrMeta) continue
        if (altRequired && !event.altKey) continue
        if (!altRequired && event.altKey) continue
        if (shiftRequired && !event.shiftKey) continue
        if (!shiftRequired && event.shiftKey) continue

        // Execute handler
        if (shortcut.preventDefault !== false) {
          event.preventDefault()
        }
        shortcut.handler(event)
        break
      }
    }

    const targetElement = target || window
    targetElement.addEventListener('keydown', handleKeyDown as EventListener)

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as EventListener)
    }
  }, [enabled, target])
}

/**
 * useEscapeKey - Simple hook for handling Escape key
 */
export function useEscapeKey(handler: () => void, enabled = true) {
  useKeyboardShortcuts(
    [{ key: 'Escape', handler, description: 'Close/Cancel' }],
    { enabled }
  )
}

/**
 * useArrowNavigation - Hook for arrow key navigation in lists
 */
export function useArrowNavigation<T>(
  items: T[],
  selectedIndex: number,
  onSelect: (index: number) => void,
  options: {
    enabled?: boolean
    loop?: boolean
    onEnter?: (item: T, index: number) => void
  } = {}
) {
  const { enabled = true, loop = true, onEnter } = options

  useKeyboardShortcuts(
    [
      {
        key: 'ArrowUp',
        handler: () => {
          if (items.length === 0) return
          let newIndex = selectedIndex - 1
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0
          }
          onSelect(newIndex)
        },
        description: 'Move up',
      },
      {
        key: 'ArrowDown',
        handler: () => {
          if (items.length === 0) return
          let newIndex = selectedIndex + 1
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1
          }
          onSelect(newIndex)
        },
        description: 'Move down',
      },
      {
        key: 'Enter',
        handler: () => {
          if (selectedIndex >= 0 && selectedIndex < items.length && onEnter) {
            onEnter(items[selectedIndex], selectedIndex)
          }
        },
        description: 'Select item',
        enabled: !!onEnter,
      },
    ],
    { enabled }
  )
}

// ============================================================================
// COMMON SHORTCUTS PRESETS
// ============================================================================

/**
 * useTicketPageShortcuts - Common shortcuts for ticket pages
 */
export function useTicketPageShortcuts(handlers: {
  onCreateNew?: () => void
  onSearch?: () => void
  onClearSelection?: () => void
  onToggleView?: () => void
  onRefresh?: () => void
  onSelectAll?: () => void
}) {
  const shortcuts: ShortcutDefinition[] = []

  if (handlers.onCreateNew) {
    shortcuts.push({
      key: 'n',
      modifiers: ['ctrl'],
      handler: handlers.onCreateNew,
      description: 'Create new ticket (Ctrl+N)',
    })
  }

  if (handlers.onSearch) {
    shortcuts.push({
      key: 'k',
      modifiers: ['ctrl'],
      handler: handlers.onSearch,
      description: 'Focus search (Ctrl+K)',
    })
    shortcuts.push({
      key: '/',
      handler: handlers.onSearch,
      description: 'Focus search (/)',
    })
  }

  if (handlers.onClearSelection) {
    shortcuts.push({
      key: 'Escape',
      handler: handlers.onClearSelection,
      description: 'Clear selection (Esc)',
    })
  }

  if (handlers.onToggleView) {
    shortcuts.push({
      key: 'v',
      modifiers: ['ctrl'],
      handler: handlers.onToggleView,
      description: 'Toggle view mode (Ctrl+V)',
    })
  }

  if (handlers.onRefresh) {
    shortcuts.push({
      key: 'r',
      modifiers: ['ctrl'],
      handler: handlers.onRefresh,
      description: 'Refresh data (Ctrl+R)',
    })
  }

  if (handlers.onSelectAll) {
    shortcuts.push({
      key: 'a',
      modifiers: ['ctrl'],
      handler: handlers.onSelectAll,
      description: 'Select all (Ctrl+A)',
    })
  }

  useKeyboardShortcuts(shortcuts)
}

/**
 * Get shortcut display string (for tooltips/help)
 */
export function getShortcutDisplay(key: string, modifiers?: KeyModifier[]): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  
  const parts: string[] = []
  
  if (modifiers?.includes('ctrl') || modifiers?.includes('meta')) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (modifiers?.includes('alt')) {
    parts.push(isMac ? '⌥' : 'Alt')
  }
  if (modifiers?.includes('shift')) {
    parts.push('⇧')
  }
  
  // Format special keys
  const keyDisplay = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '↵',
    'Escape': 'Esc',
    ' ': 'Space',
  }[key] || key.toUpperCase()
  
  parts.push(keyDisplay)
  
  return parts.join(isMac ? '' : '+')
}

export default useKeyboardShortcuts
