import { useEffect, useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { 
  Loader2, Building2, User, Calendar, Clock, Mail, 
  CheckCircle2, AlertCircle, MessageSquare, UserPlus, 
  Play, Pause, XCircle, FileText, X
} from "lucide-react"
import { getTicketDetails, type AdminTicket } from "@/services/adminService"
import { toast } from "react-toastify"
import { cn } from "@/lib/utils"

interface TicketDetails extends AdminTicket {
  ticketId?: string
  comments?: any[]
  history?: Array<{
    action: string
    performedBy?: { name: string }
    timestamp: string
    details?: string
  }>
}

interface TicketDetailsDialogProps {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Timeline event configuration
const TIMELINE_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  CREATED: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Ticket Created' },
  ASSIGNED: { icon: UserPlus, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Assigned' },
  IN_PROGRESS: { icon: Play, color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'In Progress' },
  WAITING_FOR_USER: { icon: Pause, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Waiting for User' },
  RESOLVED: { icon: CheckCircle2, color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Resolved' },
  CLOSED: { icon: XCircle, color: 'text-slate-600', bgColor: 'bg-slate-100', label: 'Closed' },
  COMMENT: { icon: MessageSquare, color: 'text-sky-600', bgColor: 'bg-sky-100', label: 'Comment Added' },
  REOPENED: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Reopened' },
}

export function TicketDetailsDialog({ ticketId, open, onOpenChange }: TicketDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [ticket, setTicket] = useState<TicketDetails | null>(null)

  useEffect(() => {
    if (open && ticketId) {
      fetchTicket()
    } else {
      setTicket(null)
    }
  }, [open, ticketId])

  const fetchTicket = async () => {
    if (!ticketId) return
    try {
      setIsLoading(true)
      const result = await getTicketDetails(ticketId)
      if (result.success) {
        setTicket(result.data.ticket)
      }
    } catch (error: any) {
      console.error("Failed to fetch ticket details:", error)
      toast.error("Failed to load ticket details")
    } finally {
      setIsLoading(false)
    }
  }

  // Build timeline from ticket data
  const timeline = useMemo(() => {
    if (!ticket) return []
    
    const events: Array<{
      type: string
      timestamp: string
      performer?: string
      details?: string
    }> = []

    // Add creation event
    events.push({
      type: 'CREATED',
      timestamp: ticket.createdAt,
      performer: ticket.createdByName || ticket.contactName || 'User',
      details: `Ticket submitted to ${ticket.department?.replace(/_/g, ' ')}`
    })

    // Add assignment event if assigned
    if (ticket.assignedTo) {
      events.push({
        type: 'ASSIGNED',
        timestamp: ticket.updatedAt,
        performer: 'System',
        details: `Assigned to ${ticket.assignedTo.name}`
      })
    }

    // Add history events if available
    if (ticket.history && ticket.history.length > 0) {
      ticket.history.forEach(h => {
        events.push({
          type: h.action,
          timestamp: h.timestamp,
          performer: h.performedBy?.name || 'System',
          details: h.details
        })
      })
    }

    // Add comments as timeline events
    if (ticket.comments && ticket.comments.length > 0) {
      ticket.comments.forEach(comment => {
        events.push({
          type: 'COMMENT',
          timestamp: comment.createdAt,
          performer: comment.userName || 'User',
          details: comment.comment?.substring(0, 100) + (comment.comment?.length > 100 ? '...' : '')
        })
      })
    }

    // Add resolved event
    if (ticket.resolvedAt) {
      events.push({
        type: 'RESOLVED',
        timestamp: ticket.resolvedAt,
        performer: ticket.assignedTo?.name || 'Agent',
        details: 'Ticket has been resolved'
      })
    }

    // Add current status if not already in timeline
    const statusInTimeline = events.some(e => e.type === ticket.status)
    if (!statusInTimeline && ticket.status !== 'OPEN') {
      events.push({
        type: ticket.status,
        timestamp: ticket.updatedAt,
        performer: 'System',
        details: `Status changed to ${ticket.status.replace(/_/g, ' ')}`
      })
    }

    // Sort by timestamp
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [ticket])

  const getPriorityStyle = (priority: string) => {
    const styles: Record<string, string> = {
      LOW: 'bg-slate-100 text-slate-700 border-slate-200',
      MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      CRITICAL: 'bg-red-100 text-red-700 border-red-200'
    }
    return styles[priority] || styles.MEDIUM
  }

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-700',
      ASSIGNED: 'bg-purple-100 text-purple-700',
      IN_PROGRESS: 'bg-amber-100 text-amber-700',
      WAITING_FOR_USER: 'bg-orange-100 text-orange-700',
      RESOLVED: 'bg-emerald-100 text-emerald-700',
      CLOSED: 'bg-slate-100 text-slate-600'
    }
    return styles[status] || styles.OPEN
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-2rem)] sm:w-[90vw] sm:max-w-5xl max-h-[90vh] overflow-hidden p-0 gap-0 rounded-2xl border-0 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#032313] flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-white leading-snug">
                {ticket?.subject || "Ticket Details"}
              </DialogTitle>
              {ticket?.ticketId && (
                <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-md bg-white/10 text-[9px] font-mono font-bold text-[#ACDF33]">
                  #{ticket.ticketId}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {ticket && (
                <>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase",
                    getPriorityStyle(ticket.priority)
                  )}>
                    {ticket.priority}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase",
                    getStatusStyle(ticket.status)
                  )}>
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                </>
              )}
              <DialogClose className="ml-2 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                <X className="size-5" />
                <span className="sr-only">Close</span>
              </DialogClose>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-[#00A38C]" />
            </div>
          ) : ticket ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Left Column - Main Content */}
              <div className="lg:col-span-3 space-y-4">
                {/* Description */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileText className="size-3.5 text-slate-400" />
                    Description
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                    {ticket.description}
                  </p>
                </div>

                {/* Timeline */}
                <div className="p-4 rounded-xl bg-[#032313] shadow-lg">
                  <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="size-3.5 text-[#ACDF33]" />
                    Activity Timeline
                    <span className="ml-auto text-[10px] font-medium text-white/30">{timeline.length} events</span>
                  </h3>
                  <div className="relative">
                    <div className="absolute left-[13px] top-1 bottom-1 w-px bg-white/20" />
                    <div className="space-y-3">
                      {timeline.map((event, index) => {
                        const config = TIMELINE_CONFIG[event.type] || TIMELINE_CONFIG.CREATED
                        const IconComponent = config.icon
                        const isFirst = index === 0
                        
                        return (
                          <div key={index} className="relative flex gap-3">
                            <div className={cn(
                              "relative z-10 size-7 rounded-lg flex items-center justify-center shadow",
                              config.bgColor,
                              isFirst && "ring-2 ring-[#ACDF33]/50"
                            )}>
                              <IconComponent className={cn("size-3.5", config.color)} />
                            </div>
                            <div className="flex-1 min-w-0 py-0.5">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <span className="text-sm font-semibold text-white">{config.label}</span>
                                <span className="text-[10px] text-white/40 flex-shrink-0">{formatDateTime(event.timestamp)}</span>
                              </div>
                              {event.details && (
                                <p className="text-xs text-white/60 mt-0.5 break-words">{event.details}</p>
                              )}
                              {event.performer && (
                                <p className="text-[10px] text-[#ACDF33] mt-1">by {event.performer}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Comments */}
                {ticket.comments && ticket.comments.length > 0 && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <MessageSquare className="size-3.5 text-slate-400" />
                      Comments ({ticket.comments.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {ticket.comments.map((comment: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="size-5 rounded-full bg-slate-200 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-slate-600">
                                {(comment.userName || 'U')[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{comment.userName || 'Unknown'}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{formatDateTime(comment.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-600 pl-7">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="lg:col-span-2 space-y-4">
                {/* Ticket Info */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    Ticket Info
                  </h3>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-slate-100 gap-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 flex-shrink-0">
                        <Building2 className="size-3" /> Department
                      </span>
                      <span className="text-xs font-semibold text-slate-800 break-words text-right">{ticket.department?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-slate-100 gap-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 flex-shrink-0">
                        <User className="size-3" /> Created By
                      </span>
                      <span className="text-xs font-semibold text-slate-800 break-words text-right">{ticket.createdByName || ticket.contactName || 'User'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 flex-shrink-0">
                        <UserPlus className="size-3" /> Assigned To
                      </span>
                      <span className="text-xs font-semibold text-slate-800 break-words text-right">
                        {ticket.assignedTo?.name || <span className="text-slate-400">Unassigned</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar className="size-3.5 text-blue-500" />
                    Dates
                  </h3>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-slate-100 gap-1">
                      <span className="text-xs text-slate-500">Created</span>
                      <span className="text-xs font-semibold text-slate-800 text-right">{formatDateTime(ticket.createdAt)}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-slate-100 gap-1">
                      <span className="text-xs text-slate-500">Updated</span>
                      <span className="text-xs font-semibold text-slate-800 text-right">{formatDateTime(ticket.updatedAt)}</span>
                    </div>
                    {ticket.resolvedAt && (
                      <div className="flex items-center justify-between py-2 bg-emerald-50 -mx-4 px-4 rounded-lg">
                        <span className="text-xs text-emerald-600 font-medium">Resolved</span>
                        <span className="text-xs font-semibold text-emerald-700">{formatDateTime(ticket.resolvedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact */}
                {(ticket.contactName || ticket.contactEmail) && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Mail className="size-3.5 text-purple-500" />
                      Contact
                    </h3>
                    <div className="space-y-2">
                      {ticket.contactName && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-slate-100 gap-1">
                          <span className="text-xs text-slate-500">Name</span>
                          <span className="text-xs font-semibold text-slate-800 break-words text-right">{ticket.contactName}</span>
                        </div>
                      )}
                      {ticket.contactEmail && (
                        <div className="py-2">
                          <span className="text-xs text-slate-500 block mb-1">Email</span>
                          <span className="text-xs font-semibold text-slate-800 break-all">{ticket.contactEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="size-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">Ticket not found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
