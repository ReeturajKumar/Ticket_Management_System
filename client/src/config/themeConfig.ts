/**
 * Design system configuration for status and priority mappings
 * Use these constants to ensure visual consistency across the app
 */

export const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    color: 'bg-blue-500',
    text: 'text-blue-500',
    bg: 'bg-blue-50',
    darkBg: 'dark:bg-blue-950/30',
    darkText: 'dark:text-blue-400',
    border: 'border-blue-200'
  },
  ASSIGNED: {
    label: 'Assigned',
    color: 'bg-indigo-500',
    text: 'text-indigo-500',
    bg: 'bg-indigo-50',
    darkBg: 'dark:bg-indigo-950/30',
    darkText: 'dark:text-indigo-400',
    border: 'border-indigo-200'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-orange-500',
    text: 'text-orange-500',
    bg: 'bg-orange-50',
    darkBg: 'dark:bg-orange-950/30',
    darkText: 'dark:text-orange-400',
    border: 'border-orange-200'
  },
  WAITING_FOR_USER: {
    label: 'Waiting for User',
    color: 'bg-purple-500',
    text: 'text-purple-500',
    bg: 'bg-purple-50',
    darkBg: 'dark:bg-purple-950/30',
    darkText: 'dark:text-purple-400',
    border: 'border-purple-200'
  },
  RESOLVED: {
    label: 'Resolved',
    color: 'bg-green-500',
    text: 'text-green-500',
    bg: 'bg-green-50',
    darkBg: 'dark:bg-green-950/30',
    darkText: 'dark:text-green-400',
    border: 'border-green-200'
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-slate-500',
    text: 'text-slate-500',
    bg: 'bg-slate-50',
    darkBg: 'dark:bg-slate-950/30',
    darkText: 'dark:text-slate-400',
    border: 'border-slate-200'
  }
} as const

export interface StatusColumn {
  readonly key: string
  readonly label: string
  readonly color: string
}

export const PRIORITY_CONFIG = {
  CRITICAL: {
    label: 'Critical',
    variant: 'destructive',
    color: 'text-red-600',
    dot: 'bg-red-600'
  },
  HIGH: {
    label: 'High',
    variant: 'default',
    color: 'text-orange-600',
    dot: 'bg-orange-600'
  },
  MEDIUM: {
    label: 'Medium',
    variant: 'secondary',
    color: 'text-blue-600',
    dot: 'bg-blue-600'
  },
  LOW: {
    label: 'Low',
    variant: 'outline',
    color: 'text-slate-600',
    dot: 'bg-slate-600'
  }
} as const

export const STATUS_COLUMNS_DEFAULT = [
  { key: 'ASSIGNED', label: 'Assigned', color: 'bg-indigo-500' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-orange-500' },
  { key: 'WAITING_FOR_USER', label: 'Waiting', color: 'bg-purple-500' },
  { key: 'RESOLVED', label: 'Resolved', color: 'bg-green-500' },
  { key: 'CLOSED', label: 'Closed', color: 'bg-slate-500' },
] as const

export const STATUS_COLUMNS_UNASSIGNED = [
  { key: 'OPEN', label: 'Open', color: 'bg-blue-500' },
] as const

export const STATUS_COLUMNS_MY_REQUESTS = [
  { key: 'OPEN', label: 'Open', color: 'bg-blue-500' },
  { key: 'ASSIGNED', label: 'Assigned', color: 'bg-indigo-500' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-orange-500' },
  { key: 'RESOLVED', label: 'Resolved', color: 'bg-green-500' },
  { key: 'CLOSED', label: 'Closed', color: 'bg-slate-500' },
] as const
