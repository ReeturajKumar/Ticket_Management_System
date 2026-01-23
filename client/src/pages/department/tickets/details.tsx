import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useParams, useNavigate } from "react-router-dom"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
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
    addInternalNote,
    changeTicketPriority
} from "@/services/departmentHeadService"
import { Loader2, ArrowLeft, Send, User as UserIcon, Calendar, Clock, MessageSquare, Shield, FileIcon, Star } from "lucide-react"
import { Avatar, AvatarFallback} from "@/components/ui/avatar"
export default function DepartmentTicketDetailsPage() {
  const { id } = useParams()
  const user = getCurrentDepartmentUser()
  const navigate = useNavigate()
  // const { toast } = useToast()

  const [ticket, setTicket] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        // toast({
        //     title: "Error", 
        //     description: "Failed to load ticket details. You may not have access.", 
        //     variant: "destructive"
        // })
        navigate("/department/tickets")
    } finally {
        setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [id, user?.isHead])

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
        if (user?.isHead) {
            await addInternalNote(id, newComment)
        } else {
            await addCommentToMyTicket(id, newComment)
        }
        toast.success("Comment added successfully.")
        setNewComment("")
        fetchTicket()
    } catch (error) {
        toast.error("Failed to add comment.")
    } finally {
        setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
        <DepartmentLayout>
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
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
                   <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" /> {ticket.studentName || ticket.contactName || ticket.createdBy?.name || 'Student'}</span>
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
                                Student Attachments
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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Activity & Comments
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {ticket.comments && ticket.comments.length > 0 ? (
                            ticket.comments.map((comment: any, index: number) => (
                                <div key={index} className="flex gap-4">
                                     <Avatar className="h-8 w-8">
                                        <AvatarFallback>{comment.userName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-sm">
                                                {comment.userName}
                                                {comment.userName?.includes('[INTERNAL]') && <Badge variant="secondary" className="ml-2 text-[10px]">INTERNAL</Badge>}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                                            {comment.comment}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No comments yet.</p>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-4">
                        <Separator />
                        <div className="w-full space-y-4">
                            <h4 className="text-sm font-medium">Add Response</h4>
                            <Textarea 
                                placeholder={user?.isHead ? "Add an internal note or reply..." : "Type your reply here..."}
                                className="min-h-[100px]"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <Button onClick={handleSubmitComment} disabled={isSubmitting || !newComment.trim()}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    {user?.isHead ? "Post Internal Note" : "Send Reply"}
                                </Button>
                            </div>
                        </div>
                    </CardFooter>
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
                                   Rated by {ticket.rating.ratedByName || 'Student'}
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
