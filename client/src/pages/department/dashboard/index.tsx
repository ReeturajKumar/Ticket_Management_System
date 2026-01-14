import { useEffect, useState } from "react"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { getCurrentDepartmentUser } from "@/services/departmentAuthService"
import { getDepartmentOverview, getAnalytics, getTeamPerformance } from "@/services/departmentHeadService"
import { getStaffDashboardStats } from "@/services/departmentStaffService"
import { Loader2, Ticket, CheckCircle, Clock, AlertCircle, TrendingUp, Users } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function DepartmentDashboard() {
  const user = getCurrentDepartmentUser()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [teamPerformance, setTeamPerformance] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        if (user?.isHead) {
          const overview = await getDepartmentOverview()
          const analytics = await getAnalytics('7d')
          const teamPerf = await getTeamPerformance()
          
          // Transform analytics trends data
          let transformedAnalytics = analytics.data
          if (analytics.data?.trends?.ticketsCreated && analytics.data?.trends?.ticketsResolved) {
            const mergedTrends = analytics.data.trends.ticketsCreated.map((item: any, index: number) => ({
              date: item.date,
              created: item.count,
              resolved: analytics.data.trends.ticketsResolved[index]?.count || 0
            }))
            transformedAnalytics = {
              ...analytics.data,
              trends: mergedTrends
            }
          }
          
          setData({ ...overview.data, analytics: transformedAnalytics })
          // Filter out heads from team performance and transform data
          const staffOnly = teamPerf.data?.teamMembers?.filter((member: any) => !member.isHead).map((member: any) => ({
            ...member,
            id: member.userId,
            activeTickets: member.inProgressTickets || 0,
            performance: parseInt(member.performance) || 0, // Convert "100%" to 100
            joinedAt: member.joinedAt || new Date().toISOString()
          })) || []
          setTeamPerformance(staffOnly)
        } else {
          const stats = await getStaffDashboardStats()
          setData(stats.data)
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user?.isHead])

  if (isLoading) {
    return (
      <DepartmentLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DepartmentLayout>
    )
  }

  // Prepare chart data
  const statusChartData = data?.summary ? [
    { name: 'Open', value: data.summary.openTickets || 0, color: '#ef4444' },
    { name: 'In Progress', value: data.summary.inProgressTickets || 0, color: '#3b82f6' },
    { name: 'Resolved', value: data.summary.resolvedTickets || 0, color: '#10b981' },
    { name: 'Closed', value: data.summary.closedTickets || 0, color: '#6b7280' },
    { name: 'Unassigned', value: data.summary.unassignedTickets || 0, color: '#f59e0b' },
  ].filter(item => item.value > 0) : []

  const priorityChartData = data?.byPriority ? [
    { name: 'Low', value: data.byPriority.LOW || 0 },
    { name: 'Medium', value: data.byPriority.MEDIUM || 0 },
    { name: 'High', value: data.byPriority.HIGH || 0 },
    { name: 'Critical', value: data.byPriority.CRITICAL || 0 },
  ].filter(item => item.value > 0) : []

  return (
    <DepartmentLayout>
      <div className="flex-1 p-8 pt-6 space-y-8">
        <div className="flex items-center justify-between space-y-2">
           <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}. Here's what's happening in the {user?.department} department.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link to="/department/tickets">
              <Button>View All Tickets</Button>
            </Link>
          </div>
        </div>

        {/* Head Dashboard View */}
        {user?.isHead && data && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="team">Team Performance</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.summary?.totalTickets || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {data.summary?.unassignedTickets || 0} unassigned
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open / In Progress</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active tickets
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.summary?.resolvedTickets || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {data.analytics?.slaCompliance || '0%'} SLA Compliance
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.byPriority?.CRITICAL || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Requiring immediate attention
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Ticket Status Distribution</CardTitle>
                    <CardDescription>
                      Current breakdown of tickets by status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statusChartData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={statusChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {statusChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {statusChartData.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm font-medium">{item.name}</span>
                              <span className="text-sm text-muted-foreground ml-auto">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No status data available
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Priority Breakdown</CardTitle>
                    <CardDescription>
                      Tickets by priority level
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {priorityChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priorityChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#6366f1" barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No priority data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Tickets</CardTitle>
                  <CardDescription>
                    Latest tickets submitted to your department.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {data.recentTickets?.length > 0 ? (
                      data.recentTickets.map((ticket: any) => (
                        <div key={ticket.id} className="flex items-center">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {ticket.studentName} • {new Date(ticket.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-auto font-medium">
                             <Badge variant={ticket.status === 'OPEN' ? 'destructive' : 'secondary'}>{ticket.status}</Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent tickets.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-l-4 border-l-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                      <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{data.analytics?.slaCompliance || '0%'}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        24-hour target
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.analytics?.avgResolutionTime || '0h'}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Per ticket
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Resolved</CardTitle>
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.analytics?.totalResolved || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This period
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.analytics?.performanceScore || 'N/A'}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Team average
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20">
                    <CardTitle className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      Ticket Trends (7 Days)
                    </CardTitle>
                    <CardDescription>Daily ticket creation and resolution patterns</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-[320px]">
                      {Array.isArray(data.analytics?.trends) && data.analytics.trends.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.analytics.trends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              stroke="#6b7280"
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip 
                              labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Line 
                              type="monotone" 
                              dataKey="created" 
                              stroke="#6366f1" 
                              strokeWidth={3} 
                              name="Created" 
                              dot={{ fill: '#6366f1', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="resolved" 
                              stroke="#10b981" 
                              strokeWidth={3} 
                              name="Resolved" 
                              dot={{ fill: '#10b981', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <TrendingUp className="h-12 w-12 mb-2 opacity-20" />
                          <p className="text-sm">No trend data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        Top Issues
                      </CardTitle>
                      <CardDescription>Most common ticket categories</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="h-[300px]">
                        {Array.isArray(data.analytics?.topIssues) && data.analytics.topIssues.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.analytics.topIssues}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="category" stroke="#6b7280" style={{ fontSize: '12px' }} />
                              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                              <Bar dataKey="count" fill="#8b5cf6" barSize={50} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <AlertCircle className="h-12 w-12 mb-2 opacity-20" />
                            <p className="text-sm">No issue data available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                      <CardTitle className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Performance Insights
                      </CardTitle>
                      <CardDescription>Key metrics and observations</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Resolution Rate</p>
                            <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{data.analytics?.resolutionRate || '0%'}</p>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">Tickets resolved vs created</p>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">First Response Time</p>
                            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.analytics?.firstResponseTime || 'N/A'}</p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Average time to first reply</p>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Backlog</p>
                            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{data.summary?.unassignedTickets || 0}</p>
                          <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">Unassigned tickets</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
            </TabsContent>

            {/* Team Performance Tab */}
            <TabsContent value="team" className="space-y-4">
              {teamPerformance && teamPerformance.length > 0 ? (
                <>
                  {/* Performance Charts */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Performance Comparison Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Performance Comparison</CardTitle>
                        <CardDescription>Staff member performance percentages</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={teamPerformance.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="name" 
                              className="text-xs"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Bar dataKey="performance" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Workload Distribution Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Workload Distribution</CardTitle>
                        <CardDescription>Active tickets per staff member</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {teamPerformance.some((m: any) => m.activeTickets > 0) ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={teamPerformance.filter((m: any) => m.activeTickets > 0).map((member: any) => ({
                                  name: member.name,
                                  value: member.activeTickets || 0
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {teamPerformance.map((_: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--background))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[250px] text-center">
                            <div className="rounded-full bg-muted p-3 mb-2">
                              <CheckCircle className="h-6 w-6 text-green-500" />
                            </div>
                            <p className="text-sm font-medium">No Active Workload</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              All staff members have completed their assigned tickets
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Team Members Table with Pagination */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Detailed performance metrics for your department staff
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const itemsPerPage = 5
                        const totalPages = Math.ceil(teamPerformance.length / itemsPerPage)
                        const startIndex = (currentPage - 1) * itemsPerPage
                        const endIndex = startIndex + itemsPerPage
                        const currentMembers = teamPerformance.slice(startIndex, endIndex)

                        return (
                          <>
                            <div className="rounded-md border">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b bg-muted/50">
                                    <th className="p-4 text-left font-medium">Staff Member</th>
                                    <th className="p-4 text-left font-medium">Email</th>
                                    <th className="p-4 text-center font-medium">Assigned</th>
                                    <th className="p-4 text-center font-medium">Active</th>
                                    <th className="p-4 text-center font-medium">Resolved</th>
                                    <th className="p-4 text-center font-medium">Performance</th>
                                    <th className="p-4 text-left font-medium">Joined</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {currentMembers.map((member: any, index: number) => (
                                    <tr key={member.id || member._id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                      <td className="p-4">
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-sm font-medium text-primary">
                                              {member.name?.charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => navigate(`/department/team/${member.id || member.userId}`)}
                                            className="font-medium hover:text-primary hover:underline transition-colors text-left"
                                          >
                                            {member.name}
                                          </button>
                                        </div>
                                      </td>
                                      <td className="p-4 text-sm text-muted-foreground">{member.email}</td>
                                      <td className="p-4 text-center">
                                        <Badge variant="secondary">{member.assignedTickets || 0}</Badge>
                                      </td>
                                      <td className="p-4 text-center">
                                        <Badge variant="outline">{member.activeTickets || 0}</Badge>
                                      </td>
                                      <td className="p-4 text-center">
                                        <Badge variant="default" className="bg-green-500">{member.resolvedTickets || 0}</Badge>
                                      </td>
                                      <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-primary transition-all"
                                              style={{ width: `${member.performance || 0}%` }}
                                            />
                                          </div>
                                          <span className="text-sm font-medium">{member.performance || 0}%</span>
                                        </div>
                                      </td>
                                      <td className="p-4 text-sm text-muted-foreground">
                                        {new Date(member.joinedAt).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric', 
                                          year: 'numeric' 
                                        })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                  Showing {startIndex + 1} to {Math.min(endIndex, teamPerformance.length)} of {teamPerformance.length} members
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                  >
                                    Previous
                                  </Button>
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                      <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className="w-8 h-8 p-0"
                                      >
                                        {page}
                                      </Button>
                                    ))}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-3 mb-4">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">No Staff Members</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      There are no staff members in your department yet. Add team members to see their performance metrics here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Staff Dashboard View */}
        {!user?.isHead && data && (
           <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Assigned Tickets</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.stats?.assignedTickets || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Total assigned
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Workload</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.stats?.activeTickets || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Open / In Progress
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.stats?.resolvedTickets || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Successfully closed
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.stats?.avgResolutionTime || '0h'}</div>
                    <p className="text-xs text-muted-foreground">
                      Per ticket
                    </p>
                  </CardContent>
                </Card>
              </div>
              
               <div className="grid gap-4 md:grid-cols-1">
                 <Card>
                    <CardHeader>
                      <CardTitle>My Active Tickets</CardTitle>
                      <CardDescription>Tickets currently assigned to you that need attention.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border p-4 text-center text-muted-foreground">
                            <Link to="/department/tickets?status=IN_PROGRESS" className="text-primary hover:underline">
                                Go to My Tickets
                            </Link>
                        </div>
                    </CardContent>
                 </Card>
               </div>
           </div>
        )}
      </div>
    </DepartmentLayout>
  )
}
