import { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  type ReactNode,
  useEffect,
  useMemo,
} from 'react'

// ============================================================================
// TICKET STORE - Global State Management using React Context + useReducer
// Provides persistent state for ticket-related UI preferences
// ============================================================================

// Types
export type ViewMode = 'board' | 'list'
export type SortBy = 'createdAt' | 'updatedAt' | 'priority' | 'status'
export type SortOrder = 'asc' | 'desc'

export interface TicketFilters {
  status: string[]
  priority: string[]
  assignee: string | null
  department: string | null
  dateRange: {
    start: string | null
    end: string | null
  }
  searchTerm: string
}

export interface TicketStoreState {
  // Selection
  selectedTicketIds: string[]
  
  // View preferences
  viewMode: ViewMode
  
  // Filters
  filters: TicketFilters
  
  // Sorting
  sortBy: SortBy
  sortOrder: SortOrder
  
  // UI State
  isBulkMode: boolean
  activeTab: string
}

// Initial state
const initialState: TicketStoreState = {
  selectedTicketIds: [],
  viewMode: 'board',
  filters: {
    status: [],
    priority: [],
    assignee: null,
    department: null,
    dateRange: { start: null, end: null },
    searchTerm: '',
  },
  sortBy: 'createdAt',
  sortOrder: 'desc',
  isBulkMode: false,
  activeTab: 'all-tickets',
}

// Action types
type TicketStoreAction =
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'TOGGLE_TICKET_SELECTION'; payload: string }
  | { type: 'SELECT_TICKETS'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'SET_FILTERS'; payload: Partial<TicketFilters> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_SORT'; payload: { sortBy: SortBy; sortOrder: SortOrder } }
  | { type: 'SET_BULK_MODE'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'HYDRATE'; payload: Partial<TicketStoreState> }

// Reducer
function ticketStoreReducer(state: TicketStoreState, action: TicketStoreAction): TicketStoreState {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload }
    
    case 'TOGGLE_TICKET_SELECTION':
      return {
        ...state,
        selectedTicketIds: state.selectedTicketIds.includes(action.payload)
          ? state.selectedTicketIds.filter(id => id !== action.payload)
          : [...state.selectedTicketIds, action.payload],
      }
    
    case 'SELECT_TICKETS':
      return { ...state, selectedTicketIds: action.payload }
    
    case 'CLEAR_SELECTION':
      return { ...state, selectedTicketIds: [] }
    
    case 'SELECT_ALL':
      return { ...state, selectedTicketIds: action.payload }
    
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      }
    
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialState.filters,
      }
    
    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder,
      }
    
    case 'SET_BULK_MODE':
      return {
        ...state,
        isBulkMode: action.payload,
        selectedTicketIds: action.payload ? state.selectedTicketIds : [],
      }
    
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
        selectedTicketIds: [], // Clear selection on tab change
      }
    
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        filters: { ...state.filters, searchTerm: action.payload },
      }
    
    case 'HYDRATE':
      return { ...state, ...action.payload }
    
    default:
      return state
  }
}

// Context types
interface TicketStoreContextType {
  state: TicketStoreState
  
  // View mode
  setViewMode: (mode: ViewMode) => void
  toggleViewMode: () => void
  
  // Selection
  toggleTicketSelection: (id: string) => void
  selectTickets: (ids: string[]) => void
  clearSelection: () => void
  selectAll: (ticketIds: string[]) => void
  isSelected: (id: string) => boolean
  
  // Filters
  setFilters: (filters: Partial<TicketFilters>) => void
  resetFilters: () => void
  setSearchTerm: (term: string) => void
  hasActiveFilters: boolean
  
  // Sorting
  setSort: (sortBy: SortBy, sortOrder: SortOrder) => void
  toggleSortOrder: () => void
  
  // Bulk mode
  setBulkMode: (enabled: boolean) => void
  toggleBulkMode: () => void
  
  // Tab
  setActiveTab: (tab: string) => void
}

// Create context
const TicketStoreContext = createContext<TicketStoreContextType | null>(null)

// Storage key for persistence
const STORAGE_KEY = 'CloudBlitz-ticket-store'

// Load persisted state from localStorage
function loadPersistedState(): Partial<TicketStoreState> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Only restore UI preferences, not selection state
      return {
        viewMode: parsed.viewMode || 'board',
        sortBy: parsed.sortBy || 'createdAt',
        sortOrder: parsed.sortOrder || 'desc',
        activeTab: parsed.activeTab || 'all-tickets',
      }
    }
  } catch (error) {
    console.error('Failed to load ticket store state:', error)
  }
  return {}
}

