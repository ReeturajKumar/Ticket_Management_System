import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  X, 
  User as UserIcon, 
  Clock, 
  Hash, 
  Calendar, 
  Shield,
  Loader2,
  Activity,
  Mail
} from "lucide-react"
import { getMyTicketDetails } from "@/services/departmentStaffService"
import { getTicketDetails } from "@/services/departmentHeadService"
import { useRealTimeTicket } from "@/hooks"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/config/themeConfig"
import type { Ticket, TicketComment } from "@/types/ticket"

interface TicketDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  isHead?: boolean
}

export function TicketDetailsDialog({ open, onOpenChange, ticketId, isHead }: TicketDetailsDialogProps) {
  const queryClient = useQueryClient()

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const res = isHead ? await getTicketDetails(ticketId) : await getMyTicketDetails(ticketId)
      return res.data as Ticket
    },
    enabled: open && !!ticketId,
  })

  // Real-time updates for the current ticket
  useRealTimeTicket({
    ticketId: open ? ticketId : '',
    showNotifications: false,
    onCommentAdded: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    },
    onStatusChanged: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    }
  });

  const statusInfo = ticket ? (STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.OPEN) : null
  const priorityInfo = ticket ? (PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.LOW) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[98vw] w-full sm:max-w-7xl max-h-[90vh] overflow-hidden p-0 gap-0 bg-white">
        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : ticket ? (
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-slate-50/50 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${statusInfo?.color} text-white uppercase text-[10px] px-2 py-0.5 font-bold`}>
                    {statusInfo?.label}
                  </Badge>
                  <Badge variant={priorityInfo?.variant as any} className="uppercase text-[10px] px-2 py-0.5 font-bold">
                    {priorityInfo?.label}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{ticket.subject}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-7 w-7 rounded-full hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Info Cards Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                        <Activity className="h-3 w-3" />
                        Urgency Level
                      </div>
                      <div className={`text-xs font-bold uppercase ${ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'text-orange-600' : 'text-slate-700'}`}>
                        {priorityInfo?.label}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                        <Shield className="h-3 w-3" />
                        SLA Status
                      </div>
                      <div className="text-xs font-bold text-slate-700 uppercase">
                        ACTIVE MONITORING
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                        <Clock className="h-3 w-3" />
                        Last Activity
                      </div>
                      <div className="text-xs font-bold text-slate-700">
                        {new Date(ticket.updatedAt || ticket.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Description Card */}
                  <div className="bg-slate-900 rounded-xl p-5 text-white relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
                    <div className="relative z-10">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-2">
                        Ticket Description
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-200">
                        {ticket.description}
                      </p>
                    </div>
                  </div>

                  {/* Interaction Timeline */}
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      <Activity className="h-3.5 w-3.5" />
                      Interaction Timeline
                    </div>
                    
                    <div className="space-y-3">
                      {/* Ticket Created */}
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                          </div>
                          {(ticket.assignedTo || (ticket.comments && ticket.comments.length > 0)) && <div className="w-0.5 h-6 bg-slate-200 my-0.5"></div>}
                        </div>
                        <div className="flex-1 pt-1.5">
                          <div className="font-bold text-xs text-slate-900">TICKET CREATED</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} • {new Date(ticket.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {/* Assigned */}
                      {ticket.assignedTo && (
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <UserIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            {ticket.comments && ticket.comments.length > 0 && <div className="w-0.5 h-8 bg-slate-200 my-1"></div>}
                          </div>
                          <div className="flex-1 pt-2">
                            <div className="font-bold text-sm text-slate-900 uppercase">ASSIGNED TO {typeof ticket.assignedTo === 'object' ? ticket.assignedTo.name : 'STAFF'}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Processing initiation confirmed
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Comments */}
                      {ticket.comments && ticket.comments.map((comment: TicketComment, idx: number) => {
                        const authorName = typeof comment.user === 'object' ? comment.user.name : (comment.userName || 'User')
                        const isInternal = comment.isInternal || authorName.includes('[INTERNAL]')
                        
                        return (
                          <div key={idx} className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                <div className="text-xs font-bold text-slate-600">{authorName.charAt(0)}</div>
                              </div>
                              {idx < (ticket.comments?.length || 0) - 1 && <div className="w-0.5 h-8 bg-slate-200 my-1"></div>}
                            </div>
                            <div className="flex-1 pt-2">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-sm text-slate-900">{authorName.replace('[INTERNAL] ', '')}</div>
                                {isInternal && (
                                  <div className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-primary/20">
                                    <Shield className="h-2.5 w-2.5" />
                                    Internal
                                  </div>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(comment.createdAt).toLocaleDateString()} • {new Date(comment.createdAt).toLocaleTimeString()}
                              </div>
                              <div className={`mt-2 text-sm p-3 rounded-xl border shadow-sm ${
                                isInternal 
                                ? 'bg-slate-50 text-slate-900 border-slate-200' 
                                : 'bg-white text-slate-700 border-slate-200'
                              }`}>
                                {comment.comment}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-1">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-inner">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-4">
                      Core Metadata
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">
                          <Hash className="h-2.5 w-2.5" />
                          Department
                        </div>
                        <div className="text-xs font-bold text-slate-900 uppercase">
                          {ticket.department}
                        </div>
                      </div>

                      <Separator className="bg-slate-200/60" />

                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                          <UserIcon className="h-3 w-3" />
                          Ticket Creator
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {typeof ticket.createdBy === 'object' ? ticket.createdBy.name : (ticket.userName || 'Generic User')}
                        </div>
                      </div>

                      <Separator className="bg-slate-200/60" />

                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                          <Mail className="h-3 w-3" />
                          Contact Entry
                        </div>
                        <div className="text-sm font-medium text-slate-700 break-all">
                          {ticket.contactEmail || 'No active email'}
                        </div>
                      </div>

                      <Separator className="bg-slate-200/60" />

                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                          <Calendar className="h-3 w-3" />
                          Timeline Start
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <Separator className="bg-slate-200/60" />

                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">
                          <Clock className="h-3 w-3" />
                          System Trace ID
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 break-all bg-white p-1.5 rounded border border-slate-200">
                          {ticket.ticketId || ticket._id}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-slate-50/50 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="font-bold text-xs uppercase tracking-wider"
              >
                Close View
              </Button>
              <Button 
                onClick={() => window.location.href = `/department/tickets/${ticket._id}`} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider px-6"
              >
                Launch Full Console
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-2">
            <p>Resource not found or inaccessible.</p>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Dismiss</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
