import { useEffect, useState } from "react"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { getCurrentDepartmentUser } from "@/services/departmentAuthService"
import { getDepartmentOverview, getAnalytics, getTeamPerformance, exportReport } from "@/services/departmentHeadService"
import { getStaffDashboardStats, getStaffPerformance } from "@/services/departmentStaffService"
import { Loader2, Ticket, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, Users, Target, Zap, Activity, ArrowUpRight, ArrowDownRight, UserCheck, Calendar } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, Line } from 'recharts'
import { Progress } from "@/components/ui/progress"
import { toast } from 'react-toastify'
import { TicketDetailsDialog } from "@/components/department/TicketDetailsDialog"

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export default function DepartmentDashboard() {
  const user = getCurrentDepartmentUser()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [teamPerformance, setTeamPerformance] = useState<any>(null)
  const [staffPerformance, setStaffPerformance] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [viewingTicketId, setViewingTicketId] = useState<string>("")

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const blob = await exportReport('pdf', 'summary')
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `department-report-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Report exported successfully")
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Failed to export report")
    } finally {
      setIsExporting(false)
    }
  }

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
          const performance = await getStaffPerformance()
          setData(stats.data)
          setStaffPerformance(performance.data)
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

              {/* Performance Overview Card */}
              <Card className="border-t-4 border-t-indigo-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-600" />
                    Performance Overview
                  </CardTitle>
                  <CardDescription>Key performance indicators for your department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-4">
                    {/* Team Performance Score */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Team Performance</span>
                        <Zap className="h-4 w-4 text-yellow-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-3xl font-bold text-indigo-600">
                          {Math.round((data.summary?.resolvedTickets || 0) / Math.max(data.summary?.totalTickets || 1, 1) * 100)}%
                        </div>
                        <Progress value={(data.summary?.resolvedTickets || 0) / Math.max(data.summary?.totalTickets || 1, 1) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">Resolution rate</p>
                      </div>
                    </div>

                    {/* Avg Resolution Time */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Avg Resolution</span>
                        <Clock className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-3xl font-bold text-blue-600">
                          {data.analytics?.avgResolutionTime || '0h'}
                        </div>
                        {/* Calculate progress assuming 72h (3 days) target. Lower is better. */}
                        <Progress 
                          value={Math.min(100, (parseFloat(data.analytics?.avgResolutionTime) || 0) / 72 * 100)} 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground">Target: 3 days</p>
                      </div>
                    </div>

                    {/* Active Workload */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Active Workload</span>
                        <Activity className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-3xl font-bold text-green-600">
                          {(data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)}
                        </div>
                        <Progress 
                          value={Math.min(100, ((data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)) / Math.max((data.summary?.totalTickets || 1) * 0.5, 1) * 100)} 
                          className="h-2" 
                        />
                        <p className="text-xs text-muted-foreground">Active tickets</p>
                      </div>
                    </div>

                    {/* SLA Compliance */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">SLA Compliance</span>
                        <CheckCircle className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-3xl font-bold text-purple-600">
                          {data.analytics?.slaCompliance || '0%'}
                        </div>
                        <Progress value={parseInt(data.analytics?.slaCompliance) || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground">Target: 90%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Trends Chart */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Trends</CardTitle>
                    <CardDescription>Created vs Resolved (Last 7 days)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.analytics?.trends || []}>
                          <defs>
                            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="created" 
                            stroke="#3b82f6" 
                            fillOpacity={1} 
                            fill="url(#colorCreated)"
                            name="Created"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="resolved" 
                            stroke="#10b981" 
                            fillOpacity={1} 
                            fill="url(#colorResolved)"
                            name="Resolved"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Workload Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Workload</CardTitle>
                    <CardDescription>Active tickets per team member</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {teamPerformance?.slice(0, 5).map((member: any, index: number) => (
                        <div key={member.id || index} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{member.name}</span>
                            </div>
                            <span className="text-muted-foreground">{member.activeTickets || 0} tickets</span>
                          </div>
                          <Progress 
                            value={Math.min((member.activeTickets || 0) * 10, 100)} 
                            className="h-2"
                          />
                        </div>
                      )) || (
                        <p className="text-sm text-muted-foreground text-center py-8">No team data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Today</p>
                        <p className="text-2xl font-bold">
                          {data.analytics?.trends?.find((t: any) => t.date === new Date().toISOString().split('T')[0])?.created || 0}
                        </p>
                      </div>
                      <Ticket className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Critical</p>
                        <p className="text-2xl font-bold">{data.byPriority?.CRITICAL || 0}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Unassigned</p>
                        <p className="text-2xl font-bold">{data.summary?.unassignedTickets || 0}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-orange-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Team Size</p>
                        <p className="text-2xl font-bold">{teamPerformance?.length || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Avg Load</p>
                        <p className="text-2xl font-bold">
                          {teamPerformance?.length ? Math.round(((data.summary?.inProgressTickets || 0) + (data.summary?.openTickets || 0)) / teamPerformance.length * 10) / 10 : 0}
                        </p>
                      </div>
                      <Zap className="h-8 w-8 text-yellow-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Completion</p>
                        <p className="text-2xl font-bold">
                           {Math.round(((data.summary?.resolvedTickets || 0) + (data.summary?.closedTickets || 0)) / Math.max(data.summary?.totalTickets || 1, 1) * 100)}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-indigo-500 opacity-50" />
                    </div>
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
                        <div 
                          key={ticket.id} 
                          className="flex items-center cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                          onClick={() => {
                            setViewingTicketId(ticket.id)
                            setDetailsDialogOpen(true)
                          }}
                        >
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

                {/* 1. Header & Quick Actions */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Performance Analytics</h3>
                    <p className="text-muted-foreground text-sm">Detailed insights into your department's efficiency and workload.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Last 7 Days
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleExport} disabled={isExporting}>
                      {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {isExporting ? 'Exporting...' : 'Export Report'}
                    </Button>
                  </div>
                </div>

                {/* 2. Enhanced KPI Cards Row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="hover:shadow-md transition-all border-l-4 border-l-indigo-500 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <TrendingUp className="h-16 w-16 text-indigo-500" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">SLA Compliance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                          {data.analytics?.slaCompliance || '0%'}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium flex items-center">
                          <ArrowUpRight className="h-3 w-3 mr-0.5" />
                          +2.5%
                        </span>
                      </div>
                      <Progress value={parseInt(data.analytics?.slaCompliance) || 0} className="h-1.5 mt-3" />
                      <p className="text-xs text-muted-foreground mt-2">Target: 95% within 24h</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all border-l-4 border-l-blue-500 overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Clock className="h-16 w-16 text-blue-500" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Avg Resolution Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {data.analytics?.avgResolutionTime || '0h'}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium flex items-center">
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                          -15%
                        </span>
                      </div>
                      <Progress value={60} className="h-1.5 mt-3" />
                      <p className="text-xs text-muted-foreground mt-2">Target: &lt; 24 hours</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all border-l-4 border-l-green-500 overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-3 opacity-10">
                      <CheckCircle className="h-16 w-16 text-green-500" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Resolved</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-2">
                         <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {data.analytics?.totalResolved || 0}
                        </span>
                         <span className="text-xs text-emerald-600 font-medium flex items-center">
                          <ArrowUpRight className="h-3 w-3 mr-0.5" />
                          +5
                        </span>
                      </div>
                      <div className="flex gap-1 mt-3">
                         {[1,2,3,4,5,4,3].map((h, i) => (
                           <div key={i} className="flex-1 bg-green-100 rounded-sm" style={{ height: '6px' }}>
                             <div className="bg-green-500 rounded-sm w-full" style={{ height: `${h * 20}%` }}></div>
                           </div>
                         ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Total resolved this week</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-all border-l-4 border-l-purple-500 overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Zap className="h-16 w-16 text-purple-500" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Team Efficiency</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const score = teamPerformance?.length 
                          ? Math.round(teamPerformance.reduce((acc: number, m: any) => acc + (m.performance || 0), 0) / teamPerformance.length)
                          : 0;
                        const status = score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Stable" : "Low";
                        const statusColor = score >= 90 ? "text-emerald-600" : score >= 70 ? "text-blue-600" : score >= 50 ? "text-amber-600" : "text-red-600";
                        
                        return (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                 {score}%
                              </span>
                              <span className={`text-xs ${statusColor} font-medium flex items-center`}>
                                <Activity className="h-3 w-3 mr-0.5" />
                                {status}
                              </span>
                            </div>
                            <Progress value={score} className="h-1.5 mt-3" />
                            <p className="text-xs text-muted-foreground mt-2">Avg performance score across {teamPerformance?.length || 0} members</p>
                          </>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* 3. Main Chart & Secondary Insights Row */}
                <div className="grid gap-6 md:grid-cols-3">
                   {/* Main Trend Chart (2/3 width) */}
                  <Card className="md:col-span-2 shadow-sm border-t-4 border-t-indigo-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Ticket Volume Trends</CardTitle>
                          <CardDescription>Created vs. Resolved tickets over time</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">Created</Badge>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">Resolved</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pl-0">
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.analytics?.trends || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCreatedBig" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorResolvedBig" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                            className="text-xs"
                          />
                          <YAxis 
                             tickLine={false}
                             axisLine={false}
                             tick={{ fill: '#6b7280', fontSize: 12 }}
                             width={40}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="created" 
                            stroke="#6366f1" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorCreatedBig)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="resolved" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorResolvedBig)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Issues Card (1/3 width) */}
                  <Card className="shadow-sm border-t-4 border-t-orange-500">
                    <CardHeader>
                      <CardTitle>Top Issues</CardTitle>
                      <CardDescription>Most frequent ticket categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {data.analytics?.topIssues?.length > 0 ? (
                            data.analytics.topIssues.map((issue: any, index: number) => (
                                <div key={index} className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium truncate max-w-[150px]">{issue.category}</span>
                                    <span className="font-bold text-gray-700">{issue.count}</span>
                                  </div>
                                  <Progress 
                                    value={(issue.count / Math.max(...data.analytics.topIssues.map((i: any) => i.count))) * 100} 
                                    className={`h-2 ${index === 0 ? 'bg-orange-100 text-orange-500' : 'bg-gray-100'}`}
                                  />
                                  {index === 0 && <p className="text-xs text-orange-600">Top reported issue</p>}
                                </div>
                            ))
                        ) : (
                             <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                                <p>No issue data available</p>
                             </div>
                        )}
                        
                        <div className="pt-4 border-t">
                             <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Priority Distribution</h4>
                             <div className="flex gap-2 text-xs">
                                <div className="flex-1 bg-gray-100 rounded p-2 text-center">
                                    <div className="font-bold text-gray-700">{data.byPriority?.LOW || 0}</div>
                                    <div className="text-[10px] text-gray-500">Low</div>
                                </div>
                                <div className="flex-1 bg-blue-50 rounded p-2 text-center">
                                    <div className="font-bold text-blue-700">{data.byPriority?.MEDIUM || 0}</div>
                                    <div className="text-[10px] text-blue-500">Med</div>
                                </div>
                                <div className="flex-1 bg-orange-50 rounded p-2 text-center">
                                    <div className="font-bold text-orange-700">{data.byPriority?.HIGH || 0}</div>
                                    <div className="text-[10px] text-orange-500">High</div>
                                </div>
                                <div className="flex-1 bg-red-50 rounded p-2 text-center">
                                    <div className="font-bold text-red-700">{data.byPriority?.CRITICAL || 0}</div>
                                    <div className="text-[10px] text-red-500">Crit</div>
                                </div>
                             </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 4. Day of Week Analysis Row */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle>Total Volume by Day</CardTitle>
                        <CardDescription>Ticket volume distribution across the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.analytics?.trends || []}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="created" name="Tickets" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                         </div>
                    </CardContent>
                </Card>

            </TabsContent>

            {/* Team Performance Tab */}
            {/* Team Performance Tab */}
            <TabsContent value="team" className="space-y-6">
              {teamPerformance && teamPerformance.length > 0 ? (
                <>
                  {/* 1. Advanced Performance Charts */}
                  <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Comparison Chart (2 cols) */}
                    <Card className="md:col-span-2 shadow-sm border-t-4 border-t-indigo-500">
                      <CardHeader>
                        <CardTitle>Team Output & Quality</CardTitle>
                        <CardDescription>Comparison of resolved tickets vs efficiency score</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={teamPerformance}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" scale="point" padding={{ left: 10, right: 10 }} tick={{fontSize: 12}} />
                              <YAxis yAxisId="left" orientation="left" stroke="#6b7280" fontSize={12} />
                              <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={12} unit="%" />
                              <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                              />
                              <Legend />
                              <Bar yAxisId="left" dataKey="resolvedTickets" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                              <Bar yAxisId="left" dataKey="activeTickets" name="Active" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
                              <Line yAxisId="right" type="monotone" dataKey="performance" name="Efficiency Score" stroke="#8b5cf6" strokeWidth={2} dot={{r: 4}} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Workload Distribution (1 col) */}
                    <Card className="shadow-sm border-t-4 border-t-pink-500">
                      <CardHeader>
                         <CardTitle>Current Workload</CardTitle>
                         <CardDescription>Active tickets distribution</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px] flex items-center justify-center">
                          {teamPerformance.some((m: any) => m.activeTickets > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie
                                    data={teamPerformance.filter((m: any) => m.activeTickets > 0)}
                                    dataKey="activeTickets"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                  >
                                    {teamPerformance.map((_: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                  <Legend verticalAlign="bottom" height={36}/>
                               </PieChart>
                            </ResponsiveContainer>
                          ) : (
                             <div className="flex flex-col items-center justify-center text-muted-foreground">
                               <CheckCircle className="h-12 w-12 mb-2 opacity-20" />
                               <p className="text-sm">No active tickets</p>
                             </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 2. Detailed Team Table */}
                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-muted/30">
                       <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Team Roster</CardTitle>
                            <CardDescription>Detailed metrics per staff member</CardDescription>
                          </div>
                          {/* <div className="flex gap-2"></div> */}
                       </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(() => {
                        const itemsPerPage = 5
                        const totalPages = Math.ceil(teamPerformance.length / itemsPerPage)
                        const startIndex = (currentPage - 1) * itemsPerPage
                        const endIndex = startIndex + itemsPerPage
                        const currentMembers = teamPerformance.slice(startIndex, endIndex)

                        return (
                          <>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-muted/50 text-xs uppercase text-muted-foreground">
                                    <th className="p-4 text-left font-medium">Staff Member</th>
                                    <th className="p-4 text-center font-medium">Workload</th>
                                    <th className="p-4 text-center font-medium">Resolved</th>
                                    <th className="p-4 text-center font-medium">Avg Time</th>
                                    <th className="p-4 text-center font-medium">Efficiency</th>
                                    <th className="p-4 text-right font-medium">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {currentMembers.map((member: any) => (
                                    <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                                      <td className="p-4">
                                        <div 
                                          className="flex items-center gap-3 cursor-pointer group"
                                          onClick={() => navigate(`/department/team/${member.id}`)}
                                        >
                                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 transition-all group-hover:scale-105 group-hover:shadow-md">
                                            {member.name?.charAt(0).toUpperCase()}
                                          </div>
                                          <div>
                                            <p className="font-medium text-sm group-hover:text-primary transition-colors">{member.name}</p>
                                            <p className="text-xs text-muted-foreground">{member.email}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-4">
                                        <div className="flex flex-col items-center gap-1">
                                           <Badge variant="outline" className={member.activeTickets > 5 ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-slate-50 border-slate-200"}>
                                              {member.activeTickets} Active
                                           </Badge>
                                           <Progress value={Math.min(member.activeTickets * 10, 100)} className="h-1.5 w-20" />
                                        </div>
                                      </td>
                                      <td className="p-4 text-center">
                                         <div className="font-bold text-gray-700 dark:text-gray-300">{member.resolvedTickets}</div>
                                      </td>
                                      <td className="p-4 text-center text-sm text-muted-foreground">
                                         {member.avgResolutionTime || 'N/A'}h
                                      </td>
                                      <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                          <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full transition-all ${member.performance >= 90 ? 'bg-emerald-500' : member.performance >= 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                              style={{ width: `${member.performance || 0}%` }}
                                            />
                                          </div>
                                          <span className={`text-sm font-bold ${member.performance >= 90 ? 'text-emerald-600' : member.performance >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                                            {member.performance}%
                                          </span>
                                        </div>
                                      </td>
                                      <td className="p-4 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/department/team/${member.id}`)}>
                                           View Profile
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination controls */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between p-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                  Page {currentPage} of {totalPages}
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                  >
                                    Previous
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
                    <div className="text-2xl font-bold">{data.summary?.totalAssigned || 0}</div>
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
                    <div className="text-2xl font-bold">{(data.summary?.inProgress || 0) + (data.summary?.open || 0)}</div>
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
                    <div className="text-2xl font-bold">{data.summary?.resolved || 0}</div>
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
                    <div className="text-2xl font-bold">{data.summary?.avgResolutionTime || 'N/A'}</div>
                    <p className="text-xs text-muted-foreground">
                      Per ticket
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Status Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Status Distribution</CardTitle>
                    <CardDescription>Breakdown of your assigned tickets by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Open', value: data.summary?.open || 0, color: '#ef4444' },
                              { name: 'In Progress', value: data.summary?.inProgress || 0, color: '#3b82f6' },
                              { name: 'Resolved', value: data.summary?.resolved || 0, color: '#10b981' },
                              { name: 'Waiting', value: data.summary?.waiting || 0, color: '#f59e0b' },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'Open', value: data.summary?.open || 0, color: '#ef4444' },
                              { name: 'In Progress', value: data.summary?.inProgress || 0, color: '#3b82f6' },
                              { name: 'Resolved', value: data.summary?.resolved || 0, color: '#10b981' },
                              { name: 'Waiting', value: data.summary?.waiting || 0, color: '#f59e0b' },
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Your ticket resolution performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Resolution Rate</span>
                          <span className="text-2xl font-bold text-primary">{data.summary?.performance || '0%'}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div 
                            className="bg-primary h-3 rounded-full transition-all duration-500"
                            style={{ width: data.summary?.performance || '0%' }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Completion Progress</span>
                          <span className="text-sm font-semibold">
                            {data.summary?.resolved || 0} / {data.summary?.totalAssigned || 0}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div 
                            className="bg-green-500 h-3 rounded-full transition-all duration-500"
                            style={{ 
                              width: data.summary?.totalAssigned > 0 
                                ? `${((data.summary?.resolved || 0) / data.summary.totalAssigned * 100).toFixed(0)}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                          <div className="text-2xl font-bold text-blue-600">{data.summary?.inProgress || 0}</div>
                          <div className="text-xs text-muted-foreground">Active</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                          <div className="text-2xl font-bold text-orange-600">{data.summary?.waiting || 0}</div>
                          <div className="text-xs text-muted-foreground">Waiting</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
                        <span className="text-lg font-semibold">{data.summary?.avgResolutionTime || 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Tickets */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Tickets</CardTitle>
                    <CardDescription>Your latest assigned tickets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.recentTickets && data.recentTickets.length > 0 ? (
                      <div className="space-y-3">
                        {data.recentTickets.slice(0, 5).map((ticket: any) => (
                          <div 
                            key={ticket._id} 
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              setViewingTicketId(ticket._id)
                              setDetailsDialogOpen(true)
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{ticket.subject}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {ticket.status.replace(/_/g, ' ')}
                                </Badge>
                                <Badge variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'destructive' : 'secondary'} className="text-xs">
                                  {ticket.priority}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border p-4 text-center text-muted-foreground">
                        <p className="text-sm">No recent tickets</p>
                        <Link to="/department/tickets" className="text-primary hover:underline text-sm mt-2 inline-block">
                          View All Tickets
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                    <CardDescription>Overview of your workload</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Open Tickets</p>
                            <p className="text-xs text-muted-foreground">Need attention</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-red-600">{data.summary?.open || 0}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">In Progress</p>
                            <p className="text-xs text-muted-foreground">Currently working</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">{data.summary?.inProgress || 0}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Resolved</p>
                            <p className="text-xs text-muted-foreground">Successfully closed</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-green-600">{data.summary?.resolved || 0}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Waiting</p>
                            <p className="text-xs text-muted-foreground">For student response</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-orange-600">{data.summary?.waiting || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* My Internal Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>My Internal Requests</CardTitle>
                  <CardDescription>Tickets you created for other departments</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.myInternalRequests && data.myInternalRequests.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {data.myInternalRequests.map((ticket: any) => (
                          <div 
                            key={ticket._id} 
                            className="p-4 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => {
                              setViewingTicketId(ticket._id)
                              setDetailsDialogOpen(true)
                            }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <Badge 
                                variant="outline" 
                                className={`
                                  ${ticket.status === 'OPEN' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
                                  ${ticket.status === 'RESOLVED' ? 'bg-green-50 text-green-600 border-green-200' : ''}
                                  ${ticket.status === 'CLOSED' ? 'bg-gray-50 text-gray-600 border-gray-200' : ''}
                                `}
                              >
                                {ticket.status}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] font-mono">
                                {ticket.department}
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
                              {ticket.subject}
                            </h4>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                        <p className="text-sm">You haven't created any internal requests yet.</p>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Performance Analytics */}
              {staffPerformance && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Weekly & Monthly Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Trends</CardTitle>
                      <CardDescription>Your weekly and monthly ticket statistics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            {
                              period: 'This Week',
                              assigned: staffPerformance.thisWeek?.assigned || 0,
                              resolved: staffPerformance.thisWeek?.resolved || 0,
                            },
                            {
                              period: 'This Month',
                              assigned: staffPerformance.thisMonth?.assigned || 0,
                              resolved: staffPerformance.thisMonth?.resolved || 0,
                            }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="assigned" fill="#3b82f6" name="Assigned" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Priority Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tickets by Priority</CardTitle>
                      <CardDescription>Distribution of your assigned tickets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={[
                              { priority: 'Low', count: staffPerformance.byPriority?.LOW || 0, color: '#10b981' },
                              { priority: 'Medium', count: staffPerformance.byPriority?.MEDIUM || 0, color: '#f59e0b' },
                              { priority: 'High', count: staffPerformance.byPriority?.HIGH || 0, color: '#ef4444' },
                              { priority: 'Critical', count: staffPerformance.byPriority?.CRITICAL || 0, color: '#dc2626' },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="priority" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                              {[
                                { priority: 'Low', count: staffPerformance.byPriority?.LOW || 0, color: '#10b981' },
                                { priority: 'Medium', count: staffPerformance.byPriority?.MEDIUM || 0, color: '#f59e0b' },
                                { priority: 'High', count: staffPerformance.byPriority?.HIGH || 0, color: '#ef4444' },
                                { priority: 'Critical', count: staffPerformance.byPriority?.CRITICAL || 0, color: '#dc2626' },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
           </div>
        )}
      </div>

      <TicketDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        ticketId={viewingTicketId}
        isHead={user?.isHead}
      />
    </DepartmentLayout>
  )
}
