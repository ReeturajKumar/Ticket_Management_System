import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, Users, Ticket, CheckCircle, Building2, UserCheck
} from "lucide-react"
import { getAdminDashboardOverview, type AdminDashboardOverview } from "@/services/adminService"
import { toast } from "react-toastify"
import { useAdminSocketEvents } from "@/hooks/useAdminSocket"

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<AdminDashboardOverview | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Listen for real-time user updates to refresh dashboard
  useAdminSocketEvents({
    onUserCreated: () => {
      fetchDashboardData() // Refresh dashboard when user is created
    },
    onUserUpdated: () => {
      fetchDashboardData() // Refresh dashboard when user is updated
    },
  })

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const result = await getAdminDashboardOverview()
      if (result.success) {
        setData(result.data)
      }
    } catch (error: any) {
      console.error("Failed to fetch admin dashboard:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
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

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            System-wide overview and statistics
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {data.summary.departmentUsers} department users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.pendingUsers}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalTickets}</div>
              <p className="text-xs text-muted-foreground">
                {data.summary.openTickets + data.summary.inProgressTickets} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.resolvedTickets}</div>
              <p className="text-xs text-muted-foreground">
                {data.summary.closedTickets} closed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Priority & Department Breakdown */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tickets by Priority</CardTitle>
              <CardDescription>Distribution across priority levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-400" />
                    <span className="text-sm">Low</span>
                  </div>
                  <span className="font-bold">{data.byPriority.LOW}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-400" />
                    <span className="text-sm">Medium</span>
                  </div>
                  <span className="font-bold">{data.byPriority.MEDIUM}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-400" />
                    <span className="text-sm">High</span>
                  </div>
                  <span className="font-bold">{data.byPriority.HIGH}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="text-sm">Critical</span>
                  </div>
                  <span className="font-bold">{data.byPriority.CRITICAL}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets by Department</CardTitle>
              <CardDescription>Distribution across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.byDepartment).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{dept}</span>
                    </div>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users by Department */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Department</CardTitle>
            <CardDescription>Department user distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.usersByDepartment).map(([dept, stats]) => (
                <div key={dept} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{dept}</span>
                    <Badge variant="secondary">{stats.total} users</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Heads:</span>
                      <span className="font-medium">{stats.heads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Staff:</span>
                      <span className="font-medium">{stats.staff}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>Latest tickets across all departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentTickets.length > 0 ? (
                data.recentTickets.map((ticket) => (
                  <div 
                    key={ticket.id} 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {ticket.department}
                        </Badge>
                        <Badge 
                          variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'destructive' : 'secondary'} 
                          className="text-xs"
                        >
                          {ticket.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {ticket.createdByName} • {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge 
                      variant={ticket.status === 'OPEN' ? 'destructive' : 'secondary'}
                      className="sm:ml-4 w-fit"
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent tickets</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
