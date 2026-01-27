import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Loader2, Building2, User, Calendar, Clock, Mail
} from "lucide-react"
import { getTicketDetails, type AdminTicket } from "@/services/adminService"
import { toast } from "react-toastify"

interface TicketDetails extends AdminTicket {
  ticketId?: string
  comments?: any[]
}

interface TicketDetailsDialogProps {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

  const getPriorityColor = (priority: string): "default" | "secondary" | "destructive" => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      LOW: "secondary",
      MEDIUM: "default",
      HIGH: "destructive",
      CRITICAL: "destructive"
    }
    return colors[priority] || "default"
  }

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      OPEN: "destructive",
      ASSIGNED: "default",
      IN_PROGRESS: "default",
      WAITING_FOR_USER: "outline",
      RESOLVED: "default",
      CLOSED: "secondary"
    }
    return colors[status] || "default"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {ticket?.subject || "Ticket Details"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : ticket ? (
          <div className="grid grid-cols-12 gap-3">
            {/* Header Section - Full Width */}
            <div className="col-span-12 space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                  {ticket.priority}
                </Badge>
                <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                  {ticket.status.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {ticket.department}
                </Badge>
                {ticket.ticketId && (
                  <span className="text-xs text-muted-foreground font-mono">
                    #{ticket.ticketId}
                  </span>
                )}
              </div>
            </div>

            {/* Description - Large Section */}
            <div className="col-span-12 lg:col-span-8 p-4 border rounded-lg">
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>

            {/* Sidebar Info - Compact */}
            <div className="col-span-12 lg:col-span-4 space-y-3">
              {/* Contact Information */}
              <div className="p-4 border rounded-lg bg-muted/20">
                <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide">Contact</h3>
                <div className="space-y-2">
                  {ticket.contactName && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{ticket.contactName}</span>
                    </div>
                  )}
                  {ticket.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{ticket.contactEmail}</span>
                    </div>
                  )}
                  {ticket.createdByName && ticket.createdByName !== ticket.contactName && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate">{ticket.createdByName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment */}
              <div className="p-4 border rounded-lg bg-muted/20">
                <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide">Assignment</h3>
                {ticket.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{ticket.assignedTo.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{ticket.assignedTo.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Unassigned</p>
                )}
              </div>
            </div>

            {/* Timeline - Full Width */}
            <div className="col-span-12 p-4 border rounded-lg bg-muted/20">
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide">Timeline</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-xs font-medium">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {ticket.resolvedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Resolved</p>
                      <p className="text-xs font-medium">
                        {new Date(ticket.resolvedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-xs font-medium">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section - Full Width */}
            {ticket.comments && ticket.comments.length > 0 && (
              <div className="col-span-12 p-4 border rounded-lg">
                <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide">Comments ({ticket.comments.length})</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {ticket.comments.map((comment: any, index: number) => (
                    <div key={index} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{comment.userName || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {comment.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Ticket not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
