import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Trash2, Ticket, AlertCircle, Info, CheckCircle, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications, type Notification, type NotificationType } from '@/stores/notificationStore'
import { cn } from '@/lib/utils'

// ============================================================================
// NOTIFICATION BELL COMPONENT
// Shows notification icon with unread count and dropdown list
// ============================================================================

// Get icon and colors for notification type
function getNotificationStyle(type: NotificationType) {
  switch (type) {
    case 'ticket':
      return {
        icon: <Ticket className="h-4 w-4" />,
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        accentColor: 'border-l-indigo-500',
      }
    case 'success':
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        accentColor: 'border-l-emerald-500',
      }
    case 'warning':
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        iconBg: 'bg-amber-100 dark:bg-amber-900/50',
        iconColor: 'text-amber-600 dark:text-amber-400',
        accentColor: 'border-l-amber-500',
      }
    case 'error':
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        iconBg: 'bg-red-100 dark:bg-red-900/50',
        iconColor: 'text-red-600 dark:text-red-400',
        accentColor: 'border-l-red-500',
      }
    case 'info':
    default:
      return {
        icon: <Info className="h-4 w-4" />,
        iconBg: 'bg-blue-100 dark:bg-blue-900/50',
        iconColor: 'text-blue-600 dark:text-blue-400',
        accentColor: 'border-l-blue-500',
      }
  }
}

// Get priority style
function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-red-500 text-white border-red-500'
    case 'HIGH':
      return 'bg-orange-500 text-white border-orange-500'
    case 'MEDIUM':
      return 'bg-blue-500 text-white border-blue-500'
    case 'LOW':
    default:
      return 'bg-slate-500 text-white border-slate-500'
  }
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Single notification item
interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onRemove: (id: string) => void
  onClick: (notification: Notification) => void
}

function NotificationItem({ notification, onMarkAsRead, onRemove, onClick }: NotificationItemProps) {
  const style = getNotificationStyle(notification.type)
  
  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={cn(
        'group relative border-l-4 transition-all duration-200',
        'hover:bg-slate-50 dark:hover:bg-slate-800/50',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset',
        notification.read 
          ? 'bg-white dark:bg-slate-900 border-l-transparent opacity-70 hover:opacity-100' 
          : cn('bg-white dark:bg-slate-900', style.accentColor)
      )}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(notification)
        }
      }}
      aria-label={`${notification.read ? '' : 'Unread: '}${notification.title}. ${notification.message}`}
    >
      <div className="flex items-start gap-3 p-3 cursor-pointer">
        {/* Icon with background */}
        <div className={cn(
          'flex-shrink-0 p-2 rounded-lg',
          style.iconBg,
          style.iconColor
        )}>
          {style.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 pr-8">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm leading-tight',
              notification.read 
                ? 'font-medium text-slate-600 dark:text-slate-400' 
                : 'font-semibold text-slate-900 dark:text-slate-100'
            )}>
              {notification.title}
            </p>
          </div>
          
          {/* Message */}
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {notification.message}
          </p>
          
          {/* Footer with priority and time */}
          <div className="flex items-center gap-2 mt-2">
            {notification.data?.priority && (
              <Badge 
                className={cn(
                  'text-[10px] h-5 px-2 font-medium rounded-full',
                  getPriorityStyle(notification.data.priority)
                )}
              >
                {notification.data.priority}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(notification.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Unread dot */}
        {!notification.read && (
          <div className="absolute top-3 right-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* Action buttons - slide in from right on hover */}
      <div className={cn(
        'absolute right-0 top-0 bottom-0 flex items-center',
        'translate-x-full group-hover:translate-x-0 transition-transform duration-200',
        'bg-gradient-to-l from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900',
        'pl-8 pr-2'
      )}>
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50"
            onClick={(e) => {
              e.stopPropagation()
              onMarkAsRead(notification.id)
            }}
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 ml-1"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(notification.id)
          }}
          title="Remove"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications()

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    // Navigate if it's a ticket notification
    if (notification.data?.ticketId) {
      setOpen(false)
      navigate(`/department/tickets?ticketId=${notification.data.ticketId}`)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" aria-hidden="true" />
          {unreadCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex items-center justify-center h-5 min-w-5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </span>
          )}
          {/* Screen reader announcement for unread count */}
          <span className="sr-only">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No new notifications'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[360px] sm:w-[400px] p-0 max-h-[75vh] overflow-hidden flex flex-col rounded-xl shadow-xl border-slate-200 dark:border-slate-700"
        role="menu"
        aria-label="Notifications"
      >
        {/* Live region for screen reader announcements */}
        <div 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        >
          {unreadCount > 0 && `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
              <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    markAllAsRead()
                  }}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Read all
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                onClick={(e) => {
                  e.stopPropagation()
                  clearAll()
                }}
                title="Clear all notifications"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Notifications list - hidden scrollbar */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 mb-4">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All caught up!</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                You have no new notifications. We'll notify you when something arrives.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onRemove={removeNotification}
                onClick={handleNotificationClick}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  clearAll()
                }}
              >
                Clear all
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell
