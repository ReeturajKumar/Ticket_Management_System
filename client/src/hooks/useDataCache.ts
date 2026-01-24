import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Simple in-memory cache for API responses
 * Persists across component re-renders but not page refreshes
 */
const cache = new Map<string, { data: any; timestamp: number }>()

interface UseCachedDataOptions {
  /** Cache time-to-live in milliseconds (default: 30 seconds) */
  ttl?: number
  /** Skip cache and always fetch fresh data */
  skipCache?: boolean
  /** Callback when data is fetched */
  onSuccess?: (data: any) => void
  /** Callback when fetch fails */
  onError?: (error: Error) => void
}

/**
 * useCachedData - Hook for fetching data with automatic caching
 * Uses a simple in-memory cache with TTL
 * 
 * @example
 * const { data, isLoading, refetch } = useCachedData(
 *   'tickets-list',
 *   () => getAllTickets(),
 *   { ttl: 60000 } // 1 minute cache
 * );
 */
export function useCachedData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseCachedDataOptions = {}
) {
  const { ttl = 30000, skipCache = false, onSuccess, onError } = options

  const [data, setData] = useState<T | null>(() => {
    // Check cache on initial mount
    if (!skipCache) {
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data
      }
    }
    return null
  })
  
  const [isLoading, setIsLoading] = useState(!data)
  const [error, setError] = useState<Error | null>(null)

  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)

  const fetchData = useCallback(async (forceRefresh = false) => {
    const currentRequestId = ++requestIdRef.current

    // Check cache first (unless force refresh or skipCache)
    if (!forceRefresh && !skipCache) {
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < ttl) {
        if (mountedRef.current) {
          setData(cached.data)
          setIsLoading(false)
        }
        return cached.data
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        // Update cache
        cache.set(cacheKey, { data: result, timestamp: Date.now() })
        
        setData(result)
        setIsLoading(false)
        onSuccess?.(result)
      }
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        setError(error)
        setIsLoading(false)
        onError?.(error)
      }
      
      return null
    }
  }, [cacheKey, fetcher, ttl, skipCache, onSuccess, onError])

  // Initial fetch
  useEffect(() => {
    if (!data || skipCache) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  // Cleanup
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Refetch function (forces refresh)
  const refetch = useCallback(() => fetchData(true), [fetchData])

  // Invalidate cache
  const invalidate = useCallback(() => {
    cache.delete(cacheKey)
  }, [cacheKey])

  // Update data optimistically
  const updateData = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setData(prev => {
      const newData = typeof updater === 'function'
        ? (updater as (prev: T | null) => T | null)(prev)
        : updater
      
      // Update cache as well
      if (newData !== null) {
        cache.set(cacheKey, { data: newData, timestamp: Date.now() })
      }
      
      return newData
    })
  }, [cacheKey])

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    refetch,
    invalidate,
    updateData,
  }
}

/**
 * Clear all cached data
 */
export function clearAllCache() {
  cache.clear()
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string) {
  cache.delete(key)
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCacheByPattern(pattern: string | RegExp) {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
  
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key)
    }
  }
}

export default useCachedData
