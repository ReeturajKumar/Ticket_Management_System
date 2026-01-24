import { useState, useCallback, useRef, useEffect } from 'react'

// ============================================================================
// INFINITE SCROLL WITH CURSOR PAGINATION
// Uses React's built-in features - no external libraries needed
// ============================================================================

interface PaginationInfo {
  cursor?: string | null
  nextCursor?: string | null
  hasMore: boolean
  total?: number
}

interface UseInfiniteScrollOptions<T> {
  /** Function to fetch data, receives cursor and returns data + pagination info */
  fetchFn: (cursor?: string | null) => Promise<{
    data: T[]
    pagination: PaginationInfo
  }>
  /** Initial page size (optional, for display purposes) */
  pageSize?: number
  /** Threshold in pixels from bottom to trigger load (default: 200) */
  threshold?: number
  /** Enable/disable infinite scroll (default: true) */
  enabled?: boolean
  /** Called when new data is fetched */
  onSuccess?: (newData: T[]) => void
  /** Called on fetch error */
  onError?: (error: Error) => void
}

interface UseInfiniteScrollReturn<T> {
  /** All loaded data */
  data: T[]
  /** Loading state for initial load */
  isLoading: boolean
  /** Loading state for fetching more */
  isFetchingMore: boolean
  /** Error if any */
  error: Error | null
  /** Whether there's more data to load */
  hasMore: boolean
  /** Total count if available */
  total: number | undefined
  /** Function to load more data */
  loadMore: () => Promise<void>
  /** Function to refresh (reload from start) */
  refresh: () => Promise<void>
  /** Function to reset state */
  reset: () => void
  /** Ref to attach to scroll container (or use sentinelRef for viewport scroll) */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Ref for sentinel element (triggers load when visible) */
  sentinelRef: React.RefObject<HTMLDivElement | null>
}

/**
 * useInfiniteScroll - Hook for infinite scrolling with cursor pagination
 * 
 * @example
 * const {
 *   data: tickets,
 *   isLoading,
 *   isFetchingMore,
 *   hasMore,
 *   loadMore,
 *   sentinelRef,
 * } = useInfiniteScroll({
 *   fetchFn: async (cursor) => {
 *     const response = await getAllTickets({ cursor, limit: 20 });
 *     return {
 *       data: response.data.tickets,
 *       pagination: response.data.pagination,
 *     };
 *   },
 * });
 * 
 * // In JSX:
 * {tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
 * {hasMore && <div ref={sentinelRef}>Loading more...</div>}
 */
export function useInfiniteScroll<T>({
  fetchFn,
  pageSize: _pageSize = 20,
  threshold = 200,
  enabled = true,
  onSuccess,
  onError,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState<number | undefined>(undefined)
  
  const cursorRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)

  // Initial fetch
  const fetchInitial = useCallback(async () => {
    if (!enabled) return
    
    setIsLoading(true)
    setError(null)
    cursorRef.current = null

    try {
      const result = await fetchFn(null)
      
      if (mountedRef.current) {
        setData(result.data)
        cursorRef.current = result.pagination.nextCursor || null
        setHasMore(result.pagination.hasMore)
        setTotal(result.pagination.total)
        onSuccess?.(result.data)
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [fetchFn, enabled, onSuccess, onError])

  // Load more data
  const loadMore = useCallback(async () => {
    if (!enabled || !hasMore || fetchingRef.current || isLoading) return
    
    fetchingRef.current = true
    setIsFetchingMore(true)

    try {
      const result = await fetchFn(cursorRef.current)
      
      if (mountedRef.current) {
        setData(prev => [...prev, ...result.data])
        cursorRef.current = result.pagination.nextCursor || null
        setHasMore(result.pagination.hasMore)
        setTotal(result.pagination.total)
        onSuccess?.(result.data)
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
      }
    } finally {
      if (mountedRef.current) {
        setIsFetchingMore(false)
      }
      fetchingRef.current = false
    }
  }, [fetchFn, enabled, hasMore, isLoading, onSuccess, onError])

  // Refresh (reload from start)
  const refresh = useCallback(async () => {
    setData([])
    cursorRef.current = null
    setHasMore(true)
    await fetchInitial()
  }, [fetchInitial])

  // Reset state
  const reset = useCallback(() => {
    setData([])
    setIsLoading(true)
    setIsFetchingMore(false)
    setError(null)
    setHasMore(true)
    setTotal(undefined)
    cursorRef.current = null
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true
    fetchInitial()
    
    return () => {
      mountedRef.current = false
    }
  }, [fetchInitial])

  // Intersection Observer for sentinel element
  useEffect(() => {
    if (!enabled || !hasMore) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !fetchingRef.current) {
          loadMore()
        }
      },
      {
        root: containerRef.current,
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [enabled, hasMore, loadMore, threshold])

  return {
    data,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    total,
    loadMore,
    refresh,
    reset,
    containerRef,
    sentinelRef,
  }
}

// ============================================================================
// SCROLL DETECTION HOOK
// For manual scroll handling (alternative to Intersection Observer)
// ============================================================================

interface UseScrollDetectionOptions {
  /** Threshold in pixels from bottom (default: 200) */
  threshold?: number
  /** Callback when threshold is reached */
  onReachBottom: () => void
  /** Whether detection is enabled */
  enabled?: boolean
}

/**
 * useScrollDetection - Hook to detect when user scrolls near bottom
 * 
 * @example
 * const scrollRef = useScrollDetection({
 *   threshold: 200,
 *   onReachBottom: loadMore,
 *   enabled: hasMore && !isLoading,
 * });
 * 
 * <div ref={scrollRef} className="overflow-auto h-[600px]">
 *   {items.map(...)}
 * </div>
 */
export function useScrollDetection({
  threshold = 200,
  onReachBottom,
  enabled = true,
}: UseScrollDetectionOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onReachBottom)

  // Update callback ref
  useEffect(() => {
    callbackRef.current = onReachBottom
  }, [onReachBottom])

  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (distanceFromBottom <= threshold) {
        callbackRef.current()
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => container.removeEventListener('scroll', handleScroll)
  }, [enabled, threshold])

  return containerRef
}

// ============================================================================
// WINDOW SCROLL DETECTION
// For full-page infinite scroll
// ============================================================================

/**
 * useWindowScrollDetection - Detect when user scrolls near bottom of page
 * 
 * @example
 * useWindowScrollDetection({
 *   threshold: 300,
 *   onReachBottom: loadMoreItems,
 *   enabled: hasMoreItems,
 * });
 */
export function useWindowScrollDetection({
  threshold = 200,
  onReachBottom,
  enabled = true,
}: UseScrollDetectionOptions) {
  const callbackRef = useRef(onReachBottom)
  const lastCallRef = useRef(0)

  useEffect(() => {
    callbackRef.current = onReachBottom
  }, [onReachBottom])

  useEffect(() => {
    if (!enabled) return

    const handleScroll = () => {
      const now = Date.now()
      // Throttle to max once per 100ms
      if (now - lastCallRef.current < 100) return

      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      if (distanceFromBottom <= threshold) {
        lastCallRef.current = now
        callbackRef.current()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [enabled, threshold])
}

export default useInfiniteScroll
