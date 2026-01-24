import { useEffect, useRef, useCallback, type RefObject } from 'react'

// ============================================================================
// FOCUS MANAGEMENT HOOKS
// Utilities for managing focus for accessibility
// ============================================================================

/**
 * useFocusOnMount - Focus an element when component mounts
 * 
 * @example
 * const inputRef = useFocusOnMount<HTMLInputElement>();
 * return <input ref={inputRef} />;
 */
export function useFocusOnMount<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    // Small delay to ensure element is rendered
    const timeoutId = setTimeout(() => {
      ref.current?.focus()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [])

  return ref
}

/**
 * useFocusWhen - Focus an element when condition becomes true
 * 
 * @example
 * const dialogRef = useFocusWhen<HTMLDivElement>(isDialogOpen);
 */
export function useFocusWhen<T extends HTMLElement>(
  condition: boolean,
  options: { delay?: number; select?: boolean } = {}
): RefObject<T | null> {
  const { delay = 0, select = false } = options
  const ref = useRef<T>(null)

  useEffect(() => {
    if (condition && ref.current) {
      const timeoutId = setTimeout(() => {
        ref.current?.focus()
        
        // Select text if it's an input
        if (select && ref.current instanceof HTMLInputElement) {
          ref.current.select()
        }
      }, delay)

      return () => clearTimeout(timeoutId)
    }
  }, [condition, delay, select])

  return ref
}

/**
 * useFocusTrap - Trap focus within a container (for modals/dialogs)
 * 
 * @example
 * const trapRef = useFocusTrap<HTMLDivElement>(isModalOpen);
 * return <div ref={trapRef}>Modal content</div>;
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean
): RefObject<T | null> {
  const containerRef = useRef<T>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    // Store currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => el.offsetParent !== null) // Filter out hidden elements
    }

    // Focus first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    } else {
      container.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const elements = getFocusableElements()
      if (elements.length === 0) return

      const firstElement = elements[0]
      const lastElement = elements[elements.length - 1]

      if (event.shiftKey) {
        // Shift+Tab: going backwards
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: going forwards
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [active])

  return containerRef
}

/**
 * useFocusReturn - Return focus to trigger element when closing
 * 
 * @example
 * const { triggerRef, contentRef, returnFocus } = useFocusReturn<HTMLButtonElement, HTMLDivElement>();
 * 
 * <button ref={triggerRef} onClick={open}>Open</button>
 * <dialog ref={contentRef}>
 *   <button onClick={() => { close(); returnFocus(); }}>Close</button>
 * </dialog>
 */
export function useFocusReturn<
  TTrigger extends HTMLElement,
  TContent extends HTMLElement
>() {
  const triggerRef = useRef<TTrigger>(null)
  const contentRef = useRef<TContent>(null)

  const returnFocus = useCallback(() => {
    // Small delay to ensure any animations complete
    setTimeout(() => {
      triggerRef.current?.focus()
    }, 0)
  }, [])

  return {
    triggerRef,
    contentRef,
    returnFocus,
  }
}

/**
 * useRovingTabIndex - Implement roving tabindex for list navigation
 * Only one item in the list is tabbable at a time
 * 
 * @example
 * const { getTabIndex, handleKeyDown, focusedIndex } = useRovingTabIndex(items.length);
 * 
 * {items.map((item, index) => (
 *   <button
 *     key={item.id}
 *     tabIndex={getTabIndex(index)}
 *     onKeyDown={handleKeyDown}
 *   >
 *     {item.label}
 *   </button>
 * ))}
 */
export function useRovingTabIndex(
  itemCount: number,
  options: {
    initialIndex?: number
    orientation?: 'horizontal' | 'vertical' | 'both'
    loop?: boolean
    onFocusChange?: (index: number) => void
  } = {}
) {
  const {
    initialIndex = 0,
    orientation = 'vertical',
    loop = true,
    onFocusChange,
  } = options

  const focusedIndexRef = useRef(initialIndex)
  const itemRefs = useRef<(HTMLElement | null)[]>([])

  const setFocusedIndex = useCallback((index: number) => {
    focusedIndexRef.current = index
    onFocusChange?.(index)
    itemRefs.current[index]?.focus()
  }, [onFocusChange])

  const getTabIndex = useCallback((index: number) => {
    return index === focusedIndexRef.current ? 0 : -1
  }, [])

  const registerItem = useCallback((index: number, element: HTMLElement | null) => {
    itemRefs.current[index] = element
  }, [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const currentIndex = focusedIndexRef.current
    let nextIndex: number | null = null

    const isVertical = orientation === 'vertical' || orientation === 'both'
    const isHorizontal = orientation === 'horizontal' || orientation === 'both'

    switch (event.key) {
      case 'ArrowUp':
        if (isVertical) {
          event.preventDefault()
          nextIndex = currentIndex - 1
          if (nextIndex < 0) nextIndex = loop ? itemCount - 1 : 0
        }
        break
      case 'ArrowDown':
        if (isVertical) {
          event.preventDefault()
          nextIndex = currentIndex + 1
          if (nextIndex >= itemCount) nextIndex = loop ? 0 : itemCount - 1
        }
        break
      case 'ArrowLeft':
        if (isHorizontal) {
          event.preventDefault()
          nextIndex = currentIndex - 1
          if (nextIndex < 0) nextIndex = loop ? itemCount - 1 : 0
        }
        break
      case 'ArrowRight':
        if (isHorizontal) {
          event.preventDefault()
          nextIndex = currentIndex + 1
          if (nextIndex >= itemCount) nextIndex = loop ? 0 : itemCount - 1
        }
        break
      case 'Home':
        event.preventDefault()
        nextIndex = 0
        break
      case 'End':
        event.preventDefault()
        nextIndex = itemCount - 1
        break
    }

    if (nextIndex !== null && nextIndex !== currentIndex) {
      setFocusedIndex(nextIndex)
    }
  }, [itemCount, loop, orientation, setFocusedIndex])

  return {
    focusedIndex: focusedIndexRef.current,
    getTabIndex,
    registerItem,
    handleKeyDown,
    setFocusedIndex,
  }
}

/**
 * useAnnounce - Announce messages to screen readers
 * 
 * @example
 * const announce = useAnnounce();
 * announce('5 tickets selected', 'polite');
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Create announcer element if it doesn't exist
    let announcer = document.getElementById('sr-announcer') as HTMLDivElement
    
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = 'sr-announcer'
      announcer.setAttribute('aria-live', 'polite')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `
      document.body.appendChild(announcer)
    }
    
    announceRef.current = announcer

    return () => {
      // Don't remove - might be used by other components
    }
  }, [])

  const announce = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (!announceRef.current) return

    announceRef.current.setAttribute('aria-live', priority)
    
    // Clear and set message (needed for re-announcements)
    announceRef.current.textContent = ''
    
    // Small delay to ensure screen reader picks up the change
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = message
      }
    }, 50)
  }, [])

  return announce
}

export default {
  useFocusOnMount,
  useFocusWhen,
  useFocusTrap,
  useFocusReturn,
  useRovingTabIndex,
  useAnnounce,
}
