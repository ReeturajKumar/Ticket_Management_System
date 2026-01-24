// ============================================================================
// ACCESSIBILITY UTILITIES
// Helper functions and constants for accessibility features
// ============================================================================

/**
 * Generate unique IDs for ARIA attributes
 */
let idCounter = 0
export function generateId(prefix = 'aria'): string {
  return `${prefix}-${++idCounter}`
}

/**
 * Create aria-describedby IDs for related elements
 */
export function createAriaDescribedBy(ids: (string | undefined | null)[]): string | undefined {
  const validIds = ids.filter(Boolean)
  return validIds.length > 0 ? validIds.join(' ') : undefined
}

// ============================================================================
// ARIA LABEL HELPERS
// ============================================================================

/**
 * Get descriptive label for ticket priority
 */
export function getPriorityAriaLabel(priority: string): string {
  const labels: Record<string, string> = {
    CRITICAL: 'Critical priority - requires immediate attention',
    HIGH: 'High priority',
    MEDIUM: 'Medium priority',
    LOW: 'Low priority',
  }
  return labels[priority] || `${priority} priority`
}

/**
 * Get descriptive label for ticket status
 */
export function getStatusAriaLabel(status: string): string {
  const labels: Record<string, string> = {
    OPEN: 'Open - awaiting assignment',
    ASSIGNED: 'Assigned to a team member',
    IN_PROGRESS: 'Currently being worked on',
    WAITING_FOR_USER: 'Waiting for user response',
    RESOLVED: 'Issue has been resolved',
    CLOSED: 'Ticket is closed',
  }
  return labels[status] || status.replace(/_/g, ' ')
}

/**
 * Get screen reader friendly date
 */
export function getDateAriaLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Get relative time for screen readers
 */
export function getRelativeTimeAriaLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  
  return getDateAriaLabel(d)
}

// ============================================================================
// LIVE REGION MESSAGES
// ============================================================================

/**
 * Selection change announcement
 */
export function getSelectionAnnouncement(count: number, total?: number): string {
  if (count === 0) return 'Selection cleared'
  if (total && count === total) return `All ${total} items selected`
  return `${count} item${count === 1 ? '' : 's'} selected`
}

/**
 * Loading state announcement
 */
export function getLoadingAnnouncement(isLoading: boolean, itemType = 'items'): string {
  return isLoading ? `Loading ${itemType}...` : `${itemType} loaded`
}

/**
 * Filter change announcement
 */
export function getFilterAnnouncement(filterName: string, value: string | null): string {
  if (value === null || value === 'ALL') {
    return `${filterName} filter cleared`
  }
  return `Filtered by ${filterName}: ${value}`
}

/**
 * Sort change announcement
 */
export function getSortAnnouncement(sortBy: string, order: 'asc' | 'desc'): string {
  const orderLabel = order === 'asc' ? 'ascending' : 'descending'
  return `Sorted by ${sortBy.replace(/([A-Z])/g, ' $1').toLowerCase()}, ${orderLabel}`
}

// ============================================================================
// SKIP LINKS
// ============================================================================

export interface SkipLink {
  id: string
  label: string
}

export const defaultSkipLinks: SkipLink[] = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'main-navigation', label: 'Skip to navigation' },
  { id: 'search', label: 'Skip to search' },
]

// ============================================================================
// KEYBOARD SHORTCUT DESCRIPTIONS
// ============================================================================

export interface ShortcutInfo {
  keys: string
  description: string
  category: string
}

export const globalShortcuts: ShortcutInfo[] = [
  { keys: 'Ctrl+N', description: 'Create new ticket', category: 'Actions' },
  { keys: 'Ctrl+K or /', description: 'Focus search', category: 'Navigation' },
  { keys: 'Ctrl+V', description: 'Toggle view mode', category: 'View' },
  { keys: 'Ctrl+R', description: 'Refresh data', category: 'Actions' },
  { keys: 'Ctrl+A', description: 'Select all', category: 'Selection' },
  { keys: 'Escape', description: 'Clear selection / Close dialog', category: 'General' },
  { keys: '↑/↓', description: 'Navigate list items', category: 'Navigation' },
  { keys: 'Enter', description: 'Open selected item', category: 'Actions' },
]

// ============================================================================
// COLOR CONTRAST HELPERS
// ============================================================================

/**
 * Check if text color should be light or dark based on background
 */
export function getContrastTextColor(backgroundColor: string): 'light' | 'dark' {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? 'dark' : 'light'
}

// ============================================================================
// REDUCED MOTION
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get animation duration based on user preference
 */
export function getAnimationDuration(normalMs: number): number {
  return prefersReducedMotion() ? 0 : normalMs
}

// ============================================================================
// FORM ACCESSIBILITY
// ============================================================================

/**
 * Generate error message ID for form field
 */
export function getErrorId(fieldId: string): string {
  return `${fieldId}-error`
}

/**
 * Generate description ID for form field
 */
export function getDescriptionId(fieldId: string): string {
  return `${fieldId}-description`
}

/**
 * Get ARIA attributes for form field with error
 */
export function getFieldAriaProps(
  fieldId: string,
  error?: string,
  description?: string
): Record<string, string | boolean | undefined> {
  const describedBy: string[] = []
  
  if (error) {
    describedBy.push(getErrorId(fieldId))
  }
  if (description) {
    describedBy.push(getDescriptionId(fieldId))
  }
  
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
  }
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  generateId,
  createAriaDescribedBy,
  getPriorityAriaLabel,
  getStatusAriaLabel,
  getDateAriaLabel,
  getRelativeTimeAriaLabel,
  getSelectionAnnouncement,
  getLoadingAnnouncement,
  getFilterAnnouncement,
  getSortAnnouncement,
  defaultSkipLinks,
  globalShortcuts,
  getContrastTextColor,
  prefersReducedMotion,
  getAnimationDuration,
  getErrorId,
  getDescriptionId,
  getFieldAriaProps,
}
