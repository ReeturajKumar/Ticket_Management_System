import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { StudentLayout } from "@/components/layout/StudentLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getTicketById, addComment, reopenTicket, updateTicket, type TicketDetails } from "@/services/ticketService"
import { Loader2, ArrowLeft, Send, RotateCcw, User, Clock, AlertCircle, Edit, Star, FileIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RateTicketDialog } from "@/components/tickets/RateTicketDialog"

export default function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<TicketDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reopenReason, setReopenReason] = useState("")
  const [isReopening, setIsReopening] = useState(false)
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editSubject, setEditSubject] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriority, setEditPriority] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false)

  const fetchTicket = async () => {
    if (!id) return
    try {
      const result = await getTicketById(id)
      if (result.success) {
        setTicket(result.data.ticket)
        setEditSubject(result.data.ticket.subject || "")
        setEditDescription(result.data.ticket.description || "")
        setEditPriority(result.data.ticket.priority)
      }
    } catch (error) {
      console.error("Failed to fetch ticket:", error)
      setError("Failed to load ticket details.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [id])

  const handleUpdateTicket = async () => {
    if (!id) return
    
    setIsUpdating(true)
    try {
      await updateTicket(id, {
        subject: editSubject,
        description: editDescription,
        priority: editPriority
      })
      setIsEditDialogOpen(false)
      await fetchTicket()
    } catch (error: any) {
      setError(error.message || "Failed to update ticket")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddComment = async () => {
    if (!id || !commentText.trim()) return
    
    setIsSubmitting(true)
    try {
      await addComment(id, commentText)
      setCommentText("")
      // Refresh ticket data to show new comment
      await fetchTicket()
    } catch (error: any) {
      setError(error.message || "Failed to add comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReopenTicket = async () => {
    if (!id || !reopenReason.trim()) return

    setIsReopening(true)
    try {
      await reopenTicket(id, reopenReason)
      setIsReopenDialogOpen(false)
      setReopenReason("")
      await fetchTicket()
    } catch (error: any) {
      setError(error.message || "Failed to reopen ticket")
    } finally {
      setIsReopening(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "IN_PROGRESS": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case "RESOLVED": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "CLOSED": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "REOPENED": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </StudentLayout>
    )
  }

  if (!ticket) {
    return (
      <StudentLayout>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>Ticket not found or you don't have permission to view it.</AlertDescription>
          </Alert>
          <Button variant="link" onClick={() => navigate("/tickets")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>
        </div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl h-[calc(100vh-4rem)] flex flex-col">
        {/* Header Section - Compact */}
        <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
             <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/tickets")} 
              className="rounded-full hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                 <h1 className="text-xl font-bold tracking-tight">{ticket.subject}</h1>
                 <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="font-mono">#{ticket.id}</span>
                <span>•</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons to Right */}
          <div className="flex items-center gap-2">
             {(ticket.status === 'OPEN' || ticket.status === 'REOPENED') && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="cursor-pointer">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Ticket
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Ticket Details</DialogTitle>
                      <DialogDescription>
                        Update the subject, description, or priority of your ticket.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          placeholder="Brief summary of the issue"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={editPriority} onValueChange={setEditPriority}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="cursor-pointer">Cancel</Button>
                      <Button 
                        onClick={handleUpdateTicket} 
                        disabled={isUpdating}
                        className="cursor-pointer"
                      >
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
             )}

             {ticket.status === 'CLOSED' && (
                <Dialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/50">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reopen Ticket
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reopen Ticket</DialogTitle>
                        <DialogDescription>
                          Please explain why you are reopening this ticket.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="reason">Reason for reopening</Label>
                          <Textarea
                            id="reason"
                            placeholder="Enter your reason here..."
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReopenDialogOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={handleReopenTicket} 
                          disabled={!reopenReason.trim() || isReopening}
                        >
                          {isReopening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Confirm Reopen
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
             )}

             {ticket.status === 'RESOLVED' && !ticket.rating && (
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setIsRatingDialogOpen(true)}
                 className="cursor-pointer border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950/50"
               >
                 <Star className="mr-2 h-4 w-4" />
                 Rate Ticket
               </Button>
             )}
          </div>
        </div>

        {/* Main Content - Side-by-Side Compact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden min-h-0">
          
          {/* LEFT COLUMN: Context & Meta (25%) - Scrollable independent */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-1">
             {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card className="h-full border-0 shadow-none bg-transparent lg:bg-card lg:border lg:shadow-sm">
              <CardContent className="p-0 lg:p-4 space-y-6">
                 {/* Properties */}
                 <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Department</div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="outline">{ticket.department}</Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Priority</div>
                      <div className="font-medium text-sm">
                         <Badge variant="outline" className={ticket.priority === 'CRITICAL' ? 'border-red-200 text-red-700 bg-red-50' : ''}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                     <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Assigned To</div>
                      <div className="font-medium text-sm flex items-center gap-2">
                         <User className="h-3.5 w-3.5 text-muted-foreground" />
                         {ticket.assignedTo || 'Unassigned'}
                      </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Thread (75%) - Scrollable independent */}
          <div className="lg:col-span-3 flex flex-col bg-card rounded-lg border shadow-sm overflow-hidden h-full">
             {/* Scrollable Thread Area */}
             <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                 {/* Original Request (Description) */}
                 <div className="flex gap-4">
                     <div className="flex-shrink-0">
                       <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          <User className="h-5 w-5 text-primary" />
                       </div>
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="font-semibold text-sm">{ticket.createdByName}</span>
                           <span className="text-xs text-muted-foreground">opened this ticket on {new Date(ticket.createdAt).toLocaleString()}</span>
                        </div>
                         <div className="bg-muted/30 rounded-lg p-4 text-sm border border-muted/50">
                            <p className="whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                         </div>

                         {/* Attachments */}
                         {ticket.attachments && ticket.attachments.length > 0 && (
                           <div className="mt-4 space-y-2">
                             <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attachments</p>
                             <div className="flex flex-wrap gap-2">
                               {ticket.attachments.map((attachment, idx) => (
                                 <a
                                   key={idx}
                                   href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/uploads/${attachment.filename}`}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted/50 transition-colors text-sm"
                                 >
                                   <FileIcon className="h-4 w-4 text-muted-foreground" />
                                   <span className="max-w-[200px] truncate">{attachment.originalName}</span>
                                   <span className="text-xs text-muted-foreground">
                                     ({(attachment.size / 1024).toFixed(1)} KB)
                                   </span>
                                 </a>
                               ))}
                             </div>
                           </div>
                         )}
                      </div>
                 </div>

                 <Separator className="my-4" />

                 {/* Comments Stream */}
                 {ticket.comments.map((comment, index) => (
                    <div key={index} className="flex gap-4">
                       <div className="flex-shrink-0">
                         <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border">
                            <span className="text-xs font-medium text-muted-foreground">{comment.userName.charAt(0)}</span>
                         </div>
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-semibold text-sm">{comment.userName}</span>
                             <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="text-sm leading-relaxed text-foreground/90">
                             {comment.comment}
                          </div>
                       </div>
                    </div>
                 ))}

                 {ticket.comments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm italic">
                       No additional comments yet.
                    </div>
                 )}
                 
                 {/* Invisible element for auto-scrolling can go here */}
             </div>

             {/* Sticky Footer: Input Area */}
             <div className="p-4 bg-muted/20 border-t shrink-0">
                {ticket.status === 'CLOSED' ? (
                   <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2 bg-muted/50 rounded-md border border-dashed">
                      <Clock className="h-4 w-4" />
                      This ticket is closed. Reopen it to continue the conversation.
                   </div>
                ) : (
                  <div className="flex gap-3">
                    <Textarea
                      placeholder="Type your reply here..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="min-h-[60px] max-h-[150px] bg-background resize-none focus-visible:ring-1"
                    />
                    <Button 
                      onClick={handleAddComment} 
                      disabled={!commentText.trim() || isSubmitting}
                      className="h-auto self-end px-4 py-3"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
             </div>
          </div>

        </div>
      </div>

      {/* Rating Dialog */}
      <RateTicketDialog
        ticketId={id || ""}
        isOpen={isRatingDialogOpen}
        onClose={() => setIsRatingDialogOpen(false)}
        onSuccess={() => {
          fetchTicket()
        }}
      />
    </StudentLayout>
  )
}
