import { useState, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'

// ============================================================================
// MUTATION HOOK WITH OPTIMISTIC UPDATES
// Handles async mutations with loading states, optimistic UI, and error handling
// ============================================================================

interface MutationOptions<TData, TVariables, TContext> {
  /** The async function to execute */
  mutationFn: (variables: TVariables) => Promise<TData>
  
  /** Called before mutation executes - return context for rollback */
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>
  
  /** Called on successful mutation */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<void>
  
  /** Called on mutation error - receives context for rollback */
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void | Promise<void>
  
  /** Called after mutation completes (success or error) */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables, context: TContext | undefined) => void | Promise<void>
  
  /** Show success toast message */
  successMessage?: string | ((data: TData, variables: TVariables) => string)
  
  /** Show error toast message */
  errorMessage?: string | ((error: Error, variables: TVariables) => string)
  
  /** Retry count on failure (default: 0) */
  retry?: number
  
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number
}

interface MutationResult<TData, TVariables> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => Promise<TData | null>
  
  /** Execute and return promise (for await) */
  mutateAsync: (variables: TVariables) => Promise<TData>
  
  /** Current mutation state */
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  
  /** Last error */
  error: Error | null
  
  /** Last returned data */
  data: TData | null
  
  /** Reset mutation state */
  reset: () => void
}

/**
 * useMutation - Hook for handling async mutations with optimistic updates
 * 
 * @example
 * const assignMutation = useMutation({
 *   mutationFn: ({ ticketId, assigneeId }) => assignTicket(ticketId, assigneeId),
 *   onMutate: ({ ticketId, assigneeId }) => {
 *     // Store previous state for rollback
 *     const previousTicket = tickets.find(t => t.id === ticketId);
 *     
 *     // Optimistically update
 *     setTickets(prev => prev.map(t => 
 *       t.id === ticketId ? { ...t, assignedTo: assigneeId } : t
 *     ));
 *     
 *     return { previousTicket };
 *   },
 *   onError: (error, variables, context) => {
 *     // Rollback on error
 *     if (context?.previousTicket) {
 *       setTickets(prev => prev.map(t =>
 *         t.id === variables.ticketId ? context.previousTicket : t
 *       ));
 *     }
 *   },
 *   successMessage: 'Ticket assigned successfully',
 *   errorMessage: (error) => `Failed to assign: ${error.message}`,
 * });
 * 
 * // Usage
 * assignMutation.mutate({ ticketId: '123', assigneeId: '456' });
 */
export function useMutation<TData = unknown, TVariables = void, TContext = unknown>(
  options: MutationOptions<TData, TVariables, TContext>
): MutationResult<TData, TVariables> {
  const {
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    successMessage,
    errorMessage,
    retry = 0,
    retryDelay = 1000,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<TData | null>(null)

  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setIsLoading(false)
    setIsSuccess(false)
    setIsError(false)
    setError(null)
    setData(null)
  }, [])

  const executeWithRetry = useCallback(async (
    variables: TVariables,
    retriesLeft: number
  ): Promise<TData> => {
    try {
      return await mutationFn(variables)
    } catch (err) {
      if (retriesLeft > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return executeWithRetry(variables, retriesLeft - 1)
      }
      throw err
    }
  }, [mutationFn, retryDelay])

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    // Cancel any pending mutation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    let context: TContext | undefined

    setIsLoading(true)
    setIsSuccess(false)
    setIsError(false)
    setError(null)

    try {
      // Execute onMutate for optimistic updates
      if (onMutate) {
        context = await onMutate(variables)
      }

      // Execute the mutation
      const result = await executeWithRetry(variables, retry)

      if (mountedRef.current) {
        setData(result)
        setIsSuccess(true)
        setIsError(false)

        // Success callback
        if (onSuccess) {
          await onSuccess(result, variables, context)
        }

        // Success toast
        if (successMessage) {
          const message = typeof successMessage === 'function'
            ? successMessage(result, variables)
            : successMessage
          toast.success(message)
        }

        // Settled callback
        if (onSettled) {
          await onSettled(result, null, variables, context)
        }
      }

      return result
    } catch (err) {
      const mutationError = err instanceof Error ? err : new Error(String(err))

      if (mountedRef.current) {
        setError(mutationError)
        setIsError(true)
        setIsSuccess(false)

        // Error callback (for rollback)
        if (onError) {
          await onError(mutationError, variables, context)
        }

        // Error toast
        if (errorMessage) {
          const message = typeof errorMessage === 'function'
            ? errorMessage(mutationError, variables)
            : errorMessage
          toast.error(message)
        } else {
          toast.error(mutationError.message)
        }

        // Settled callback
        if (onSettled) {
          await onSettled(undefined, mutationError, variables, context)
        }
      }

      throw mutationError
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [executeWithRetry, retry, onMutate, onSuccess, onError, onSettled, successMessage, errorMessage])

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    try {
      return await mutateAsync(variables)
    } catch {
      return null
    }
  }, [mutateAsync])

  return {
    mutate,
    mutateAsync,
    isLoading,
    isSuccess,
    isError,
    error,
    data,
    reset,
  }
}

