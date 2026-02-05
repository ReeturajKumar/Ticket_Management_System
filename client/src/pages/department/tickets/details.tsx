import { useEffect, useState, useRef } from "react"
import { toast } from "react-toastify"
import { useParams, useNavigate } from "react-router-dom"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCurrentDepartmentUser } from "@/services/departmentAuthService"
import { 
    getMyTicketDetails, 
    updateMyTicketStatus, 
    addCommentToMyTicket 
} from "@/services/departmentStaffService"
import { 
    getTicketDetails, 
    updateTicketStatus, 
    changeTicketPriority
} from "@/services/departmentHeadService"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ArrowLeft, Send, User as UserIcon, Calendar, Clock, MessageSquare, Shield, FileIcon, Star } from "lucide-react"
import { Avatar, AvatarFallback} from "@/components/ui/avatar"
import { DashboardLoading } from "@/components/department/dashboard/shared/DashboardHeader"
import { useRealTimeTicket } from "@/hooks"

export default function DepartmentTicketDetailsPage() {
  const { id } = useParams()
  const user = getCurrentDepartmentUser()
  const navigate = useNavigate()

  const [ticket, setTicket] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInternalNote, setIsInternalNote] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    // Default internal note to true for department staff/heads only
    // Creators' comments are always external, so no need to default to internal
    const isCreator = ticket?.createdBy && user?._id && 
        (ticket.createdBy === user._id || ticket.createdBy.toString() === user._id.toString());
    
    if (user?.isHead || (user?.department === ticket?.department && !isCreator)) {
      // Department staff/heads can use internal notes
      setIsInternalNote(true);
    } else {
      // Creators always use external comments
      setIsInternalNote(false);
    }
  }, [user, ticket])

  useEffect(() => {
    scrollToBottom()
  }, [ticket?.comments])

  const fetchTicket = async () => {
    if (!id) return
    setIsLoading(true)
    try {
        let res
        if (user?.isHead) {
            res = await getTicketDetails(id)
        } else {
            res = await getMyTicketDetails(id)
        }
        setTicket(res.data)
    } catch (error) {
        console.error("Failed to fetch ticket", error)
        navigate("/department/tickets")
    } finally {
        setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [id, user?.isHead])

  // Real-time updates
  useRealTimeTicket({
    ticketId: id || '',
    showNotifications: false,
    onCommentAdded: (data) => {
      setTicket((prev: any) => {
        if (!prev) return prev
        // Prevent duplicates
        const exists = prev.comments?.some((c: any) => 
          (c._id && c._id === data.commentId) || 
          (new Date(c.createdAt).getTime() === new Date(data.timestamp || new Date()).getTime() && c.comment === data.content)
        )
        if (exists) return prev
        
        return {
          ...prev,
          comments: [
            ...(prev.comments || []),
            {
              _id: data.commentId,
              user: data.authorId,
              userName: data.authorName,
              comment: data.content,
              isInternal: data.isInternal,
              createdAt: data.timestamp || new Date().toISOString()
            }
          ]
        }
      })
    },
    onStatusChanged: (data) => {
      setTicket((prev: any) => {
        if (!prev) return prev
        return { ...prev, status: data.newStatus }
      })
    }
  })

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return
    try {
        if (user?.isHead) {
            await updateTicketStatus(id, newStatus)
        } else {
            await updateMyTicketStatus(id, newStatus)
        }
        toast.success("Status updated successfully.")
        fetchTicket()
    } catch (error) {
        toast.error("Failed to update status.")
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    if (!id || !user?.isHead) return
    try {
        await changeTicketPriority(id, newPriority)
        toast.success("Priority updated successfully.")
        fetchTicket()
    } catch (error) {
        toast.error("Failed to update priority.")
    }
  }

  const handleSubmitComment = async () => {
    if (!id || !newComment.trim()) return
    setIsSubmitting(true)
    try {
        // Use the unified staff service which now supports isInternal
        await addCommentToMyTicket(id, newComment, isInternalNote)
        
        setNewComment("")
        // Reset toggle to true after sending
        setIsInternalNote(true)
        fetchTicket()
    } catch (error: any) {
        toast.error(error.message || "Failed to add comment.")
    } finally {
        setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
        <DepartmentLayout>
            <DashboardLoading />
        </DepartmentLayout>
    )
  }

  if (!ticket) return null

  return (
    <DepartmentLayout>
      <div className="flex-1 p-8 pt-6 space-y-8">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/department/tickets")}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">{ticket.subject}</h2>
                    <Badge variant={ticket.status === 'OPEN' ? 'destructive' : 'secondary'}>
                        {ticket.status}
                    </Badge>
                     {ticket.priority === 'CRITICAL' && <Badge variant="destructive">CRITICAL</Badge>}
                </div>
                <p className="text-muted-foreground flex items-center gap-4 mt-1">
                   <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {ticket.userName || ticket.contactName || ticket.createdBy?.name || 'User'}</span>
                   <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                   <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(ticket.createdAt).toLocaleTimeString()}</span>
                </p>
            </div>
            
            <div className="flex items-center gap-2">
                <Select defaultValue={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Change Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                </Select>

                {user?.isHead && (
                     <Select defaultValue={ticket.priority} onValueChange={handlePriorityChange}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
             <div className="md:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {ticket.description}
                        </p>
                        {ticket.category && (
                            <div className="mt-4 flex gap-2">
                                <Badge variant="outline">{ticket.category}</Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Attachments Section */}
                {ticket.attachments && ticket.attachments.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <FileIcon className="h-4 w-4 text-blue-500" />
                                User Attachments
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                {ticket.attachments.map((attachment: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={`${import.meta.env.VITE_API_URL}/uploads/${attachment.filename}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                    >
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded border shadow-sm group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                            <FileIcon className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate max-w-[180px]">{attachment.originalName}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">
                                                {(attachment.size / 1024).toFixed(1)} KB • {attachment.mimeType.split('/')[1]}
                                            </span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="flex flex-col h-[600px]">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Activity & Comments
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                        {ticket.comments && ticket.comments.length > 0 ? (
                            ticket.comments.map((comment: any, index: number) => {
                                const isInternal = comment.userName?.includes('[INTERNAL]') || comment.isInternal;
                                const currentUserId = user?._id || user?.id || user?.userId;
                                const commentUserId = comment.user?._id || comment.user || comment.userId || comment.authorId;
                                const isOwn = currentUserId && commentUserId && currentUserId.toString() === commentUserId.toString();
                                
                                return (
                                    <div key={index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex gap-3 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {!isOwn && (
                                                <Avatar className="h-8 w-8 shrink-0 mt-1">
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                        {comment.userName?.charAt(0) || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className="space-y-1">
                                                {!isOwn && (
                                                    <div className="flex items-center gap-2 px-1">
                                                        <span className="text-xs font-bold text-slate-600">
                                                            {comment.userName?.replace('[INTERNAL] ', '')}
                                                        </span>
                                                        {isInternal && (
                                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider">
                                                                Internal Note
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                                <div className={`
                                                    p-3 rounded-2xl text-sm shadow-sm
                                                    ${isOwn 
                                                        ? 'bg-slate-900 text-white rounded-tr-none' 
                                                        : isInternal 
                                                            ? 'bg-amber-50 border border-amber-100 text-amber-900 rounded-tl-none'
                                                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                                    }
                                                `}>
                                                    {comment.comment}
                                                </div>
                                                <div className={`text-[10px] text-slate-400 px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                                                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                                <div className="p-4 bg-slate-50 rounded-full">
                                    <MessageSquare className="h-8 w-8 opacity-20" />
                                </div>
                                <p className="text-sm">No interaction yet for this ticket.</p>
                            </div>
                        )}
                        <div ref={commentsEndRef} />
                    </CardContent>
                    <Separator />
                    <div className="p-4 bg-slate-50/50">
                        <div className="relative">
                            <Textarea 
                                placeholder={isInternalNote ? "Write an internal note..." : "Type your reply here..."}
                                className={`min-h-[100px] pr-12 resize-none bg-white border-slate-200 focus-visible:ring-slate-400 rounded-xl transition-colors ${isInternalNote ? 'border-amber-200 bg-amber-50/10' : ''}`}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmitComment();
                                    }
                                }}
                            />
                            <Button 
                                onClick={handleSubmitComment} 
                                disabled={isSubmitting || !newComment.trim()}
                                size="icon"
                                className={`absolute bottom-3 right-3 h-8 w-8 rounded-lg shadow-lg transition-all ${isInternalNote ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between mt-2 px-1">
                            {(() => {
                                const isCreator = ticket?.createdBy && user?._id && 
                                    (ticket.createdBy === user._id || ticket.createdBy.toString() === user._id.toString());
                                const isFromSameDepartment = ticket?.department === user?.department;
                                const isDepartmentStaff = isFromSameDepartment && (user?.isHead || !isCreator);
                                
                                if (isCreator && !user?.isHead) {
                                    // Creator (non-head) - their comments are always external
                                    return (
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
                                                <UserIcon className="h-3 w-3 text-blue-600" />
                                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">
                                                    Your messages are visible to department staff
                                                </span>
                                            </div>
                                        </div>
                                    );
                                } else if (isDepartmentStaff) {
                                    // Department staff/head - can choose internal or external
                                    return (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="internal-note" 
                                                checked={isInternalNote} 
                                                onCheckedChange={(checked) => setIsInternalNote(checked as boolean)}
                                                className="border-slate-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                            />
                                            <Label 
                                                htmlFor="internal-note" 
                                                className={`text-[11px] cursor-pointer font-medium ${isInternalNote ? 'text-amber-700' : 'text-slate-500'}`}
                                            >
                                                Internal Note
                                            </Label>
                                        </div>
                                    );
                                } else {
                                    // Default case
                                    return (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="internal-note" 
                                                checked={isInternalNote} 
                                                onCheckedChange={(checked) => setIsInternalNote(checked as boolean)}
                                                className="border-slate-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                            />
                                            <Label 
                                                htmlFor="internal-note" 
                                                className={`text-[11px] cursor-pointer font-medium ${isInternalNote ? 'text-amber-700' : 'text-slate-500'}`}
                                            >
                                                Internal Note
                                            </Label>
                                        </div>
                                    );
                                }
                            })()}
                            <p className="text-[10px] text-muted-foreground">
                                Press Enter to send, Shift + Enter for new line. 
                            </p>
                        </div>
                        {(() => {
                            const isCreator = ticket?.createdBy && user?._id && 
                                (ticket.createdBy === user._id || ticket.createdBy.toString() === user._id.toString());
                            const isDepartmentStaff = ticket?.department === user?.department && (user?.isHead || !isCreator);
                            
                            if (isInternalNote && isDepartmentStaff) {
                                return (
                                    <div className="mt-2 px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                                        <Shield className="h-3 w-3 text-amber-600" />
                                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Only staff can see this note</span>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </Card>
            </div>

             <div className="space-y-6">
                  <Card>
                      <CardHeader>
                          <CardTitle className="text-sm font-medium">Ticket Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                           <div className="flex justify-between items-center text-sm">
                               <span className="text-muted-foreground">ID</span>
                               <span className="font-mono">{ticket.ticketId || ticket._id.substring(0, 8)}</span>
                           </div>
                           <Separator />
                           <div className="flex justify-between items-center text-sm">
                               <span className="text-muted-foreground">Assigned To</span>
                               <span className="font-medium">{ticket.assignedToName || 'Unassigned'}</span>
                           </div>
                           <Separator />
                           <div className="flex justify-between items-center text-sm">
                               <span className="text-muted-foreground">Department</span>
                               <span className="font-medium">{ticket.department}</span>
                           </div>
                           <Separator />
                           <div className="flex justify-between items-center text-sm">
                               <span className="text-muted-foreground">Created</span>
                               <span className="font-medium">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                           </div>
                           {ticket.resolvedAt && (
                               <>
                                <Separator />
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Resolved</span>
                                    <span className="font-medium">{new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                                </div>
                               </>
                           )}
                      </CardContent>
                  </Card>

                  {ticket.rating && (
                      <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/30 dark:bg-yellow-950/20">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                                 <Star className="h-4 w-4 fill-yellow-400" /> Client Satisfaction
                             </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                               <div className="flex items-center gap-0.5">
                                   {[1, 2, 3, 4, 5].map((s) => (
                                       <Star 
                                          key={s} 
                                          className={`h-4 w-4 ${s <= ticket.rating.stars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-700'}`} 
                                       />
                                   ))}
                                   <span className="ml-2 text-sm font-bold text-yellow-900 dark:text-yellow-300">{ticket.rating.stars}/5</span>
                               </div>
                               {ticket.rating.comment && (
                                   <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed border-l-2 border-yellow-200 dark:border-yellow-900 pl-3">
                                       "{ticket.rating.comment}"
                                   </p>
                               )}
                               <p className="text-[10px] text-muted-foreground text-right">
                                   Rated by {ticket.rating.ratedByName || 'User'}
                               </p>
                          </CardContent>
                      </Card>
                  )}
                  
                  {user?.isHead && (
                      <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-800 dark:text-orange-400">
                                 <Shield className="h-4 w-4" /> Admin Controls
                             </CardTitle>
                          </CardHeader>
                          <CardContent>
                               <p className="text-xs text-muted-foreground mb-4">
                                   As a Department Head, you can override status, change priority, and add internal notes visible only to staff.
                               </p>
                          </CardContent>
                      </Card>
                  )}
             </div>
        </div>
      </div>
    </DepartmentLayout>
  )
}
