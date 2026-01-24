import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Generic async state interface
 */
export interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  isSuccess: boolean
  isError: boolean
}

/**
 * useAsync - Generic hook for handling async operations
 * Provides loading state, error handling, and caching
 * 
 * @example
 * const { data, isLoading, error, execute } = useAsync(fetchTickets);
 * 
 * useEffect(() => {
 *   execute({ status: 'OPEN' });
 * }, [execute]);
 */
export function useAsync<T, Args extends any[] = any[]>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate = false
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
    isSuccess: false,
    isError: false,
  })

  // Track if component is mounted
  const mountedRef = useRef(true)
  
  // Track the latest request to prevent race conditions
  const requestIdRef = useRef(0)

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    const currentRequestId = ++requestIdRef.current
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isError: false,
    }))

    try {
      const result = await asyncFunction(...args)
      
      // Only update state if this is the latest request and component is mounted
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        setState({
          data: result,
          isLoading: false,
          error: null,
          isSuccess: true,
          isError: false,
        })
      }
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        setState({
          data: null,
          isLoading: false,
          error,
          isSuccess: false,
          isError: true,
        })
      }
      
      return null
    }
  }, [asyncFunction])

  // Reset state
  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      isSuccess: false,
      isError: false,
    })
  }, [])

  // Update data optimistically
  const setData = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setState(prev => ({
      ...prev,
      data: typeof updater === 'function' 
        ? (updater as (prev: T | null) => T | null)(prev.data) 
        : updater,
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    ...state,
    execute,
    reset,
    setData,
  }
}

/**
 * useAsyncWithDeps - Async hook that automatically executes when dependencies change
 * Similar to useEffect but for async functions
 * 
 * @example
 * const { data, isLoading } = useAsyncWithDeps(
 *   () => fetchTickets({ status, priority }),
 *   [status, priority]
 * );
 */
export function useAsyncWithDeps<T>(
  asyncFunction: () => Promise<T>,
  deps: React.DependencyList
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: true,
    error: null,
    isSuccess: false,
    isError: false,
  })

  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)

  const refetch = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }))

    try {
      const result = await asyncFunction()
      
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        setState({
          data: result,
          isLoading: false,
          error: null,
          isSuccess: true,
          isError: false,
        })
      }
      
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      
      if (mountedRef.current && currentRequestId === requestIdRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
          isError: true,
        }))
      }
      
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    refetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    ...state,
    refetch,
  }
}

export default useAsync