// ============================================================================
// SPECIALIZED MUTATION HOOKS
// ============================================================================

interface TicketMutationContext {
  previousTickets?: any[]
  previousTicket?: any
}

/**
 * useTicketMutation - Specialized mutation hook for ticket operations
 * Pre-configured with common patterns for ticket management
 */
export function useTicketMutation<TVariables extends { ticketId: string }>(
  mutationFn: (variables: TVariables) => Promise<any>,
  tickets: any[],
  setTickets: React.Dispatch<React.SetStateAction<any[]>>,
  options: {
    optimisticUpdate?: (tickets: any[], variables: TVariables) => any[]
    successMessage?: string
    errorMessage?: string
  } = {}
) {
  return useMutation<any, TVariables, TicketMutationContext>({
    mutationFn,
    onMutate: (variables) => {
      const previousTickets = [...tickets]
      
      if (options.optimisticUpdate) {
        setTickets(options.optimisticUpdate(tickets, variables))
      }
      
      return { previousTickets }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTickets) {
        setTickets(context.previousTickets)
      }
    },
    successMessage: options.successMessage,
    errorMessage: options.errorMessage,
  })
}

/**
 * useStatusMutation - Mutation hook specifically for status updates
 */
export function useStatusMutation(
  updateFn: (ticketId: string, status: string) => Promise<any>,
  tickets: any[],
  setTickets: React.Dispatch<React.SetStateAction<any[]>>
) {
  return useTicketMutation(
    ({ ticketId, status }: { ticketId: string; status: string }) => updateFn(ticketId, status),
    tickets,
    setTickets,
    {
      optimisticUpdate: (tickets, { ticketId, status }) =>
        tickets.map(t => (t._id || t.id) === ticketId ? { ...t, status } : t),
      successMessage: 'Status updated successfully',
      errorMessage: 'Failed to update status',
    }
  )
}

/**
 * useAssignMutation - Mutation hook for ticket assignment
 */
export function useAssignMutation(
  assignFn: (ticketId: string, assigneeId: string) => Promise<any>,
  tickets: any[],
  setTickets: React.Dispatch<React.SetStateAction<any[]>>
) {
  return useTicketMutation(
    ({ ticketId, assigneeId }: { ticketId: string; assigneeId: string }) => assignFn(ticketId, assigneeId),
    tickets,
    setTickets,
    {
      optimisticUpdate: (tickets, { ticketId, assigneeId }) =>
        tickets.map(t => (t._id || t.id) === ticketId ? { ...t, assignedTo: assigneeId } : t),
      successMessage: 'Ticket assigned successfully',
      errorMessage: 'Failed to assign ticket',
    }
  )
}

export default useMutation