// Save state to localStorage
function persistState(state: TicketStoreState) {
  try {
    const toPersist = {
      viewMode: state.viewMode,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
      activeTab: state.activeTab,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
  } catch (error) {
    console.error('Failed to persist ticket store state:', error)
  }
}

// Provider component
interface TicketStoreProviderProps {
  children: ReactNode
}

export function TicketStoreProvider({ children }: TicketStoreProviderProps) {
  const [state, dispatch] = useReducer(ticketStoreReducer, initialState)

  // Hydrate state from localStorage on mount
  useEffect(() => {
    const persisted = loadPersistedState()
    if (Object.keys(persisted).length > 0) {
      dispatch({ type: 'HYDRATE', payload: persisted })
    }
  }, [])

  // Persist state changes to localStorage
  useEffect(() => {
    persistState(state)
  }, [state.viewMode, state.sortBy, state.sortOrder, state.activeTab])

  // Memoized actions
  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode })
  }, [])

  const toggleViewMode = useCallback(() => {
    dispatch({ type: 'SET_VIEW_MODE', payload: state.viewMode === 'board' ? 'list' : 'board' })
  }, [state.viewMode])

  const toggleTicketSelection = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_TICKET_SELECTION', payload: id })
  }, [])

  const selectTickets = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_TICKETS', payload: ids })
  }, [])

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' })
  }, [])

  const selectAll = useCallback((ticketIds: string[]) => {
    dispatch({ type: 'SELECT_ALL', payload: ticketIds })
  }, [])

  const isSelected = useCallback((id: string) => {
    return state.selectedTicketIds.includes(id)
  }, [state.selectedTicketIds])

  const setFilters = useCallback((filters: Partial<TicketFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }, [])

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' })
  }, [])

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term })
  }, [])

  const hasActiveFilters = useMemo(() => {
    const { filters } = state
    return (
      filters.status.length > 0 ||
      filters.priority.length > 0 ||
      filters.assignee !== null ||
      filters.department !== null ||
      filters.dateRange.start !== null ||
      filters.dateRange.end !== null ||
      filters.searchTerm !== ''
    )
  }, [state.filters])

  const setSort = useCallback((sortBy: SortBy, sortOrder: SortOrder) => {
    dispatch({ type: 'SET_SORT', payload: { sortBy, sortOrder } })
  }, [])

  const toggleSortOrder = useCallback(() => {
    dispatch({ 
      type: 'SET_SORT', 
      payload: { 
        sortBy: state.sortBy, 
        sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' 
      } 
    })
  }, [state.sortBy, state.sortOrder])

  const setBulkMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_BULK_MODE', payload: enabled })
  }, [])

  const toggleBulkMode = useCallback(() => {
    dispatch({ type: 'SET_BULK_MODE', payload: !state.isBulkMode })
  }, [state.isBulkMode])

  const setActiveTab = useCallback((tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })
  }, [])

  const contextValue = useMemo<TicketStoreContextType>(() => ({
    state,
    setViewMode,
    toggleViewMode,
    toggleTicketSelection,
    selectTickets,
    clearSelection,
    selectAll,
    isSelected,
    setFilters,
    resetFilters,
    setSearchTerm,
    hasActiveFilters,
    setSort,
    toggleSortOrder,
    setBulkMode,
    toggleBulkMode,
    setActiveTab,
  }), [
    state,
    setViewMode,
    toggleViewMode,
    toggleTicketSelection,
    selectTickets,
    clearSelection,
    selectAll,
    isSelected,
    setFilters,
    resetFilters,
    setSearchTerm,
    hasActiveFilters,
    setSort,
    toggleSortOrder,
    setBulkMode,
    toggleBulkMode,
    setActiveTab,
  ])

  return (
    <TicketStoreContext.Provider value={contextValue}>
      {children}
    </TicketStoreContext.Provider>
  )
}

// Custom hook to use ticket store
export function useTicketStore() {
  const context = useContext(TicketStoreContext)
  
  if (!context) {
    throw new Error('useTicketStore must be used within a TicketStoreProvider')
  }
  
  return context
}

// Selector hooks for specific parts of state (for performance optimization)
export function useTicketSelection() {
  const { state, toggleTicketSelection, selectTickets, clearSelection, selectAll, isSelected } = useTicketStore()
  return {
    selectedTicketIds: state.selectedTicketIds,
    selectedCount: state.selectedTicketIds.length,
    toggleTicketSelection,
    selectTickets,
    clearSelection,
    selectAll,
    isSelected,
  }
}

export function useTicketFilters() {
  const { state, setFilters, resetFilters, setSearchTerm, hasActiveFilters } = useTicketStore()
  return {
    filters: state.filters,
    setFilters,
    resetFilters,
    setSearchTerm,
    hasActiveFilters,
  }
}

export function useTicketViewMode() {
  const { state, setViewMode, toggleViewMode } = useTicketStore()
  return {
    viewMode: state.viewMode,
    setViewMode,
    toggleViewMode,
  }
}

export function useTicketSort() {
  const { state, setSort, toggleSortOrder } = useTicketStore()
  return {
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    setSort,
    toggleSortOrder,
  }
}

export default TicketStoreProvider
