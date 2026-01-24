import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'

/**
 * useOptimisticUpdate - Hook for optimistic UI updates
 * Updates the UI immediately, then syncs with server
 * Rolls back on error
 * 
 * @example
 * const { execute, isUpdating } = useOptimisticUpdate({
 *   onOptimistic: (ticketId, newStatus) => {
 *     setTickets(prev => prev.map(t => 
 *       t.id === ticketId ? { ...t, status: newStatus } : t
 *     ));
 *   },
 *   onRollback: (ticketId, previousStatus) => {
 *     setTickets(prev => prev.map(t =>
 *       t.id === ticketId ? { ...t, status: previousStatus } : t
 *     ));
 *   },
 *   onSuccess: () => toast.success('Status updated'),
 *   onError: (error) => toast.error(error.message),
 * });
 * 
 * // Usage
 * execute(
 *   () => updateTicketStatus(ticketId, newStatus),
 *   { ticketId, newStatus },
 *   { ticketId, previousStatus }
 * );
 */

interface UseOptimisticUpdateOptions<TOptimistic, TRollback> {
  /** Called immediately to update UI optimistically */
  onOptimistic: (data: TOptimistic) => void
  /** Called on error to rollback changes */
  onRollback: (data: TRollback) => void
  /** Called on successful server response */
  onSuccess?: (result: any) => void
  /** Called on error */
  onError?: (error: Error) => void
}

export function useOptimisticUpdate<TOptimistic, TRollback>({
  onOptimistic,
  onRollback,
  onSuccess,
  onError,
}: UseOptimisticUpdateOptions<TOptimistic, TRollback>) {
  const [isUpdating, setIsUpdating] = useState(false)

  const execute = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    optimisticData: TOptimistic,
    rollbackData: TRollback
  ): Promise<T | null> => {
    setIsUpdating(true)
    
    // Apply optimistic update immediately
    onOptimistic(optimisticData)

    try {
      const result = await asyncFn()
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      
      // Rollback on error
      onRollback(rollbackData)
      onError?.(error)
      
      return null
    } finally {
      setIsUpdating(false)
    }
  }, [onOptimistic, onRollback, onSuccess, onError])

  return {
    execute,
    isUpdating,
  }
}

/**
 * useTicketOptimisticUpdate - Specialized hook for ticket updates
 * Provides common patterns for ticket status/priority changes
 */
export function useTicketOptimisticUpdate<T extends { _id?: string; id?: string }>(
  _tickets: T[],
  setTickets: React.Dispatch<React.SetStateAction<T[]>>
) {
  const updateTicketField = useCallback(<K extends keyof T>(
    ticketId: string,
    field: K,
    value: T[K]
  ) => {
    setTickets(prev => prev.map(t => {
      const id = t._id || t.id
      return id === ticketId ? { ...t, [field]: value } : t
    }))
  }, [setTickets])

  const { execute, isUpdating } = useOptimisticUpdate({
    onOptimistic: ({ ticketId, field, value }: { ticketId: string; field: keyof T; value: any }) => {
      updateTicketField(ticketId, field, value)
    },
    onRollback: ({ ticketId, field, value }: { ticketId: string; field: keyof T; value: any }) => {
      updateTicketField(ticketId, field, value)
    },
    onSuccess: () => {
      toast.success('Ticket updated successfully')
    },
    onError: (error) => {
      toast.error(`Failed to update ticket: ${error.message}`)
    },
  })

  const updateStatus = useCallback(async (
    ticketId: string,
    newStatus: string,
    previousStatus: string,
    apiCall: () => Promise<any>
  ) => {
    return execute(
      apiCall,
      { ticketId, field: 'status' as keyof T, value: newStatus },
      { ticketId, field: 'status' as keyof T, value: previousStatus }
    )
  }, [execute])

  const updatePriority = useCallback(async (
    ticketId: string,
    newPriority: string,
    previousPriority: string,
    apiCall: () => Promise<any>
  ) => {
    return execute(
      apiCall,
      { ticketId, field: 'priority' as keyof T, value: newPriority },
      { ticketId, field: 'priority' as keyof T, value: previousPriority }
    )
  }, [execute])

  return {
    updateStatus,
    updatePriority,
    isUpdating,
  }
}

export default useOptimisticUpdate
