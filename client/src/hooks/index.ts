/**
 * Custom React Hooks - Barrel Export
 * Centralized exports for all custom hooks
 */

// Async operations
export { useAsync, useAsyncWithDeps } from './useAsync'

// Data caching
export { 
  useCachedData, 
  clearAllCache, 
  clearCache, 
  invalidateCacheByPattern 
} from './useDataCache'

// Optimistic updates
export { 
  useOptimisticUpdate, 
  useTicketOptimisticUpdate 
} from './useOptimisticUpdate'

// Debounce & Throttle
export { 
  useDebounce, 
  useDebouncedCallback, 
  useThrottle 
} from './useDebounce'

// Infinite Scroll & Pagination
export {
  useInfiniteScroll,
  useScrollDetection,
  useWindowScrollDetection,
} from './useInfiniteScroll'

// Mutations with Optimistic Updates
export {
  useMutation,
  useTicketMutation,
  useStatusMutation,
  useAssignMutation,
} from './useMutation'

// Real-time Socket Hooks
export {
  useSocketConnection,
  useRealTimeTickets,
  useRealTimeTicket,
  useBulkOperationProgress,
  useSocketEvent,
} from './useSocket'

// Keyboard Shortcuts
export {
  useKeyboardShortcuts,
  useEscapeKey,
  useArrowNavigation,
  useTicketPageShortcuts,
  getShortcutDisplay,
} from './useKeyboardShortcuts'

// Focus Management
export {
  useFocusOnMount,
  useFocusWhen,
  useFocusTrap,
  useFocusReturn,
  useRovingTabIndex,
  useAnnounce,
} from './useFocusManagement'

// Notification Socket
export { useNotificationSocket } from './useNotificationSocket'

// Re-export types
export type { AsyncState } from './useAsync'
