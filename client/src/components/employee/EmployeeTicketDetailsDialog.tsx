import { useState, useEffect } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  User, 
  Building, 
  Calendar, 
  Ticket as TicketIcon,
  AlertCircle,
  CheckCircle2,
  History,
  Loader2,
  ShieldCheck,
  Zap,
  Paperclip,
  Activity,
  UserCheck,
  Mail,
  Fingerprint,
  Send
} from "lucide-react"
import { employeeService } from "@/services/employeeService"
import { cn } from "@/lib/utils"
import { toast } from "react-toastify"
import { useAuth } from "@/contexts/AuthContext"
import { useRealTimeTicket } from "@/hooks/useSocket"

interface EmployeeTicketDetailsDialogProps {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TimelineEvent {
  type: string;
  title: string;
  date: Date;
  icon: any;
  color: string;
  content?: string;
  isComment?: boolean;
}

export function EmployeeTicketDetailsDialog({ ticketId, open, onOpenChange }: EmployeeTicketDetailsDialogProps) {
  const { user } = useAuth()
  const [ticket, setTicket] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Real-time updates for this specific ticket
  useRealTimeTicket({
    ticketId: ticketId || '',
    onCommentAdded: () => {
      if (ticketId) fetchTicketDetails(ticketId, true)
    },
    onStatusChanged: () => {
      if (ticketId) fetchTicketDetails(ticketId, true)
    }
  })

  useEffect(() => {
    if (open && ticketId) {
      fetchTicketDetails(ticketId)
    } else if (!open) {
      setTicket(null)
    }
  }, [open, ticketId])

  const fetchTicketDetails = async (id: string, silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const response = await employeeService.getTicketDetails(id)
      if (response.success) {
        setTicket(response.data)
      }
    } catch (error) {
      console.error("Failed to fetch ticket details:", error)
      if (!silent) toast.error("Failed to load ticket details")
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim() || !ticketId) return

    try {
      setIsSubmitting(true)
      const response = await employeeService.addComment(ticketId, comment)
      if (response.success) {
        toast.success("Message sent")
        setComment("")
        fetchTicketDetails(ticketId, true)
      }
    } catch (error) {
      console.error("Failed to add comment:", error)
      toast.error("Failed to send message")
    } finally {
      setIsSubmitting(false)
    }
  }


