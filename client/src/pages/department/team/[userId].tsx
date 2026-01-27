import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getTeamMemberTickets, getMemberPerformance } from "@/services/departmentHeadService"
import { Loader2, ArrowLeft, Ticket, CheckCircle, Clock, TrendingUp } from "lucide-react"
import type { VariantProps } from "class-variance-authority"

interface TeamMemberPerformance {
  name: string
  email: string
  assignedTickets: number
  resolvedTickets: number
  inProgressTickets: number
  performance: string
  avgResolutionTime: string
}

interface TeamMemberTicket {
  _id: string
  ticketId?: string
  subject: string
  description: string
  status: string
  priority: string
  createdAt: string
}

type BadgeVariant = VariantProps<typeof Badge>['variant']

export default function TeamMemberDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [performance, setPerformance] = useState<TeamMemberPerformance | null>(null)
  const [tickets, setTickets] = useState<TeamMemberTicket[]>([])

  const fetchData = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      const [perfData, ticketsData] = await Promise.all([
        getMemberPerformance(userId),
        getTeamMemberTickets(userId)
      ])
      
      // Map API response to component state
      const stats = perfData.data?.stats || {}
      const memberInfo = perfData.data?.teamMember || {}
      
      setPerformance({
        ...stats,
        name: memberInfo.name,
        email: memberInfo.email,
        assignedTickets: stats.totalAssigned || 0,
        resolvedTickets: stats.resolved || 0,
        inProgressTickets: stats.inProgress || 0,
        // performance comes as "0%" string
        performance: stats.performance || "0%",
        avgResolutionTime: stats.avgResolutionTime || "N/A"
      })
      
      setTickets(ticketsData.data?.tickets || [])
    } catch (error) {
      console.error("Failed to fetch team member data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <DepartmentLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DepartmentLayout>
    )
  }

  const getPriorityColor = (priority: string): BadgeVariant => {
    const colors: Record<string, BadgeVariant> = {
      LOW: "secondary",
      MEDIUM: "default",
      HIGH: "destructive",
      CRITICAL: "destructive"
    }
    return colors[priority] || "default"
  }

  const getStatusColor = (status: string): BadgeVariant => {
    const colors: Record<string, BadgeVariant> = {
      OPEN: "secondary",
      IN_PROGRESS: "default",
      WAITING_FOR_USER: "outline",
      RESOLVED: "default",
      CLOSED: "secondary"
    }
    return colors[status] || "default"
  }

  return (
    <DepartmentLayout>
      <div className="flex-1 p-8 pt-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/department/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div>
          <h2 className="text-3xl font-bold tracking-tight">{performance?.name || "Team Member"}</h2>
          <p className="text-muted-foreground">{performance?.email}</p>
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance?.assignedTickets || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance?.resolvedTickets || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance?.inProgressTickets || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance?.performance || "0%"}</div>
              <p className="text-xs text-muted-foreground">
                Avg: {performance?.avgResolutionTime || "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Tickets</CardTitle>
            <CardDescription>All tickets assigned to this team member</CardDescription>
          </CardHeader>
          <CardContent>
            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/department/tickets/${ticket._id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-muted-foreground">
                          #{ticket.ticketId || ticket._id?.slice(-6)}
                        </span>
                        <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                          {ticket.priority}
                        </Badge>
                        <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                          {ticket.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{ticket.subject}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tickets assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DepartmentLayout>
  )
}
