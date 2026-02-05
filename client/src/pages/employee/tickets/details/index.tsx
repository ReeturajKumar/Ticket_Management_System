import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { EmployeeLayout } from "@/components/layout/EmployeeLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  User,
  Building,
  Calendar,
  Ticket,
  CircleDot,
  History,
  ShieldAlert,
  Star
} from "lucide-react"
import { employeeService } from "@/services/employeeService"
import { cn } from "@/lib/utils"
import { toast } from "react-toastify"
import { useAuth } from "@/contexts/AuthContext"
import { useRealTimeTicket } from "@/hooks"

export default function EmployeeTicketDetailsPage() {
  interface TimelineEvent {
    type: string;
    title: string;
    description: string;
    date: Date;
    icon: any;
    color: string;
    isComment?: boolean;
    user?: string;
  }

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (id) fetchTicketDetails(id)
  }, [id])

  // Real-time updates
  useRealTimeTicket({
    ticketId: id || '',
    onCommentAdded: () => {
        if (id) fetchTicketDetails(id)
    },
    onStatusChanged: () => {
        if (id) fetchTicketDetails(id)
    }
  });

  const fetchTicketDetails = async (ticketId: string) => {
    try {
      setIsLoading(true)
      const response = await employeeService.getTicketDetails(ticketId)
      if (response.success) {
        setTicket(response.data)
      }
    } catch (error) {
      console.error("Failed to fetch ticket details:", error)
      toast.error("Failed to load ticket details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim() || !id) return

    try {
      setIsSubmitting(true)
      await employeeService.addComment(id, comment)
      setComment("")
      toast.success("Comment added")
      fetchTicketDetails(id) // Refresh details
    } catch (error) {
      console.error("Failed to add comment:", error)
      toast.error("Failed to add comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <EmployeeLayout>
        <div className="flex h-[calc(100vh-100px)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 border-4 border-[#032313] border-t-[#ACDF33] rounded-full animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Accessing Ticket Securely...</p>
          </div>
        </div>
      </EmployeeLayout>
    )
  }

  if (!ticket) {
    return (
      <EmployeeLayout>
        <div className="flex h-[calc(100vh-100px)] items-center justify-center p-10">
          <div className="text-center space-y-4">
             <div className="size-20 bg-rose-50 rounded-[32px] flex items-center justify-center mx-auto text-rose-500">
                <ShieldAlert className="size-10" />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-slate-900">Access Restricted</h2>
                <p className="text-slate-500 mt-2">This ticket could not be found or you do not have permission to view it.</p>
             </div>
             <Button onClick={() => navigate('/employee/tickets')} className="bg-[#032313] text-[#ACDF33] rounded-full px-8 h-12 font-bold hover:bg-[#032313]/90">
                Return to My Tickets
             </Button>
          </div>
        </div>
      </EmployeeLayout>
    )
  }

  // Synthesize Timeline Events
  const timelineEvents: TimelineEvent[] = [
    {
        type: 'creation',
        title: 'Ticket Created',
        description: `Ticket was successfully opened by ${ticket.createdByName || 'User'}`,
        date: new Date(ticket.createdAt),
        icon: Ticket,
        color: 'bg-emerald-500'
    }
  ]

  if (ticket.assignedToName) {
      timelineEvents.push({
          type: 'assignment',
          title: 'Staff Assigned',
          description: `This ticket has been assigned to ${ticket.assignedToName} for resolution.`,
          date: new Date(ticket.createdAt), // Approximate, since we don't have assignedAt
          icon: User,
          color: 'bg-blue-500'
      })
  }

  if (ticket.comments && ticket.comments.length > 0) {
      ticket.comments
        .filter((c: any) => !c.isInternal && !c.userName?.toUpperCase().includes('INTERNAL'))
        .forEach((c: any) => {
          timelineEvents.push({
              type: 'comment',
              title: c.userName === user?.name ? 'Your Response' : 'Support Response',
              description: c.comment,
              date: new Date(c.createdAt),
              icon: MessageSquare,
              color: c.userName === user?.name ? 'bg-slate-900' : 'bg-[#ACDF33]',
              isComment: true,
              user: c.userName
          })
      })
  }

  if (ticket.resolvedAt) {
      timelineEvents.push({
          type: 'resolution',
          title: 'Ticket Resolved',
          description: 'Issues identified in the request have been officially addressed.',
          date: new Date(ticket.resolvedAt),
          icon: CheckCircle2,
          color: 'bg-[#ACDF33]'
      })
  } else if (ticket.status === 'CLOSED') {
      timelineEvents.push({
          type: 'closed',
          title: 'Ticket Closed',
          description: 'This ticket is now closed and archived.',
          date: new Date(ticket.updatedAt),
          icon: CircleDot,
          color: 'bg-slate-400'
      })
  }

  // Sort timeline chronologically
  timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

  const statusSteps = [
      { id: 'OPEN', label: 'Requested' },
      { id: 'IN_PROGRESS', label: 'Under Review' },
      { id: 'RESOLVED', label: 'Resolved' },
      { id: 'CLOSED', label: 'Completed' }
  ]

  const getCurrentStepIndex = () => {
      const idx = statusSteps.findIndex(s => s.id === ticket.status)
      return idx === -1 ? 1 : idx // Fallback to Index 1 (In Progress) if not found exactly
  }

  return (
    <EmployeeLayout>
      <div className="p-4 lg:p-10 space-y-8 max-w-[1300px] mx-auto bg-slate-50/30 min-h-screen">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-4">
              <button 
                 onClick={() => navigate('/employee/dashboard')}
                 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#032313]/60 hover:text-[#032313] transition-colors"
              >
                 <ArrowLeft className="size-3" />
                 Back to Dashboard
              </button>
              <div>
                 <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-[#032313] text-white rounded-lg px-3 py-1 text-[10px] font-black tracking-widest uppercase">
                       Ticket #{ticket._id.slice(-6).toUpperCase()}
                    </Badge>
                    <div className="h-4 w-px bg-slate-200" />
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                       <Building className="size-3" />
                       {ticket.department.replace('_', ' ')}
                    </span>
                 </div>
                 <h1 className="text-3xl font-bold text-slate-900 font-garnett leading-tight tracking-tight">
                    {ticket.subject}
                 </h1>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-4 bg-white p-2 px-6 rounded-2xl shadow-sm border border-slate-100">
                 {statusSteps.map((step, idx) => {
                    const isActive = idx <= getCurrentStepIndex()
                    const isCurrent = step.id === ticket.status
                    return (
                       <div key={step.id} className="flex items-center">
                          <div className="flex flex-col items-center gap-1">
                             <div className={cn(
                                "size-2 rounded-full",
                                isActive ? "bg-[#ACDF33]" : "bg-slate-200",
                                isCurrent && "ring-4 ring-[#ACDF33]/20"
                             )} />
                             <span className={cn(
                                "text-[10px] uppercase font-black tracking-tighter",
                                isActive ? "text-[#032313]" : "text-slate-300"
                             )}>{step.label}</span>
                          </div>
                          {idx < statusSteps.length - 1 && (
                             <div className={cn(
                                "w-12 h-[2px] mx-2 -mt-4",
                                idx < getCurrentStepIndex() ? "bg-[#ACDF33]" : "bg-slate-100"
                             )} />
                          )}
                       </div>
                    )
                 })}
              </div>
              <Badge className={cn(
                 "rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest shadow-sm border-none ml-4",
                 ticket.status === 'RESOLVED' ? "bg-emerald-500 text-white" :
                 ticket.status === 'IN_PROGRESS' ? "bg-blue-500 text-white" :
                 "bg-[#ACDF33] text-[#032313]"
              )}>
                 {ticket.status.replace('_', ' ')}
              </Badge>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           {/* Left Content Column */}
           <div className="lg:col-span-8 space-y-8">
              {/* Description Card */}
              <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
                 <CardHeader className="p-8 pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="size-10 bg-[#ACDF33]/10 rounded-xl flex items-center justify-center">
                          <History className="size-5 text-[#032313]" />
                       </div>
                       <div>
                          <CardTitle className="text-xl font-bold">Request Content</CardTitle>
                          <CardDescription className="text-xs font-medium">Original details submitted by employee</CardDescription>
                       </div>
                    </div>
                    <Badge variant="outline" className="rounded-full px-4 h-8 font-bold border-slate-100 bg-slate-50">
                       ID: {ticket._id}
                    </Badge>
                 </CardHeader>
                 <CardContent className="p-8">
                    <div className="prose prose-slate max-w-none">
                       <p className="text-slate-700 leading-relaxed font-medium text-lg whitespace-pre-wrap">
                          {ticket.description}
                       </p>
                    </div>

                    {ticket.attachments && ticket.attachments.length > 0 && (
                       <div className="mt-10 pt-8 border-t border-slate-50">
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                             Attachments ({ticket.attachments.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {ticket.attachments.map((file: any, i: number) => (
                                <a key={i} href="#" className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#ACDF33] hover:bg-white transition-all group">
                                   <div className="size-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-rose-500">
                                      PDF
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-slate-800 truncate">{file.name || 'document_verification.pdf'}</p>
                                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Uploaded {new Date(ticket.createdAt).toLocaleDateString()}</p>
                                   </div>
                                </a>
                             ))}
                          </div>
                       </div>
                    )}
                 </CardContent>
              </Card>

              {/* Enhanced Timeline & Conversation Section */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                       <div className="size-10 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                          <MessageSquare className="size-5 text-[#ACDF33]" />
                       </div>
                       Communication Timeline
                    </h3>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Events:</span>
                       <Badge variant="secondary" className="bg-white border-slate-100 font-bold">{timelineEvents.length}</Badge>
                    </div>
                 </div>

                 <div className="relative pl-8 space-y-12">
                    {/* The Timeline Line */}
                    <div className="absolute left-10 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#ACDF33] via-slate-200 to-slate-100" />

                    {timelineEvents.map((event, idx) => (
                       <div key={idx} className="relative group">
                          {/* Timeline Marker */}
                          <div className={cn(
                             "absolute -left-[30px] top-1 size-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 z-10",
                             event.color
                          )}>
                             <event.icon className={cn("size-5", event.type === 'comment' && event.color === 'bg-[#ACDF33]' ? 'text-[#032313]' : 'text-white')} />
                          </div>

                          <div className={cn(
                             "relative p-6 rounded-[32px] border bg-white transition-all",
                             event.isComment ? "shadow-md hover:shadow-xl border-slate-100" : "border-transparent bg-transparent py-2"
                          )}>
                             <div className="flex items-center justify-between mb-3">
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-extrabold text-[#032313] tracking-tight">{event.title}</h4>
                                      {event.type === 'comment' && (
                                         <Badge variant="outline" className="text-[9px] h-4 font-black uppercase tracking-tighter border-[#ACDF33] text-[#ACDF33] bg-[#ACDF33]/5">
                                            {event.user === user?.name ? 'OWNER' : 'STAFF'}
                                         </Badge>
                                      )}
                                   </div>
                                   <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      <Calendar className="size-3" />
                                      {event.date.toLocaleDateString()}
                                      <span className="mx-1">•</span>
                                      <Clock className="size-3" />
                                      {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                </div>
                                {event.isComment && (
                                   <div className="size-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 italic font-black text-[#032313]">
                                      {event.user?.[0].toUpperCase()}
                                   </div>
                                )}
                             </div>
                             
                             <div className={cn(
                                "text-slate-600 leading-relaxed",
                                event.isComment ? "font-medium text-[15px] bg-slate-50/50 p-6 rounded-2xl border border-slate-50" : "text-sm italic"
                             )}>
                                {event.description}
                             </div>
                          </div>
                       </div>
                    ))}

                    {/* Final Marker - Future? */}
                    {!ticket.resolvedAt && (
                       <div className="relative pl-2">
                          <div className="absolute -left-[20px] top-0 size-5 flex items-center justify-center">
                             <div className="size-2 bg-slate-200 rounded-full animate-pulse" />
                          </div>
                          <p className="text-xs font-bold text-slate-300 italic">Waiting for next action...</p>
                       </div>
                    )}
                 </div>

                 {/* Premium Reply Form */}
                 {ticket.status !== 'CLOSED' && (
                    <div className="mt-12">
                       <Card className="border-none shadow-2xl rounded-[32px] p-1.5 bg-[#032313] overflow-hidden">
                          <div className="p-8 bg-white rounded-[30px]">
                             <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                   <div className="size-10 bg-[#ACDF33] rounded-xl flex items-center justify-center">
                                      <Send className="size-5 text-[#032313]" />
                                   </div>
                                   <h4 className="text-xl font-bold text-[#032313]">Post Response</h4>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Replying as Official Reporter</span>
                             </div>
                             
                             <form onSubmit={handleAddComment} className="space-y-6">
                                <Textarea 
                                   placeholder="Type your clarification or response here..."
                                   className="rounded-3xl border-slate-100 bg-slate-50/50 focus:bg-white min-h-[150px] resize-none p-6 text-lg font-medium shadow-inner focus:ring-0"
                                   value={comment}
                                   onChange={(e) => setComment(e.target.value)}
                                   required
                                />
                                <div className="flex items-center justify-between">
                                   <p className="text-xs text-slate-400 font-medium max-w-[200px]">Your message will be broadcasted to the department staff instantly.</p>
                                   <Button 
                                      disabled={isSubmitting || !comment.trim()}
                                      className="bg-[#032313] hover:bg-[#032313]/95 text-[#ACDF33] font-black rounded-full px-10 h-14 text-sm uppercase tracking-widest active:scale-95 transition-all"
                                   >
                                      {isSubmitting ? (
                                         <>
                                            <div className="size-4 border-2 border-[#ACDF33] border-t-transparent rounded-full animate-spin mr-3" />
                                            Broadcasting...
                                         </>
                                      ) : (
                                         <>
                                            <Send className="size-4 mr-3" />
                                            Confirm & Post
                                         </>
                                      )}
                                   </Button>
                                </div>
                             </form>
                          </div>
                       </Card>
                    </div>
                 )}
              </div>
           </div>

           {/* Right Sidebar Column */}
           <div className="lg:col-span-4 space-y-6">
              {/* Asset Details */}
              <Card className="border-none shadow-sm rounded-[32px] bg-white p-8">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 border-b border-slate-50 pb-4">Lifecycle Intelligence</h3>
                 <div className="space-y-8">
                    <MetaItem icon={Building} label="Origin Department" value={ticket.department.replace('_', ' ')} />
                    <MetaItem 
                       icon={AlertCircle} 
                       label="Priority Level" 
                       value={ticket.priority} 
                       variant={
                          ticket.priority === 'CRITICAL' ? 'critical' :
                          ticket.priority === 'HIGH' ? 'high' : 'normal'
                       } 
                    />
                    <MetaItem icon={User} label="Support Assignee" value={ticket.assignedToName || 'Awaiting Assignment'} isItalic={!ticket.assignedToName} />
                    <MetaItem icon={Calendar} label="Incident Logged" value={new Date(ticket.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })} />
                    <MetaItem icon={Clock} label="System Synchronized" value={new Date(ticket.updatedAt).toLocaleTimeString()} />
                 </div>
                 
                 <div className="mt-10 pt-8 border-t border-slate-50">
                    <div className="flex flex-col gap-3">
                       <Button variant="outline" className="w-full rounded-2xl h-12 border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">
                          Secure Export System
                       </Button>
                       <p className="text-[10px] text-center text-slate-300 font-bold uppercase tracking-tighter mt-4">Security Level 4 Authorization Active</p>
                    </div>
                 </div>
              </Card>

              {/* Resolution Stats / Satisfaction */}
              {ticket.status === 'RESOLVED' && ticket.rating && (
                 <Card className="border-none shadow-lg rounded-[32px] bg-gradient-to-br from-white to-slate-50 p-8">
                    <div className="size-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100">
                       <Star className="size-6 text-amber-500 fill-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Service Evaluation</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6">Feedback provided post-resolution highlights satisfaction levels.</p>
                    
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-inner space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Score</span>
                          <div className="flex items-center gap-1 font-black text-lg text-amber-600">
                             {ticket.rating.stars}.0 <Star className="size-4 fill-amber-500" />
                          </div>
                       </div>
                       <blockquote className="text-sm font-medium text-slate-600 italic border-l-2 border-amber-500 pl-4 py-1">
                          "{ticket.rating.comment || 'Quality service provided.'}"
                       </blockquote>
                    </div>
                 </Card>
              )}

              {/* Help Support Panel */}
              <Card className="border-none shadow-xl rounded-[32px] bg-[#032313] p-8 text-white overflow-hidden relative">
                 <div className="absolute top-0 right-0 -mr-12 -mt-12 opacity-[0.03]">
                    <ShieldAlert className="size-64" />
                 </div>
                 <div className="relative z-10">
                    <div className="size-14 bg-white/10 rounded-[22px] flex items-center justify-center mb-6 backdrop-blur-md">
                       <ShieldAlert className="size-7 text-[#ACDF33]" />
                    </div>
                    <h4 className="text-2xl font-bold mb-3 font-garnett leading-tight">Emergency <br/>Escalation</h4>
                    <p className="text-[13px] text-white/50 mb-8 leading-relaxed font-medium">
                       In case of catastrophic system failure or safety concerns, use the prioritized escalation protocol for immediate response.
                    </p>
                    <div className="space-y-4">
                       <Button className="w-full bg-[#ACDF33] text-[#032313] hover:bg-[#ACDF33]/90 rounded-2xl h-14 font-black uppercase tracking-widest text-xs shadow-lg shadow-[#ACDF33]/10">
                          Direct Hotline
                       </Button>
                       <p className="text-[10px] text-center font-bold text-white/30 uppercase tracking-[0.2em]">Available 24/7 Priority Support</p>
                    </div>
                 </div>
              </Card>
           </div>
        </div>
      </div>
    </EmployeeLayout>
  )
}

function MetaItem({ icon: Icon, label, value, variant, isItalic }: { icon: any, label: string, value: string, variant?: 'critical' | 'high' | 'normal', isItalic?: boolean }) {
   return (
      <div className="flex items-center gap-5 group">
         <div className="size-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm transition-all group-hover:bg-[#ACDF33]/10 group-hover:border-[#ACDF33]/30">
            <Icon className="size-5 text-slate-400" />
         </div>
         <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 leading-none">{label}</span>
            <span className={cn(
               "text-[15px] font-black tracking-tight leading-none",
               variant === 'critical' ? 'text-rose-600' :
               variant === 'high' ? 'text-orange-600' : 
               'text-slate-900',
               isItalic && 'italic text-slate-400'
            )}>{value}</span>
         </div>
      </div>
   )
}