  // Synthesis logic for compact timeline
  const getTimelineEvents = () => {
    if (!ticket) return []
    const events: TimelineEvent[] = [
      {
        type: 'creation',
        title: 'Ticket Created',
        date: new Date(ticket.createdAt),
        icon: TicketIcon,
        color: 'bg-emerald-500'
      }
    ]

    if (ticket.assignedToName) {
      events.push({
        type: 'assignment',
        title: `Assigned to ${ticket.assignedToName}`,
        date: new Date(ticket.createdAt),
        icon: User,
        color: 'bg-blue-500'
      })
    }

    if (ticket.comments) {
      ticket.comments.forEach((c: any) => {
        events.push({
          type: 'comment',
          title: c.userName === user?.name ? 'You' : c.userName,
          content: c.comment,
          date: new Date(c.createdAt),
          icon: History,
          color: c.userName === user?.name ? 'bg-[#032313]' : 'bg-[#ACDF33]',
          isComment: true
        })
      })
    }

    if (ticket.resolvedAt) {
      events.push({
        type: 'resolution',
        title: 'Resolved',
        date: new Date(ticket.resolvedAt),
        icon: CheckCircle2,
        color: 'bg-[#ACDF33]'
      })
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-7xl h-[90vh] p-0 overflow-y-auto lg:overflow-hidden border-none shadow-2xl rounded-[24px] sm:rounded-[32px]">
        {isLoading ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-white">
            <Loader2 className="size-12 animate-spin text-[#032313]" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Ticket Details...</p>
          </div>
        ) : ticket ? (
          <div className="flex h-auto lg:h-full flex-col bg-slate-50/50 lg:flex-row overflow-visible lg:overflow-hidden">
            {/* Left Section: Details & Conversation (Scrollable) */}
            <div className="flex-1 flex flex-col h-auto lg:h-full bg-white min-w-0 w-full">
              <div className="p-4 sm:p-8 pb-4 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-[#032313] text-white rounded-lg px-2.5 py-0.5 text-[9px] font-black tracking-widest uppercase shadow-sm">
                      #{ticket._id.slice(-6).toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={cn(
                      "rounded-full px-3 py-0.5 text-[9px] font-black uppercase tracking-widest border-none",
                      ticket.status === 'RESOLVED' ? "bg-emerald-500 text-white" :
                      ticket.status === 'IN_PROGRESS' ? "bg-blue-500 text-white" :
                      "bg-[#ACDF33] text-[#032313]"
                    )}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl font-bold font-garnett tracking-tight text-slate-900">
                    {ticket.subject}
                  </DialogTitle>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 scrollbar-hide">
                {/* Technical Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Zap className="size-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Urgency Level</span>
                    </div>
                    <p className={cn(
                      "text-sm font-bold",
                      ticket.priority === 'CRITICAL' ? "text-rose-600" :
                      ticket.priority === 'HIGH' ? "text-orange-500" : "text-blue-500"
                    )}>{ticket.priority} RESPONSE REQUIRED</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <ShieldCheck className="size-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">SLA Status</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? "MET WITHIN WINDOW" : "ACTIVE MONITORING"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Activity className="size-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Last Activity</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{new Date(ticket.updatedAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                {/* Original Description */}
                <div className="bg-[#032313] shadow-2xl rounded-[32px] p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Fingerprint className="size-32" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ACDF33] mb-4">Ticket Description</h4>
                  <p className="text-white/90 font-medium leading-relaxed whitespace-pre-wrap break-words relative z-10 text-base sm:text-lg">
                    {ticket.description}
                  </p>
                </div>

                {/* Attachments Section (if any) */}
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Paperclip className="size-4" />
                      System Attachments ({ticket.attachments.length})
                    </h3>
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4">
                      {ticket.attachments.map((file: any, i: number) => (
                        <div key={i} className="group relative bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3 hover:bg-white hover:shadow-md transition-all cursor-pointer">
                          <div className="size-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TicketIcon className="size-5 text-slate-400" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-slate-900 truncate">{file.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Secure File</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grid Timeline */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
                    <History className="size-4" />
                    Interaction Timeline
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getTimelineEvents().map((event, idx) => (
                      <div key={idx} className={cn(
                        "relative flex flex-col p-3 rounded-2xl border transition-all hover:shadow-md",
                        event.isComment ? "bg-white border-slate-100" : "bg-slate-50/50 border-transparent"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "size-6 rounded-lg flex items-center justify-center shadow-sm shrink-0",
                              event.color
                            )}>
                              <event.icon className={cn("size-3", event.color === 'bg-[#ACDF33]' ? 'text-[#032313]' : 'text-white')} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900">{event.title}</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {event.date.toLocaleDateString()} • {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {event.content && (
                          <p className="text-xs text-slate-600 font-medium leading-snug line-clamp-2">
                            {event.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comment Input Fixed at Bottom */}
              {ticket.status !== 'CLOSED' && (
                <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                  <form onSubmit={handleAddComment} className="relative flex items-end gap-3 max-w-4xl mx-auto">
                    <div className="flex-1 relative">
                       <textarea 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 pr-14 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#ACDF33]/20 focus:border-[#ACDF33]/30 transition-all resize-none min-h-[56px] max-h-32 scrollbar-hide"
                          placeholder="Type your message to support staff..."
                          rows={1}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(e);
                            }
                          }}
                       />
                       <button 
                          type="submit"
                          disabled={isSubmitting || !comment.trim()}
                          className="absolute right-2.5 bottom-2.5 size-9 bg-[#032313] text-[#ACDF33] rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-[#032313]/10"
                       >
                          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                       </button>
                    </div>
                  </form>
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-3 opacity-60">Press Enter to send message</p>
                </div>
              )}
            </div>

            {/* Right Section: Details (Fixed on Desktop, Stacked on Mobile) */}
            <div className="w-full lg:w-80 lg:border-l border-t lg:border-t-0 border-slate-100 p-4 sm:p-8 space-y-8 h-auto lg:h-full overflow-visible lg:overflow-y-auto bg-slate-50/30">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-4">Ticket Information</h3>
              
              <div className="space-y-6">
                <MetaItem icon={Building} label="Department" value={ticket.department.replace('_', ' ')} />
                <MetaItem 
                  icon={AlertCircle} 
                  label="Priority Status" 
                  value={ticket.priority} 
                  variant={
                    ticket.priority === 'CRITICAL' ? 'critical' :
                    ticket.priority === 'HIGH' ? 'high' : 'normal'
                  } 
                />
                <MetaItem icon={UserCheck} label="Assigned Staff" value={ticket.assignedToName || 'Awaiting Agent'} isItalic={!ticket.assignedToName} />
                <MetaItem icon={Mail} label="Contact Email" value={ticket.contactEmail} />
                <MetaItem icon={Calendar} label="Created On" value={new Date(ticket.createdAt).toLocaleDateString()} />
                <MetaItem icon={Clock} label="Last Update" value={new Date(ticket.updatedAt).toLocaleTimeString()} />
                <MetaItem icon={Fingerprint} label="Ticket ID" value={ticket._id.toUpperCase()} />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function MetaItem({ icon: Icon, label, value, variant, isItalic }: { icon: any, label: string, value: string, variant?: 'critical' | 'high' | 'normal', isItalic?: boolean }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="size-9 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm shrink-0 transition-all group-hover:bg-[#ACDF33]/10">
        <Icon className="size-4 text-slate-400" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">{label}</span>
        <span className={cn(
          "text-sm font-bold tracking-tight truncate",
          variant === 'critical' ? 'text-rose-600' :
          variant === 'high' ? 'text-orange-600' : 
          'text-slate-900',
          isItalic && 'italic text-slate-400'
        )}>{value}</span>
      </div>
    </div>
  )
}
