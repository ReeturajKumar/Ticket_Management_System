import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, ArrowLeft, Building2, User, Calendar, Clock, Mail
} from "lucide-react"
import { getTicketDetails, type AdminTicket } from "@/services/adminService"
import { toast } from "react-toastify"

interface TicketDetails extends AdminTicket {
  ticketId?: string
  comments?: any[]
}

export default function AdminTicketDetailsPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [ticket, setTicket] = useState<TicketDetails | null>(null)

  useEffect(() => {
    if (ticketId) {
      fetchTicket()
    }
  }, [ticketId])

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
      navigate('/admin/tickets')
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      LOW: "secondary",
      MEDIUM: "default",
      HIGH: "destructive",
      CRITICAL: "destructive"
    }
    return colors[priority] || "default"
  }

  const getStatusColor = (status: string) => {
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Ticket not found</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/tickets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
        </div>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{ticket.subject}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                <span className="text-sm text-muted-foreground font-mono">
                  #{ticket.ticketId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Main Content */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.contactName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{ticket.contactName}</span>
                  </div>
                )}
                {ticket.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{ticket.contactEmail}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{ticket.assignedTo.name}</p>
                      <p className="text-xs text-muted-foreground">{ticket.assignedTo.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {ticket.resolvedAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Resolved</p>
                      <p className="text-sm">
                        {new Date(ticket.resolvedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
