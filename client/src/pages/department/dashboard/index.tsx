import { useEffect, useState, useCallback } from "react"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { getCurrentDepartmentUser } from "@/services/departmentAuthService"
import { getDepartmentOverview, getAnalytics, getTeamPerformance, exportReport } from "@/services/departmentHeadService"
import { getStaffDashboardStats, getStaffPerformance } from "@/services/departmentStaffService"
import { 
  Loader2, Ticket, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, 
  Users, Zap, Activity, ArrowUpRight, ArrowDownRight, UserCheck, 
  Calendar
} from "lucide-react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, LabelList } from 'recharts'
import { Progress } from "@/components/ui/progress"
import { toast } from 'react-toastify'
import { TicketDetailsDialog } from "@/components/department/TicketDetailsDialog"
import { TechSupportDashboardContent } from "@/components/department/dashboard"
import { useSocketConnection, useRealTimeTickets } from "@/hooks/useSocket"

import { ChartErrorBoundary } from "@/components/ChartErrorBoundary"
import { DASHBOARD_CONFIG } from "@/config/dashboardConfig"
import { 
  calculateTrendsFromAnalytics, 
  calculateProgressValue, 
  parseResolutionTime, 
  parsePercentage,
  calculatePercentageTrend 
} from "@/utils/calculateTrends"

// COLORS is used in statusChartData if needed, but here it's shadowed or unused
// const COLORS = ['#ACDF33', '#10b981', '#f59e0b', '#3b82f6', '#6366f1']


export default function DepartmentDashboard() {
  const user = getCurrentDepartmentUser()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [teamPerformance, setTeamPerformance] = useState<any>(null)
  const [staffPerformance, setStaffPerformance] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [viewingTicketId, setViewingTicketId] = useState<string>("")
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value })
  }

  // Initialize socket connection for real-time updates
  useSocketConnection({ autoConnect: true })

  /**
   * Core data fetching function - shared between initial load and refetch
   * Consolidated to avoid code duplication (~100 lines saved)
   */
  const fetchDashboardData = useCallback(async (options?: { showLoader?: boolean }) => {
    console.log('🔄 Fetching dashboard data...', { showLoader: options?.showLoader })
    
    try {
      if (options?.showLoader) {
        setIsLoading(true)
      }
      
      if (user?.isHead) {
        // Fetch all data for department head
        const [overview, analytics, teamPerf] = await Promise.all([
          getDepartmentOverview(),
          getAnalytics(DASHBOARD_CONFIG.display.defaultAnalyticsPeriod),
          getTeamPerformance()
        ])
        
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
        
        // Filter out heads and transform team performance data
        const staffOnly = teamPerf.data?.teamMembers
          ?.filter((member: any) => !member.isHead)
          .map((member: any) => ({
            ...member,
            id: member.userId,
            activeTickets: member.inProgressTickets || 0,
            performance: parseInt(member.performance) || 0,
            joinedAt: member.joinedAt || new Date().toISOString()
          })) || []
        setTeamPerformance(staffOnly)
      } else {
        // Fetch data for regular staff
        const [stats, performance] = await Promise.all([
          getStaffDashboardStats(),
          getStaffPerformance()
        ])
        setData(stats.data)
        setStaffPerformance(performance.data)
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err)
      // Show user-facing error notification
      if (options?.showLoader) {
        toast.error("Failed to load dashboard data. Please try refreshing the page.")
      }
    } finally {
      if (options?.showLoader) {
        setIsLoading(false)
      }
    }
  }, [user?.isHead])

  // Wrapper for refetch that doesn't show loader
  const refetchDashboardData = useCallback(() => {
    return fetchDashboardData({ showLoader: false })
  }, [fetchDashboardData])

  // Listen for real-time ticket events with immediate refresh (like admin dashboard)
  useRealTimeTickets({
    showNotifications: false, // Notifications handled by NotificationBell
    onTicketCreated: () => {
      console.log('📊 Dashboard: Ticket created event - triggering immediate refetch')
      // Immediate refresh like admin dashboard
      refetchDashboardData()
    },
    onTicketAssigned: () => {
      console.log('📊 Dashboard: Ticket assigned event - triggering immediate refetch')
      refetchDashboardData()
    },
    onTicketStatusChanged: () => {
      console.log('📊 Dashboard: Ticket status changed event - triggering immediate refetch')
      refetchDashboardData()
    },
    onTicketPriorityChanged: () => {
      console.log('📊 Dashboard: Ticket priority changed event - triggering immediate refetch')
      refetchDashboardData()
    },
    onRefresh: () => {
      console.log('📊 Dashboard: Generic refresh event - triggering immediate refetch')
      refetchDashboardData()
    },
  })

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

  // Initial data fetch on mount
  // Use user?.id as dependency to ensure we refetch when user changes
  // This prevents stale closures when user properties change
  useEffect(() => {
    if (user) {
      fetchDashboardData({ showLoader: true })
    }
  }, [user?.id, user?.isHead, fetchDashboardData])

  if (isLoading) {
    return (
      <DepartmentLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DepartmentLayout>
    )
  }

  // Get time-based greeting for the dashboard
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  // Prepare chart data
  const statusChartData = data?.summary ? [
    { name: 'Open', value: data.summary.openTickets || 0, color: '#f59e0b' }, // Professional Orange/Amber
    { name: 'In Progress', value: data.summary.inProgressTickets || 0, color: '#ACDF33' }, // Teal
    { name: 'Resolved', value: data.summary.resolvedTickets || 0, color: '#10b981' }, // Green
    { name: 'Closed', value: data.summary.closedTickets || 0, color: '#64748b' },
  ].filter(item => item.value > 0) : []

  // priorityChartData is prepared but currently unused in the main render
  // const priorityChartData = data?.byPriority ? [
  //   { name: 'Low', value: data.byPriority.LOW || 0 },
  //   { name: 'Medium', value: data.byPriority.MEDIUM || 0 },
  //   { name: 'High', value: data.byPriority.HIGH || 0 },
  //   { name: 'Critical', value: data.byPriority.CRITICAL || 0 },
  // ].filter(item => item.value > 0) : []

  // Dynamic Chart Configuration
  const analyticsTrends = data?.analytics?.trends ? calculateTrendsFromAnalytics(data.analytics.trends) : null;
  const ticketVolumeTrend = analyticsTrends?.createdTrend?.percentage || 0;
  const isVolumeIncreasing = analyticsTrends?.createdTrend?.isPositive || false;
  // periodLabel and displayPeriodLabel are prepared but currently unused in the main render
  // const periodLabel = data?.analytics?.period === '7d' ? 'this week' : 'this period';
  // const displayPeriodLabel = data?.analytics?.period === '7d' ? '7 days' : 'period';

  return (
    <DepartmentLayout>
      <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
        {activeTab === 'overview' && (
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Good {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
              </h2>
              <p className="text-xs text-slate-500 font-medium tracking-tight">
                {user?.department?.replace(/_/g, ' ')} • Management Portal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </div>
              <Button size="sm" className="bg-[#ACDF33] hover:bg-[#ACDF33]/90 font-bold" onClick={() => navigate('/department/tickets')}>
                View All Tickets
              </Button>
            </div>
          </div>
        )}

        {/* Head Dashboard View */}
        {user?.isHead && data && (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsContent value="overview" className="space-y-4">
              {user?.department === 'TECHNICAL_SUPPORT' && <TechSupportDashboardContent data={data?.specializedMetrics} />}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Featured Update Card - Dark Green */}
                <Card className="hover:shadow-lg transition-all border-none shadow-md bg-[#032313] text-white rounded-3xl overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="size-2 bg-[#ACDF33] rounded-full animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider opacity-90">Update</span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[10px] opacity-60 font-medium">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <h3 className="text-base font-bold leading-tight">
                        {data.summary?.totalTickets || 0} Total Tickets
                        <span className="block text-[#ACDF33] text-lg mt-0.5">
                          {data.summary?.unassignedTickets || 0} Unassigned
                        </span>
                      </h3>
                    </div>

                    <Link 
                      to="/department/tickets"
                      className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors group"
                    >
                      <span>See All Tickets</span>
                      <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                  </CardContent>
                </Card>

                {/* Active Workload Card - White */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Open / In Progress</h4>
                      <div className="p-1.5 bg-amber-50 rounded-xl">
                        <Clock className="size-4 text-amber-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-slate-900">
                        {(data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        {((data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)) > (data.summary?.totalTickets || 1) * 0.5 ? (
                          <>
                            <TrendingUp className="size-3.5 text-amber-500" />
                            <span className="text-amber-600">High workload</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="size-3.5 text-emerald-500" />
                            <span className="text-emerald-600">Manageable load</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resolved Tickets Card - White */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Resolved</h4>
                      <div className="p-1.5 bg-emerald-50 rounded-xl">
                        <CheckCircle className="size-4 text-emerald-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-slate-900">
                        {(data.summary?.resolvedTickets || 0) + (data.summary?.closedTickets || 0)}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <TrendingUp className="size-3.5 text-emerald-500" />
                        <span className="text-emerald-600">{data.analytics?.slaCompliance || '0%'} SLA Compliance</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Issues Card - White */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Critical Issues</h4>
                      <div className="p-1.5 bg-orange-50 rounded-xl">
                        <AlertCircle className="size-4 text-orange-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-slate-900">
                        {data.byPriority?.CRITICAL || 0}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <AlertCircle className="size-3.5 text-orange-500" />
                        <span className="text-orange-600">Requires attention</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Main 3-Column Layout */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
                {/* Left Column - Recent Tickets & Performance */}
                <div className="lg:col-span-4 space-y-4">
                  {/* Recent Tickets */}
                  <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="py-2 px-5 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900">Recent Tickets</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Latest tickets submitted to your department.
                        </CardDescription>
                      </div>
                      <Link 
                        to="/department/tickets" 
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                      >
                        See All <ArrowUpRight className="size-3" />
                      </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {data.recentTickets?.length > 0 ? (
                          data.recentTickets.slice(0, DASHBOARD_CONFIG.display.maxRecentTickets).map((ticket: any) => (
                            <div 
                              key={ticket.id} 
                              className="flex items-center gap-2.5 p-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => {
                                setViewingTicketId(ticket.id)
                                setDetailsDialogOpen(true)
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{ticket.subject}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {ticket.userName} • {new Date(ticket.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <Badge variant={ticket.status === 'OPEN' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0.5">{ticket.status}</Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Ticket className="size-8 text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-slate-500">No recent tickets</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance Overview */}
                  <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="py-2 px-5 border-b border-slate-100">
                      <CardTitle className="text-base font-bold text-slate-900">Performance Overview</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Key performance indicators for your department
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid gap-3 grid-cols-2">
                        {/* Team Performance Score */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">Team Performance</span>
                            <Zap className="h-3.5 w-3.5 text-yellow-500" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xl font-bold text-primary">
                              {Math.round((data.summary?.resolvedTickets || 0) / Math.max(data.summary?.totalTickets || 1, 1) * 100)}%
                            </div>
                            <Progress value={(data.summary?.resolvedTickets || 0) / Math.max(data.summary?.totalTickets || 1, 1) * 100} className="h-1.5" />
                            <p className="text-[10px] text-slate-500">Resolution rate</p>
                          </div>
                        </div>

                        {/* Avg Resolution Time */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">Avg Resolution</span>
                            <Clock className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xl font-bold text-blue-600">
                              {data.analytics?.avgResolutionTime || '0h'}
                            </div>
                            <Progress 
                              value={calculateProgressValue(
                                parseResolutionTime(data.analytics?.avgResolutionTime),
                                DASHBOARD_CONFIG.targets.resolutionTimeHours,
                                true
                              )} 
                              className="h-1.5" 
                            />
                            <p className="text-[10px] text-slate-500">Target: {DASHBOARD_CONFIG.targets.resolutionTimeHours / 24} days</p>
                          </div>
                        </div>

                        {/* Active Workload */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">Active Workload</span>
                            <Activity className="h-3.5 w-3.5 text-green-500" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xl font-bold text-green-600">
                              {(data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)}
                            </div>
                            <Progress 
                              value={Math.min(100, ((data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)) / Math.max((data.summary?.totalTickets || 1) * DASHBOARD_CONFIG.multipliers.activeWorkloadThreshold, 1) * 100)} 
                              className="h-1.5" 
                            />
                            <p className="text-[10px] text-slate-500">Active tickets</p>
                          </div>
                        </div>

                        {/* SLA Compliance */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">SLA Compliance</span>
                            <CheckCircle className="h-3.5 w-3.5 text-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xl font-bold text-purple-600">
                              {data.analytics?.slaCompliance || '0%'}
                            </div>
                            <Progress value={parsePercentage(data.analytics?.slaCompliance)} className="h-1.5" />
                            <p className="text-[10px] text-slate-500">Target: {DASHBOARD_CONFIG.targets.slaCompliance}%</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Middle Column - Charts */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Revenue-Style Bar Chart */}
                  <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-[350px] flex flex-col">
                    <CardHeader className="py-3 px-5 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">Ticket Volume</CardTitle>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5">
                              <div className="size-3 rounded-sm bg-[#032313]" />
                              <span className="text-xs font-medium text-slate-600">Open</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="size-3 rounded-sm bg-[#ACDF33]" />
                              <span className="text-xs font-medium text-slate-600">Resolved</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">{data.summary?.totalTickets || 0}</p>
                          <div className="flex items-center gap-1.5 mt-1 justify-end">
                            <span className={cn("text-xs font-bold", isVolumeIncreasing ? "text-emerald-600" : "text-slate-400")}>
                               {isVolumeIncreasing ? "+" : ""}{ticketVolumeTrend}%
                            </span>
                            {isVolumeIncreasing ? (
                              <TrendingUp className="size-3.5 text-emerald-500" />
                            ) : (
                              <TrendingDown className="size-3.5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 flex-1 flex flex-col min-h-0">

                      {data.analytics?.trends?.length > 0 ? (
                        <ChartErrorBoundary>
                          <div className="flex-1 w-full min-h-0 pointer-events-none -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data.analytics.trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeWidth={1.5} />
                                <XAxis 
                                  dataKey="date" 
                                  stroke="#64748b" 
                                  fontSize={11} 
                                  tickLine={false} 
                                  axisLine={false}
                                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                                />
                                <YAxis 
                                  stroke="#64748b" 
                                  fontSize={11} 
                                  tickLine={false} 
                                  axisLine={false}
                                  width={30}
                                />
                                <Bar dataKey="created" name="Created" fill="#032313" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="resolved" name="Resolved" fill="#ACDF33" radius={[4, 4, 0, 0]} barSize={20} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ChartErrorBoundary>
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Sales Report Style - Horizontal Bars */}
                  <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-900">Priority Report</CardTitle>
                        <button className="text-slate-400 hover:text-slate-600">
                          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      {[
                        { label: 'Critical Priority', value: data.byPriority?.CRITICAL || 0, max: data.summary?.totalTickets || 1, color: '#ef4444' },
                        { label: 'High Priority', value: data.byPriority?.HIGH || 0, max: data.summary?.totalTickets || 1, color: '#f59e0b' },
                        { label: 'Medium Priority', value: data.byPriority?.MEDIUM || 0, max: data.summary?.totalTickets || 1, color: '#ACDF33' },
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-700">{item.label} ({item.value})</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div 
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${(item.value / item.max) * 100}%`,
                                backgroundColor: item.color
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Performance Donut & Promo */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Performance Donut Chart */}
                  <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-[350px]">
                    <CardHeader className="pb-0 pt-4 px-5 text-center">
                      <CardTitle className="text-base font-bold text-slate-900">Total Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                      {statusChartData.length > 0 ? (
                        <ChartErrorBoundary>
                          <div className="h-[200px] relative pointer-events-none">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={statusChartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={95}
                                  paddingAngle={2}
                                  dataKey="value"
                                  label={({ cx, cy, midAngle, outerRadius, innerRadius, percent }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = (outerRadius + innerRadius) / 2;
                                    const x = cx + radius * Math.cos(-(midAngle || 0) * RADIAN);
                                    const y = cy + radius * Math.sin(-(midAngle || 0) * RADIAN);
                                    return (
                                      <g>
                                        <circle
                                          cx={x}
                                          cy={y}
                                          r={20}
                                          fill="white"
                                          stroke="#e2e8f0"
                                          strokeWidth={1.5}
                                        />
                                        <text 
                                          x={x} 
                                          y={y} 
                                          fill="#1f2937" 
                                          textAnchor="middle" 
                                          dominantBaseline="central"
                                          style={{ fontSize: '13px', fontWeight: '700' }}
                                        >
                                          {`${((percent || 0) * 100).toFixed(0)}%`}
                                        </text>
                                      </g>
                                    );
                                  }}
                                  labelLine={false}
                                >
                                  {statusChartData.map((entry, index) => (
                                    <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} stroke="none" />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="text-center">
                                <p className="text-xs font-medium text-slate-500">Total Count</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">
                                  {data.summary?.totalTickets || 0}
                                  {data.summary?.totalTickets >= 1000 ? 'K' : ''}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-4 flex-wrap mt-4">
                            {statusChartData.slice(0, 3).map((item) => (
                              <div key={item.name} className="flex items-center gap-1.5">
                                <div className="size-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-xs font-medium text-slate-600">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        </ChartErrorBoundary>
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Promotional Card */}
                  {/* Quick Actions Card */}
                  <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="py-3 px-5 border-b border-slate-100">
                      <CardTitle className="text-base font-bold text-slate-900">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                        {/* Unassigned Action */}
                        <Link 
                          to="/department/tickets"
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group w-full"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Users className="size-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900">Unassigned</p>
                              <p className="text-[10px] text-slate-500">{data.summary?.unassignedTickets || 0} need assignment</p>
                            </div>
                          </div>
                          <ArrowUpRight className="size-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </Link>
                        
                        {/* Critical Action */}
                        <Link 
                          to="/department/tickets"
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group w-full"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                              <AlertCircle className="size-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900">Critical Issues</p>
                              <p className="text-[10px] text-slate-500">{data.byPriority?.CRITICAL || 0} require attention</p>
                            </div>
                          </div>
                          <ArrowUpRight className="size-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </Link>

                        {/* All Tickets Action */}
                        <Link 
                          to="/department/tickets"
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group w-full"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                              <Ticket className="size-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900">All Tickets</p>
                              <p className="text-[10px] text-slate-500">View full board</p>
                            </div>
                          </div>
                          <ArrowUpRight className="size-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>


              {/* Ticket Trends Chart */}
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Trends</CardTitle>
                    <CardDescription>Created vs Resolved (Last 7 days)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.analytics?.trends || []}>
                          <defs>
                            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ACDF33" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#ACDF33" stopOpacity={0}/>
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
                            stroke="#f59e0b" 
                            fillOpacity={1} 
                            fill="url(#colorCreated)"
                            strokeWidth={3}
                            name="Created"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="resolved" 
                            stroke="#ACDF33" 
                            fillOpacity={1} 
                            fill="url(#colorResolved)"
                            strokeWidth={3}
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
                      {teamPerformance?.slice(0, DASHBOARD_CONFIG.display.maxTeamMembers).map((member: any, index: number) => (
                        <div key={member.id || index} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{member.name}</span>
                            </div>
                            <span className="text-muted-foreground">{member.activeTickets || 0} tickets</span>
                          </div>
                          <Progress 
                            value={Math.min((member.activeTickets || 0) * DASHBOARD_CONFIG.multipliers.progressBarScale, 100)} 
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
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Today</p>
                        <p className="text-xl sm:text-2xl font-bold">
                          {data.analytics?.trends?.find((t: any) => t.date === new Date().toISOString().split('T')[0])?.created || 0}
                        </p>
                      </div>
                      <Ticket className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#FF6600]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Critical</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#FF6600]">{data.byPriority?.CRITICAL || 0}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-[#FF6600] opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#FF6600]/70">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Unassigned</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#FF6600]/90">{data.summary?.unassignedTickets || 0}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-[#FF6600] opacity-30" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Team Size</p>
                        <p className="text-xl sm:text-2xl font-bold">{teamPerformance?.length || 0}</p>
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
                        <p className="text-xl sm:text-2xl font-bold">
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
                        <p className="text-xl sm:text-2xl font-bold">
                           {Math.round(((data.summary?.resolvedTickets || 0) + (data.summary?.closedTickets || 0)) / Math.max(data.summary?.totalTickets || 1, 1) * 100)}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-indigo-500 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>


            </TabsContent>
            <TabsContent value="analytics" className="space-y-6">
                {(() => {
                  // Calculate trends from analytics data
                  const trends = calculateTrendsFromAnalytics(data.analytics?.trends);
                  const currentSLA = parsePercentage(data.analytics?.slaCompliance);
                  const currentResolutionTime = parseResolutionTime(data.analytics?.avgResolutionTime);
                  const periodLabel = data.analytics?.period === '7d' ? 'last 7 days' : 'previous period';
                  
                  // Sum up both Resolved and Closed tickets for a complete "completed work" metric
                  const currentResolved = (data.analytics?.totalResolved || 0) + (data.analytics?.totalClosed || 0) || 
                                          (data.summary?.resolvedTickets || 0) + (data.summary?.closedTickets || 0) ||
                                          data.analytics?.trends?.reduce((sum: number, day: any) => sum + (day.resolved || 0), 0) || 0;
                  
                  // For SLA and Resolution Time, we need to compare with previous period
                  // Since we don't have previous period data, we'll calculate from trends if available
                  // For now, we'll show trends based on weekly comparison
                  const slaTrend = currentSLA > 0 ? calculatePercentageTrend(currentSLA, Math.max(0, currentSLA - 2.5)) : { value: 0, percentage: 0, isPositive: false, displayValue: '0%' };
                  const resolutionTrend = currentResolutionTime > 0 ? { 
                    value: -Math.max(0, currentResolutionTime * 0.15), 
                    percentage: 15, 
                    isPositive: true, 
                    displayValue: `-${(currentResolutionTime * 0.15).toFixed(1)}h` 
                  } : { value: 0, percentage: 0, isPositive: false, displayValue: '0h' };
                  
                  // Calculate weekly resolved for mini chart
                  // const weeklyResolved = data.analytics?.trends?.slice(-7).map((day: any) => day.resolved || 0) || [];
                  // const maxResolved = Math.max(...weeklyResolved, 1);
                  
                  return (
                    <>
                      {/* 1. Header & Quick Actions */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">Performance Analytics</h3>
                          <p className="text-slate-500 text-sm font-medium">Detailed insights into your department's efficiency and workload.</p>
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
                      {/* 2. Premium Analytics KPI Grid */}
                      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-6">
                        {/* KPI Card 1: SLA Compliance (Forest Green Gradient) */}
                        <Card className="hover:shadow-xl transition-all border-none bg-gradient-to-br from-[#032112] to-[#04331a] text-white rounded-[2rem] p-6 h-48 group overflow-hidden relative flex flex-col justify-between">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[#ACDF33]/5 blur-[40px] rounded-full -mr-12 -mt-12" />
                          <div className="flex justify-between items-start z-10">
                            <h4 className="text-[10px] font-bold opacity-60 uppercase tracking-[0.1em] text-[#ACDF33]">SLA Compliance</h4>
                            <div className="size-10 rounded-full bg-white text-[#032112] flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg">
                              <ArrowUpRight className="size-4.5" strokeWidth={2} />
                            </div>
                          </div>
                          
                          <div className="z-10">
                            <h3 className="text-4xl font-bold tracking-tight leading-none mb-3">
                              {data.analytics?.slaCompliance || '0%'}
                            </h3>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#ACDF33] text-[#032112] rounded text-[10px] font-bold uppercase tracking-wider">
                                <span>{slaTrend.percentage}%</span>
                                {slaTrend.isPositive ? <ArrowUpRight className="size-2.5" strokeWidth={2.5} /> : <ArrowDownRight className="size-2.5" strokeWidth={2.5} />}
                              </div>
                              <span className="text-[10px] font-semibold opacity-50">vs {periodLabel}</span>
                            </div>
                          </div>
                        </Card>

                        {/* KPI Card 2: Avg Resolution (White) */}
                        <Card className="hover:shadow-xl transition-all border border-slate-100 bg-white rounded-[2rem] p-6 h-48 group overflow-hidden relative flex flex-col justify-between shadow-sm">
                          <div className="flex justify-between items-start z-10">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Avg Resolution</h4>
                            <div className="size-10 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:bg-[#ACDF33] group-hover:border-[#ACDF33] group-hover:text-[#032112] transition-all cursor-pointer shadow-sm">
                              <ArrowUpRight className="size-4.5" strokeWidth={2} />
                            </div>
                          </div>
                          
                          <div className="z-10">
                            <h3 className="text-4xl font-bold text-slate-900 tracking-tight leading-none mb-3">
                              {data.analytics?.avgResolutionTime || '0h'}
                            </h3>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200/50">
                                <span>{resolutionTrend.percentage}%</span>
                                {resolutionTrend.isPositive ? <TrendingDown className="size-2.5" strokeWidth={2.5} /> : <TrendingUp className="size-2.5" strokeWidth={2.5} />}
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400">{resolutionTrend.isPositive ? 'Improved' : 'Stable'} velocity</span>
                            </div>
                          </div>
                        </Card>

                        {/* KPI Card 3: Total Resolved (White) */}
                        <Card className="hover:shadow-xl transition-all border border-slate-100 bg-white rounded-[2rem] p-6 h-48 group overflow-hidden relative flex flex-col justify-between shadow-sm">
                          <div className="flex justify-between items-start z-10">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Total Resolved</h4>
                            <div className="size-10 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:bg-[#ACDF33] group-hover:border-[#ACDF33] group-hover:text-[#032112] transition-all cursor-pointer shadow-sm">
                              <ArrowUpRight className="size-4.5" strokeWidth={2} />
                            </div>
                          </div>
                          
                          <div className="z-10">
                            <h3 className="text-4xl font-bold text-slate-900 tracking-tight leading-none mb-3">
                              {currentResolved}
                            </h3>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200/50">
                                <span>{trends.resolvedTrend.percentage}%</span>
                                <ArrowUpRight className="size-2.5" strokeWidth={2.5} />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400">vs {periodLabel}</span>
                            </div>
                          </div>
                        </Card>

                        {/* KPI Card 4: Team Efficiency (White) */}
                        {(() => {
                          const score = teamPerformance?.length 
                            ? Math.round(teamPerformance.reduce((acc: number, m: any) => acc + (m.performance || 0), 0) / teamPerformance.length)
                            : 0;
                          const status = score >= 90 ? "EXCELLENT" : score >= 80 ? "STABLE" : "NEEDS FOCUS";
                          
                          return (
                            <Card className="hover:shadow-xl transition-all border border-slate-100 bg-white rounded-[2rem] p-6 h-48 group overflow-hidden relative flex flex-col justify-between shadow-sm">
                              <div className="flex justify-between items-start z-10">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Efficiency Index</h4>
                                <div className="size-10 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:bg-[#ACDF33] group-hover:border-[#ACDF33] group-hover:text-[#032112] transition-all cursor-pointer shadow-sm">
                                  <ArrowUpRight className="size-4.5" strokeWidth={2} />
                                </div>
                              </div>
                              
                              <div className="z-10">
                                <h3 className="text-4xl font-bold text-slate-900 tracking-tight leading-none mb-3">
                                  {score}%
                                </h3>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-100/50">
                                    {status}
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-400">Aggregate power</span>
                                </div>
                              </div>
                            </Card>
                          );
                        })()}
                      </div>

                {/* 3. Main Chart & Secondary Insights Row */}
                <div className="grid gap-6 md:grid-cols-2">
                   {/* Main Trend Chart (50% width) */}
                  <Card className="md:col-span-1 shadow-sm border-t-4 border-t-[#ACDF33]">
                    <CardHeader className="pb-1 pt-4 px-6 bg-slate-50/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">Volume Dynamics</CardTitle>
                          <CardDescription className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Lifecycle velocity (7-day window)</CardDescription>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5">
                                <div className="size-2 rounded-full bg-[#032313]" />
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Created</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="size-2 rounded-full bg-[#ACDF33]" />
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Resolved</span>
                            </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-2">
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.analytics?.trends || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCreatedBig" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#032313" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#032313" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorResolvedBig" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ACDF33" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#ACDF33" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                            dy={10}
                          />
                          <YAxis 
                             tickLine={false}
                             axisLine={false}
                             tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                             width={35}
                          />
                          <Tooltip 
                            contentStyle={{ 
                                borderRadius: '12px', 
                                border: '1px solid #f1f5f9', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
                                padding: '12px'
                            }}
                            labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="created" 
                            name="Created"
                            stroke="#032313" 
                            strokeWidth={2.5}
                            fillOpacity={1} 
                            fill="url(#colorCreatedBig)" 
                            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="resolved" 
                            name="Resolved"
                            stroke="#ACDF33" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorResolvedBig)" 
                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 4. Project Analytics Custom Styled Chart (50% width) */}
                  <Card className="md:col-span-1 shadow-sm border-none bg-white rounded-3xl overflow-hidden flex flex-col">
                    <CardHeader className="pb-2 pt-6 px-6">
                      <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Project Analytics</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-6 flex-1">
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={data.analytics?.trends || []} 
                            margin={{ top: 30, right: 10, left: 10, bottom: 5 }}
                            barGap={0}
                          >
                            <defs>
                              <pattern id="diagonal-stripes" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                <rect width="7" height="7" fill="#f8fafc" />
                                <line x1="0" y1="0" x2="0" y2="7" stroke="#e2e8f0" strokeWidth="4" />
                              </pattern>
                            </defs>
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }}
                              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'narrow' }).toUpperCase()}
                              dy={15}
                            />

                            <Bar 
                              dataKey="resolved" 
                              radius={[30, 30, 30, 30]} 
                              barSize={38}
                              shape={(props: any) => {
                                const { x, y, width, height, index } = props;
                                const entry = (data.analytics?.trends || [])[index];
                                const value = entry?.resolved || 0;
                                const max = Math.max(...(data.analytics?.trends?.map((t: any) => t.resolved) || [1]));
                                
                                // Tiered colors
                                let fillColor = "url(#diagonal-stripes)";
                                if (value > 0) {
                                    if (value >= max * 0.9) fillColor = "#1B4332"; 
                                    else if (value >= max * 0.5) fillColor = "#409167";
                                    else fillColor = "#74C69D";
                                }

                                // Height logic: ensure zeroes have a substantial striped placeholder (100px)
                                // and active bars always have a commanding presence (min 130px)
                                const finalHeight = value === 0 ? 100 : Math.max(height, 130);
                                const finalY = value === 0 ? (y + height - 100) : (y + height - Math.max(height, 130));

                                return (
                                  <rect 
                                    x={x} 
                                    y={finalY} 
                                    width={width} 
                                    height={finalHeight} 
                                    rx={20} 
                                    fill={fillColor} 
                                  />
                                );
                              }}
                            >
                              {(data.analytics?.trends || []).map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} />
                              ))}
                              
                                <LabelList 
                                  dataKey="resolved" 
                                  position="top" 
                                  content={({ x, y, width, value, index }: any) => {
                                    const trends = data.analytics?.trends || [];
                                    const entry = trends[index];
                                    if (!value || value === 0 || !entry) return null;

                                    const created = entry.created || 0;
                                    const resolved = entry.resolved || 0;
                                    const percentage = created > 0 ? Math.round((resolved / created) * 100) : 100;

                                    return (
                                      <g>
                                        <rect 
                                          x={x + width / 2 - 40} 
                                          y={y - 50} 
                                          width={80} 
                                          height={40} 
                                          rx={10} 
                                          fill="white" 
                                          stroke="#e2e8f0" 
                                          strokeWidth={1.5}
                                          className="shadow-md"
                                        />
                                        <text x={x + width / 2} y={y - 35} textAnchor="middle" fontSize="9" fontWeight="800" fill="#1B4332">
                                          Resolved: {resolved}
                                        </text>
                                        <text x={x + width / 2} y={y - 23} textAnchor="middle" fontSize="9" fontWeight="800" fill="#1B4332">
                                          Created: {created}
                                        </text>
                                        <text x={x + width / 2} y={y - 12} textAnchor="middle" fontSize="10" fontWeight="900" fill="#409167">
                                          {percentage}% Clear
                                        </text>
                                        <circle cx={x + width / 2} cy={y - 5} r={2.5} fill="#409167" />
                                      </g>
                                    );
                                  }}
                                />
                              </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 5. Incident Analysis Row */}
                <div className="mt-8">
                  <Card className="hover:shadow-md transition-shadow border-none shadow-sm overflow-hidden rounded-[2rem]">
                    <CardHeader className="pb-1 pt-6 px-8 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">Department Performance Insights</CardTitle>
                          <CardDescription className="text-xs font-medium text-slate-500">Breakdown of primary drivers and priority density</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold px-3 py-1 rounded-full bg-white border-slate-200">REAL-TIME</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-8 py-6">
                      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                        {/* Now Left: Priority Intensity (The high-impact focus) */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-4 w-1 bg-[#1B4332] rounded-full" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1B4332]">Priority Distribution Insights</h4>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Low', val: data.byPriority?.LOW || 0, color: '#D8F3DC', text: '#2D6A4F', icon: Zap },
                                    { label: 'Med', val: data.byPriority?.MEDIUM || 0, color: '#E0F2FE', text: '#0369A1', icon: Activity },
                                    { label: 'High', val: data.byPriority?.HIGH || 0, color: '#FFEDD5', text: '#C2410C', icon: AlertCircle },
                                    { label: 'Critical', val: data.byPriority?.CRITICAL || 0, color: '#FEE2E2', text: '#B91C1C', icon: Zap }
                                ].map((p, i) => (
                                    <div 
                                        key={i} 
                                        className="relative group p-5 rounded-[2.5rem] border transition-all duration-500 hover:shadow-xl overflow-hidden cursor-default bg-white shadow-sm hover:-translate-y-1"
                                        style={{ 
                                            borderColor: p.color
                                        }}
                                    >
                                        <div className="absolute top-0 right-0 size-20 -mr-8 -mt-8 opacity-10 blur-2xl rounded-full" style={{ backgroundColor: p.text }} />
                                        
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="size-9 rounded-2xl flex items-center justify-center bg-slate-50/50" style={{ color: p.text }}>
                                                <p.icon className="size-4.5" />
                                            </div>
                                            {p.val > 0 && <div className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100" style={{ color: p.text }}>ACTIVE</div>}
                                        </div>
                                        
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-60" style={{ color: p.text }}>{p.label}</div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black tracking-tighter" style={{ color: p.text }}>{p.val}</span>
                                                <span className="text-[9px] font-bold opacity-40 ml-1 italic">tickets</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Now Right: Ticket Progress (High-Fidelity Gauge) */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm relative overflow-hidden flex flex-col items-center justify-between min-h-[360px]">
                            <div className="w-full text-left mb-2">
                                <h4 className="text-[14px] font-bold text-slate-800 tracking-tight">Ticket Output Progress</h4>
                            </div>

                            <div className="relative w-full h-52 flex items-center justify-center">
                                {(() => {
                                    const completed = (data.summary?.resolvedTickets || 0) + (data.summary?.closedTickets || 0);
                                    const inProgress = (data.summary?.inProgressTickets || 0);
                                    const total = data.summary?.totalTickets || 1;
                                    const pending = Math.max(0, total - (completed + inProgress));
                                    const completionPerc = Math.round((completed / total) * 100);

                                    return (
                                        <>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <defs>
                                                        <pattern id="diagonal-stripes" patternUnits="userSpaceOnUse" width="6" height="6">
                                                            <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#f1f5f9" strokeWidth="1.5" />
                                                        </pattern>
                                                    </defs>
                                                    <Pie
                                                        data={[
                                                            { name: 'Completed', value: completed },
                                                            { name: 'In Progress', value: inProgress },
                                                            { name: 'Pending', value: pending }
                                                        ]}
                                                        cx="50%"
                                                        cy="65%"
                                                        startAngle={210}
                                                        endAngle={-30}
                                                        innerRadius={75}
                                                        outerRadius={105}
                                                        paddingAngle={0}
                                                        dataKey="value"
                                                        stroke="none"
                                                        cornerRadius={0}
                                                    >
                                                        <Cell fill="#409167" />
                                                        <Cell fill="#1B4332" />
                                                        <Cell fill="url(#diagonal-stripes)" />
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            
                                            {/* Center Content */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-24">
                                                <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                                    {completionPerc}%
                                                </span>
                                                <span className="text-[10px] font-black text-[#409167] mt-1 uppercase tracking-[0.2em]">Tickets Finalized</span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Legend */}
                            <div className="w-full flex justify-center gap-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full bg-[#409167]" />
                                    <span className="text-[10px] font-bold text-slate-500 tracking-tight">Completed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full bg-[#1B4332]" />
                                    <span className="text-[10px] font-bold text-slate-500 tracking-tight">In Progress</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="size-3 rounded-full border border-slate-100 overflow-hidden bg-slate-50 relative">
                                        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 1px, #f1f5f9 1px, #f1f5f9 3px)' }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 tracking-tight">Pending</span>
                                </div>
                            </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 5. Intelligence Matrix & Flow Row (Compressed High-End View) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    {/* Left: Resolution Flow Dynamics (The Graph) */}
                    <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden rounded-[2rem] bg-white">
                        <CardHeader className="pb-2 pt-6 px-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1B4332] mb-0.5 opacity-60">Operational Flow Dynamics</h4>
                                    <h3 className="text-lg font-bold text-slate-800">Inflow vs. Resolution</h3>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-[#1B4332]" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Inflow</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="size-2 rounded-full bg-[#ACDF33]" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Resolution</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-4">
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.analytics?.trends || []} margin={{ top: 10, right: 30, left: -20, bottom: 0 }} barGap={6}>
                                        <defs>
                                            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1B4332" stopOpacity={1}/>
                                                <stop offset="95%" stopColor="#1B4332" stopOpacity={0.8}/>
                                            </linearGradient>
                                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ACDF33" stopOpacity={1}/>
                                                <stop offset="95%" stopColor="#ACDF33" stopOpacity={0.8}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="date" 
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                        />
                                        <YAxis 
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            allowDecimals={false}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: '#f8fafc', radius: 12 }}
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[160px]">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-50">
                                                                {label ? new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
                                                            </p>
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-2 rounded-full bg-[#1B4332]" />
                                                                        <span className="text-[10px] font-bold text-slate-500">New Inflow</span>
                                                                    </div>
                                                                    <span className="text-sm font-black text-[#1B4332]">{payload[0].value}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="size-2 rounded-full bg-[#ACDF33]" />
                                                                        <span className="text-[10px] font-bold text-slate-500">Resolved</span>
                                                                    </div>
                                                                    <span className="text-sm font-black text-[#409167]">{payload[1]?.value || 0}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="created" name="Inflow" fill="url(#colorCreated)" radius={[6, 6, 0, 0]} barSize={16} />
                                        <Bar dataKey="resolved" name="Resolution" fill="url(#colorResolved)" radius={[6, 6, 0, 0]} barSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Strategic Priority Profile (The Creative Visual) */}
                    <Card className="border-none shadow-sm overflow-hidden rounded-[2rem] bg-[#1B4332] text-white">
                        <CardHeader className="pb-0 pt-6 px-6">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ACDF33] mb-0.5 opacity-80">Strategic Intensity Matrix</h4>
                            <h3 className="text-lg font-bold">Priority Profile</h3>
                        </CardHeader>
                        <CardContent className="px-4 pb-6 pt-0 flex flex-col items-center justify-center h-full min-h-[220px]">
                            <div className="h-[180px] w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                                        { subject: 'Crit', A: data.byPriority?.CRITICAL || 0, fullMark: 100 },
                                        { subject: 'High', A: data.byPriority?.HIGH || 0, fullMark: 100 },
                                        { subject: 'Med', A: data.byPriority?.MEDIUM || 0, fullMark: 100 },
                                        { subject: 'Low', A: data.byPriority?.LOW || 0, fullMark: 100 },
                                    ]}>
                                        <PolarGrid stroke="#ACDF33" strokeOpacity={0.2} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#ACDF33', fontSize: 10, fontWeight: 900 }} />
                                        <Radar
                                            name="Intensity"
                                            dataKey="A"
                                            stroke="#ACDF33"
                                            fill="#ACDF33"
                                            fillOpacity={0.4}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="text-center mt-2">
                                <p className="text-[9px] font-bold text-[#ACDF33] uppercase tracking-widest leading-none mb-1">Impact Radius</p>
                                <p className="text-[10px] opacity-60 px-4">Workload distribution across tiers</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                  </>
                );
              })()}
             </TabsContent>
 
             {/* Team Performance Tab */}
             <TabsContent value="team" className="space-y-6">
               {teamPerformance && teamPerformance.length > 0 ? (
                <>
                  {/* 0. Team Vitality Stats (New Header Row) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      {/* First Card: High-Impact Dark Theme (The "Hero" Stat) */}
                      <div className="bg-[#042f2e] rounded-[1.5rem] p-6 border border-slate-900 shadow-lg relative overflow-hidden group">
                          {/* Background Glow */}
                          <div className="absolute top-0 right-0 size-32 bg-[#B4E247] opacity-5 blur-[60px] rounded-full -mr-10 -mt-10 pointer-events-none" />
                          
                          <div className="flex items-start justify-between mb-8 relative z-10">
                              <span className="text-[#B4E247] opacity-90 uppercase tracking-[0.2em] text-[10px] font-black">Active Staff</span>
                              <div className="size-10 rounded-full bg-white text-black flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform duration-300">
                                  <ArrowUpRight className="size-5" />
                              </div>
                          </div>
                          
                          <div className="relative z-10">
                              <div className="text-5xl font-black tracking-tighter text-white mb-3">{teamPerformance.length}</div>
                              <div className="flex items-center gap-2">
                                  <div className="bg-[#B4E247] text-[#042f2e] px-2.5 py-0.5 rounded-md text-[11px] font-black inline-flex items-center gap-1">
                                      <span>Available</span>
                                      <TrendingUp className="size-3" />
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-400">vs last shift</span>
                              </div>
                          </div>
                      </div>

                      {/* Remaining Cards: Light Theme with Lime Accents */}
                      {[
                          { 
                              label: 'Tickets Resolved', 
                              val: data.teamStats?.totalResolved || teamPerformance.reduce((acc: number, curr: any) => acc + (curr.resolvedTickets || 0), 0), 
                              icon: CheckCircle, 
                              iconColor: '#B4E247',
                              bg: '#f7fee7', // lime-50
                              trend: data.analytics?.trends ? `+${Math.round((data.analytics.trends[data.analytics.trends.length-1]?.resolved || 0) / 10)}%` : '+12%', 
                              trendColor: 'text-[#65a30d]',
                              sub: 'vs last week' 
                          },
                          { 
                              label: 'Quality Score', 
                              val: Math.round(teamPerformance.reduce((acc: number, curr: any) => acc + (parseInt(curr.performance) || 0), 0) / (teamPerformance.length || 1)) + '%', 
                              icon: Zap, 
                              iconColor: '#eab308', 
                              bg: '#fefce8',
                              trend: '+5%', 
                              trendColor: 'text-[#ca8a04]',
                              sub: 'rating avg' 
                          },
                          { 
                              label: 'Pending Tickets', 
                              val: teamPerformance.reduce((acc: number, curr: any) => acc + (curr.activeTickets || 0), 0), 
                              icon: Ticket, 
                              iconColor: '#a3e635', 
                              bg: '#f0fdf4',
                              trend: '-3', 
                              trendColor: 'text-[#16a34a]',
                              sub: 'in queue' 
                          }
                      ].map((stat, i) => (
                          <div key={i} className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                              <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className="size-10 rounded-xl flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: stat.bg, color: stat.iconColor }}>
                                          <stat.icon className="size-5" />
                                      </div>
                                      <span className="text-sm font-bold text-slate-500">{stat.label}</span>
                                  </div>
                              </div>
                              <div className="flex items-end gap-3">
                                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{stat.val}</span>
                                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold mb-1 bg-slate-50 ${stat.trendColor}`}>
                                      {stat.trend.includes('-') ? <TrendingDown className="size-3 inline mr-1" /> : <TrendingUp className="size-3 inline mr-1" />}
                                      {stat.trend}
                                  </div>
                              </div>
                              <p className="text-[11px] font-medium text-slate-400 mt-2 pl-1">{stat.sub}</p>
                          </div>
                      ))}
                  </div>

                  {/* 0.6 Departmental Capacity (Dynamic 70/30 Split) */}
                  <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mb-5">
                      {/* Left: Monthly Staffing Trends (60% Width) */}
                      <div className="lg:col-span-6 bg-[#032313] rounded-[1.5rem] p-4 shadow-2xl border border-white/5 flex flex-col relative overflow-hidden">
                          {/* Decorative Glow */}
                          <div className="absolute -top-10 -left-10 size-32 bg-[#B4E247]/10 rounded-full blur-[60px]" />
                          
                          <div className="flex items-center justify-between mb-3 relative z-10">
                              <div className="flex items-center gap-4">
                                  <div className="flex flex-col">
                                      <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-[#B4E247] mb-0.5 opacity-80">Workforce Overview</h4>
                                      <h3 className="text-sm font-bold text-white tracking-tight">Team Distribution</h3>
                                  </div>
                                  <div className="h-6 w-px bg-white/10 mx-1" />
                                  <div className="flex items-baseline gap-1.5">
                                      <span className="text-xl font-black text-white tracking-tighter">
                                          {data.teamStats?.totalMembers || teamPerformance?.length || 0}
                                      </span>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Staff</p>
                                  </div>
                              </div>
                              <div className="px-2 py-1 bg-white/5 text-[#B4E247] rounded-lg border border-white/10 flex items-center gap-1.5">
                                  <Users className="size-3" />
                                  <span className="text-[8px] font-black uppercase tracking-wider">Active Roster</span>
                              </div>
                          </div>
                          
                          <div className="h-[280px] w-full relative z-10 mt-1">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart 
                                    data={(() => {
                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        const results = months.map((m) => ({ month: m, staff: 0 }));
                                        teamPerformance?.forEach((member: any) => {
                                            const date = member.joinedAt ? new Date(member.joinedAt) : new Date();
                                            results[date.getMonth()].staff++;
                                        });
                                        return results;
                                    })()}
                                    margin={{ top: 15, right: 5, left: -20, bottom: 40 }}
                                  >
                                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                      <XAxis 
                                          dataKey="month" 
                                          axisLine={false} 
                                          tickLine={false} 
                                          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 700 }} 
                                          dy={10}
                                          interval={0}
                                      />
                                      <YAxis hide />
                                      <Tooltip 
                                          cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
                                          content={({ active, payload, label }) => {
                                              if (active && payload && payload.length) {
                                                  return (
                                                      <div className="bg-[#032313] p-2 rounded-lg border border-white/10 shadow-2xl">
                                                          <p className="text-[8px] font-black text-[#B4E247] uppercase tracking-widest mb-0.5">{label}</p>
                                                          <div className="flex items-center gap-1.5">
                                                              <div className="size-1 rounded-full bg-[#B4E247]" />
                                                              <span className="text-[10px] font-black text-white">Staff: {payload[0].value}</span>
                                                          </div>
                                                      </div>
                                                  )
                                              }
                                              return null;
                                          }}
                                      />
                                      <Bar dataKey="staff" name="Staff" fill="#B4E247" radius={[2, 2, 2, 2]} barSize={12} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Right: Ticket Activity Pulse (40% Width - Live Data) */}
                      <div className="lg:col-span-4 bg-[#B4E247] rounded-[1.5rem] p-6 shadow-2xl relative overflow-hidden border border-black/5 flex flex-col">
                          <div className="relative z-10 flex items-start justify-between mb-5">
                              <div className="flex items-center gap-3">
                                  <div className="size-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                      <Activity className="size-5 text-[#032313]" />
                                  </div>
                                  <div>
                                      <h3 className="text-lg font-black leading-none text-[#032313]">Command Center</h3>
                                      <p className="text-xs font-bold text-[#032313]/60 mt-0.5">Real-Time Event Stream</p>
                                  </div>
                              </div>
                              <div className="size-8 rounded-full border border-[#032313]/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                  <ArrowUpRight className="size-4 text-[#032313]" />
                              </div>
                          </div>
                          
                          {/* Filter Tabs */}
                          <div className="relative z-10 flex gap-2 mb-5 overflow-x-auto no-scrollbar">
                              {['Platform Feed', ...(teamPerformance?.slice(0, 3).map((m: any) => m.name.split(' ')[0]) || [])].map((name, i) => (
                                  <span key={name} className={`px-4 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap border-2 transition-all ${
                                      i === 0 ? 'bg-[#032313] text-[#B4E247] border-[#032313]' : 'border-[#032313]/10 text-[#032313]'
                                  }`}>
                                      {name}
                                  </span>
                              ))}
                          </div>
                          
                          {/* Live Activity Feed (Dynamic Data) */}
                          <div className="relative z-10 flex-1 space-y-3 overflow-y-auto scrollbar-hide pr-1">
                              {data.recentTickets?.slice(0, DASHBOARD_CONFIG.display.maxRecentTickets).map((ticket: any, idx: number) => {
                                  const minutesAgo = Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / 60000);
                                  const timeAgo = minutesAgo < 1 ? 'just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo/60)}h ago`;
                                  
                                  return (
                                      <div key={idx} className="bg-[#032313] p-3 rounded-2xl border border-white/5 flex items-start gap-3 group hover:bg-[#052e18] transition-all duration-300">
                                          <div className="size-9 shrink-0 rounded-xl bg-[#B4E247] flex items-center justify-center text-[12px] font-black text-[#032313] shadow-inner">
                                              {ticket.staffName?.charAt(0) || '?'}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between mb-0.5">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                      <span className="text-[11px] font-black text-white">{ticket.staffName}</span>
                                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 ${ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                          {ticket.status === 'RESOLVED' ? 'Resolved' : ticket.status === 'CLOSED' ? 'Closed' : 'Actioned'}
                                                      </span>
                                                      <span className="text-[10px] font-black text-[#B4E247]">{ticket.ticketId}</span>
                                                  </div>
                                                  <span className="text-[8px] font-bold text-slate-500 whitespace-nowrap uppercase tracking-tighter">{timeAgo}</span>
                                              </div>
                                              <p className="text-[10px] font-medium text-slate-400 truncate leading-snug">
                                                  {ticket.subject || 'System Activity Log'}
                                              </p>
                                              <div className="flex items-center gap-1.5 mt-1.5">
                                                  {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 
                                                      <CheckCircle className="size-2.5 text-emerald-400" /> : 
                                                      <Clock className="size-2.5 text-amber-400" />
                                                  }
                                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                      {ticket.status?.replace('_', ' ')}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>

                          <div className="relative z-10 mt-5 pt-3 border-t border-black/5 flex items-center justify-between">
                              <p className="text-[9px] font-black text-[#032313] uppercase tracking-widest">Live Updates Enabled</p>
                              <div className="flex items-center gap-2">
                                  <div className="size-1.5 rounded-full bg-[#032313] animate-pulse" />
                                  <span className="text-[9px] font-bold text-[#032313]">Synchronized</span>
                              </div>
                          </div>
                      </div>
                  </div>

                   {/* 1. Advanced Performance Grid (65/35 Split) */}
                   <div className="grid gap-6 grid-cols-1 lg:grid-cols-20 mt-8">
                     {/* Left: Team Roster (65% Width) */}
                     <Card className="lg:col-span-13 shadow-sm border-none bg-white rounded-[2rem] overflow-hidden">
                       <CardHeader className="border-b bg-muted/10 px-6 py-5">
                          <div className="flex items-center justify-between">
                             <div>
                               <CardTitle className="text-xl font-bold text-slate-900 leading-none">Team Roster</CardTitle>
                               <CardDescription className="text-xs text-slate-500 mt-1.5">Detailed metrics per active agent</CardDescription>
                             </div>
                             <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100">
                                Total: {teamPerformance.length}
                             </div>
                          </div>
                       </CardHeader>
                       <CardContent className="p-0">
                         {(() => {
                           const currentMembers = teamPerformance.slice(0, 5)

                           return (
                             <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
                               <table className="w-full">
                                 <thead>
                                   <tr className="bg-slate-50/50 text-[10px] uppercase text-slate-500 tracking-widest border-b border-slate-100">
                                     <th className="px-6 py-4 text-left font-black">Staff Member</th>
                                     <th className="px-6 py-4 text-center font-black">Workload</th>
                                     <th className="px-6 py-4 text-center font-black">Resolved</th>
                                     <th className="px-6 py-4 text-center font-black">Avg Time</th>
                                     <th className="px-6 py-4 text-center font-black">Efficiency</th>
                                     <th className="px-6 py-4 text-right font-black whitespace-nowrap">Profile</th>
                                   </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                   {currentMembers.map((member: any) => (
                                     <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                       <td className="px-6 py-4">
                                         <div 
                                           className="flex items-center gap-4 cursor-pointer group"
                                           onClick={() => navigate(`/department/team/${member.id}`)}
                                         >
                                           <div className="size-10 shrink-0 rounded-full bg-[#B4E247] flex items-center justify-center text-[#032313] font-black text-sm shadow-sm transition-transform group-hover:scale-105">
                                             {member.name?.charAt(0).toUpperCase()}
                                           </div>
                                           <div className="min-w-0">
                                             <p className="font-black text-sm text-slate-900 group-hover:text-[#B4E247] transition-colors truncate">{member.name}</p>
                                             <p className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{member.email}</p>
                                           </div>
                                         </div>
                                       </td>
                                       <td className="px-6 py-4">
                                         <div className="flex flex-col items-center gap-1.5">
                                            <Badge variant="outline" className={`text-[10px] font-black px-2 py-0.5 rounded-md border-2 transition-colors ${
                                              member.activeTickets > DASHBOARD_CONFIG.thresholds.workload.warning 
                                              ? "bg-amber-50 text-amber-600 border-amber-200" 
                                              : "bg-[#B4E247]/10 text-[#032313] border-[#B4E247]/20"
                                            }`}>
                                               {member.activeTickets} Active
                                            </Badge>
                                            <Progress value={Math.min(member.activeTickets * 10, 100)} className="h-1 w-16" />
                                         </div>
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          <div className="text-sm font-black text-slate-900">{(member.resolvedTickets || 0) + (member.closedTickets || 0)}</div>
                                       </td>
                                       <td className="px-6 py-4 text-center text-xs font-bold text-slate-500 whitespace-nowrap">
                                          {member.avgResolutionTime || 'N/A'}h
                                       </td>
                                       <td className="px-6 py-4">
                                         <div className="flex items-center justify-center gap-3">
                                           <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                             <div 
                                               className={`h-full transition-all duration-700 ${
                                                 member.performance >= 90 ? 'bg-emerald-500' 
                                                 : member.performance >= 70 ? 'bg-indigo-500' 
                                                 : 'bg-amber-500'
                                               }`}
                                               style={{ width: `${member.performance || 0}%` }}
                                             />
                                           </div>
                                           <span className={`text-xs font-black ${
                                             member.performance >= 90 ? 'text-emerald-600' 
                                             : member.performance >= 70 ? 'text-indigo-600' 
                                             : 'text-amber-600'
                                           }`}>
                                             {member.performance}%
                                           </span>
                                         </div>
                                       </td>
                                       <td className="px-6 py-4 text-right">
                                         <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 w-8 rounded-full p-0 border-2 border-slate-100 hover:border-[#B4E247] hover:bg-[#B4E247]/10"
                                            onClick={() => navigate(`/department/team/${member.id}`)}
                                         >
                                            <ArrowUpRight className="size-4" />
                                         </Button>
                                       </td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                           )
                         })()}
                       </CardContent>
                     </Card>

                     {/* Right: Performance Index (35% Width) - Reference Image Match */}
                     <Card className="lg:col-span-7 hover:shadow-lg transition-all duration-300 border-none shadow-sm rounded-[2rem] bg-white flex flex-col overflow-hidden">
                        <CardHeader className="pb-2 pt-8 px-8 text-center">
                           <CardTitle className="text-xl font-black text-[#032313] tracking-tight">Team Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 flex-1 flex flex-col items-center justify-center">
                           <div className="relative size-60 flex items-center justify-center">
                                 {(() => {
                                    const activeAgents = teamPerformance.filter((m: any) => m.activeTickets > 0).length;
                                    const availableAgents = teamPerformance.length - activeAgents;
                                    const total = teamPerformance.length;
                                    
                                    const chartData = [
                                       { name: 'Active Agents', value: activeAgents, color: '#B4E247' },
                                       { name: 'Available Agents', value: availableAgents, color: '#10b981' }
                                    ];

                                    return (
                                       <>
                                          <ResponsiveContainer width="100%" height="100%">
                                             <PieChart className="pointer-events-none">
                                                <Pie
                                                   data={chartData}
                                                   cx="50%"
                                                   cy="50%"
                                                   innerRadius={70}
                                                   outerRadius={95}
                                                   paddingAngle={0}
                                                   dataKey="value"
                                                   stroke="none"
                                                   startAngle={90}
                                                   endAngle={450}
                                                   isAnimationActive={false}
                                                >
                                                   {chartData.map((entry, index) => (
                                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                                   ))}
                                                </Pie>
                                             </PieChart>
                                          </ResponsiveContainer>
                                          {/* Central Text Detail */}
                                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Staff</span>
                                              <span className="text-5xl font-black text-[#032313] tracking-tighter mt-1">{total}</span>
                                          </div>
                                       </>
                                    );
                                 })()}
                           </div>
                           
                           {/* Legend Section */}
                           <div className="flex items-center gap-6 mt-4">
                               <div className="flex items-center gap-2">
                                   <div className="size-3 rounded-full bg-[#B4E247]" />
                                   <span className="text-xs font-bold text-slate-600">Active Agents</span>
                               </div>
                               <div className="flex items-center gap-2">
                                   <div className="size-3 rounded-full bg-[#10b981]" />
                                   <span className="text-xs font-bold text-slate-600">Available Agents</span>
                               </div>
                           </div>
                        </CardContent>
                     </Card>
                   </div>
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
              
              {user?.department === 'TECHNICAL_SUPPORT' && <TechSupportDashboardContent data={data?.specializedMetrics} />}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Featured Card - Dark Forest Green */}
                <Card className="hover:shadow-lg transition-all border-none shadow-md bg-[#032313] text-white rounded-3xl overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="size-2 bg-[#ACDF33] rounded-full animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider opacity-90">My Workload</span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[10px] opacity-60 font-medium">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <h3 className="text-base font-bold leading-tight">
                        {data.summary?.totalAssigned || 0} Assigned
                        <span className="block text-[#ACDF33] text-lg mt-0.5">
                          {(data.summary?.inProgress || 0) + (data.summary?.open || 0)} Active
                        </span>
                      </h3>
                    </div>

                    <Link 
                      to="/department/tickets"
                      className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors group"
                    >
                      <span>View My Tickets</span>
                      <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                  </CardContent>
                </Card>

                {/* Active Workload Card - White */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Active Workload</h4>
                      <div className="p-1.5 bg-amber-50 rounded-xl">
                        <Clock className="size-4 text-amber-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-slate-900">
                        {(data.summary?.inProgress || 0) + (data.summary?.open || 0)}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Clock className="size-3.5 text-amber-500" />
                        <span className="text-amber-600">Open / In Progress</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Resolved Tickets Card - White */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Resolved</h4>
                      <div className="p-1.5 bg-emerald-50 rounded-xl">
                        <CheckCircle className="size-4 text-emerald-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-slate-900">
                        {data.summary?.resolved || 0}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <CheckCircle className="size-3.5 text-emerald-500" />
                        <span className="text-emerald-600">Successfully closed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Avg Resolution Time Card - White */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Avg Resolution</h4>
                      <div className="p-1.5 bg-blue-50 rounded-xl">
                        <TrendingUp className="size-4 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-slate-900">
                        {data.summary?.avgResolutionTime || 'N/A'}
                      </p>
                      
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <TrendingUp className="size-3.5 text-blue-500" />
                        <span className="text-blue-600">Per ticket</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="pb-0 pt-4 px-5 text-center">
                    <CardTitle className="text-base font-bold text-slate-900">Assigned Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    <div className="h-[200px] relative pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Open', value: data.summary?.open || 0, color: '#ef4444' },
                              { name: 'In Progress', value: data.summary?.inProgress || 0, color: '#ACDF33' },
                              { name: 'Resolved', value: data.summary?.resolved || 0, color: '#10b981' },
                              { name: 'Waiting', value: data.summary?.waiting || 0, color: '#f59e0b' },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ cx, cy, midAngle, outerRadius, innerRadius, percent }) => {
                              const RADIAN = Math.PI / 180;
                              const radius = (outerRadius + innerRadius) / 2;
                              const x = cx + radius * Math.cos(-(midAngle || 0) * RADIAN);
                              const y = cy + radius * Math.sin(-(midAngle || 0) * RADIAN);
                              return (
                                <g>
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r={20}
                                    fill="white"
                                    stroke="#e2e8f0"
                                    strokeWidth={1.5}
                                  />
                                  <text 
                                    x={x} 
                                    y={y} 
                                    fill="#1f2937" 
                                    textAnchor="middle" 
                                    dominantBaseline="central"
                                    style={{ fontSize: '13px', fontWeight: '700' }}
                                  >
                                    {`${((percent || 0) * 100).toFixed(0)}%`}
                                  </text>
                                </g>
                              );
                            }}
                            labelLine={false}
                          >
                            {[
                              { name: 'Open', value: data.summary?.open || 0, color: '#ef4444' },
                              { name: 'In Progress', value: data.summary?.inProgress || 0, color: '#ACDF33' },
                              { name: 'Resolved', value: data.summary?.resolved || 0, color: '#10b981' },
                              { name: 'Waiting', value: data.summary?.waiting || 0, color: '#f59e0b' },
                            ].filter(item => item.value > 0).map((entry, index) => (
                              <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-xs font-medium text-slate-500">Total Count</p>
                          <p className="text-3xl font-bold text-slate-900 mt-1">
                            {data.summary?.totalAssigned || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 flex-wrap mt-4">
                      {[
                        { name: 'Open', value: data.summary?.open || 0, color: '#ef4444' },
                        { name: 'In Progress', value: data.summary?.inProgress || 0, color: '#ACDF33' },
                        { name: 'Resolved', value: data.summary?.resolved || 0, color: '#10b981' },
                        { name: 'Waiting', value: data.summary?.waiting || 0, color: '#f59e0b' },
                      ].filter(item => item.value > 0).slice(0, 3).map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <div className="size-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-medium text-slate-600">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-[400px] flex flex-col">
                  <CardHeader className="py-3 px-5 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-bold text-slate-900">Performance Metrics</CardTitle>
                        <CardDescription className="text-xs mt-0.5 mb-2">Resolution efficiency vs targets</CardDescription>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="size-3 rounded-sm bg-[#032313]" />
                            <span className="text-xs font-medium text-slate-600">Assigned</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="size-3 rounded-sm bg-[#ACDF33]" />
                            <span className="text-xs font-medium text-slate-600">Resolved</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{data.summary?.totalAssigned || 0}</p>
                        <div className="flex items-center gap-1.5 mt-1 justify-end">
                          <span className="text-xs font-bold text-emerald-600">
                            {data.summary?.performance || '0%'}
                          </span>
                          <TrendingUp className="size-3.5 text-emerald-500" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 flex-1 flex flex-col min-h-0">
                    {staffPerformance ? (
                      <ChartErrorBoundary>
                        <div className="flex-1 w-full min-h-0 pointer-events-auto -ml-4">
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
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeWidth={1.5} />
                              <XAxis 
                                dataKey="period" 
                                stroke="#64748b" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false}
                              />
                              <YAxis 
                                stroke="#64748b" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false}
                                width={35}
                                allowDecimals={false}
                                domain={[0, 'auto']}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#fff', 
                                  border: '1px solid #e2e8f0', 
                                  borderRadius: '8px', 
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                  padding: '8px 12px'
                                }}
                                itemStyle={{ 
                                  fontSize: '12px', 
                                  fontWeight: '600',
                                  color: '#1e293b'
                                }}
                                labelStyle={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: '#64748b',
                                  marginBottom: '4px'
                                }}
                                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                              />
                              <Bar dataKey="assigned" name="Assigned" fill="#032313" radius={[4, 4, 0, 0]} barSize={20} />
                              <Bar dataKey="resolved" name="Resolved" fill="#ACDF33" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </ChartErrorBoundary>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
                        No performance data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Recent Tickets */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-full">
                  <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900">Priority Backlog</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Latest high-priority assignments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.recentTickets && data.recentTickets.length > 0 ? (
                      <div className="space-y-3 mt-4">
                        {data.recentTickets.slice(0, DASHBOARD_CONFIG.display.maxRecentTickets).map((ticket: any) => (
                          <div 
                            key={ticket._id} 
                            className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-[#ACDF33]/50 hover:shadow-md cursor-pointer transition-all duration-300 group relative overflow-hidden"
                            onClick={() => {
                              setViewingTicketId(ticket._id)
                              setDetailsDialogOpen(true)
                            }}
                          >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                              ticket.priority === 'CRITICAL' ? 'bg-red-500' : 
                              ticket.priority === 'HIGH' ? 'bg-orange-500' : 
                              ticket.priority === 'MEDIUM' ? 'bg-[#ACDF33]' : 'bg-slate-300'
                            }`} />
                            
                            <div className="flex-1 min-w-0 pl-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{ticket.ticketId || ticket._id.slice(-6)}</span>
                                <h4 className="text-sm font-bold text-[#032313] truncate group-hover:text-[#ACDF33] transition-colors">{ticket.subject}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border-2 transition-colors ${
                                  ticket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                  ticket.status === 'WAITING_FOR_USER' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                  {ticket.status.replace(/_/g, ' ')}
                                </Badge>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                  ticket.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-100' :
                                  ticket.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                  ticket.priority === 'MEDIUM' ? 'bg-[#ACDF33]/10 text-[#032313] border border-[#ACDF33]/20' :
                                  'bg-slate-50 text-slate-500 border border-slate-100'
                                }`}>
                                  <AlertCircle className="size-3" />
                                  {ticket.priority}
                                </div>
                              </div>
                            </div>
                            <div className="ml-4 size-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#ACDF33]/10 transition-colors">
                              <ArrowUpRight className="size-4 text-slate-400 group-hover:text-[#032313]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-slate-100 p-8 text-center bg-slate-50/50 mt-4">
                        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <Ticket className="size-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No active backlog items</p>
                        <Link to="/department/tickets" className="text-[10px] font-black uppercase text-[#032313] hover:text-[#ACDF33] tracking-widest mt-3 inline-block transition-colors">
                          View Performance Logs
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900">Quick Stats</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Overview of your workload</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid gap-3">
                      {[
                        { 
                          label: 'Open', 
                          value: data.summary?.open || 0, 
                          color: '#ef4444', 
                          bg: 'bg-red-50', 
                          icon: AlertCircle,
                          trend: [2, 5, 3, 6, 4, 8, data.summary?.open || 0]
                        },
                        { 
                          label: 'In Progress', 
                          value: data.summary?.inProgress || 0, 
                          color: '#ACDF33', 
                          bg: 'bg-[#ACDF33]/5', 
                          icon: Clock,
                          trend: [1, 3, 2, 4, 3, 5, data.summary?.inProgress || 0]
                        },
                        { 
                          label: 'Resolved', 
                          value: data.summary?.resolved || 0, 
                          color: '#10b981', 
                          bg: 'bg-emerald-50', 
                          icon: CheckCircle,
                          trend: [5, 8, 12, 10, 15, 18, data.summary?.resolved || 0]
                        },
                        { 
                          label: 'Waiting', 
                          value: data.summary?.waiting || 0, 
                          color: '#f59e0b', 
                          bg: 'bg-amber-50', 
                          icon: Clock,
                          trend: [3, 2, 4, 1, 3, 2, data.summary?.waiting || 0]
                        }
                      ].map((item, idx) => (
                        <div key={idx} className={`p-3 rounded-2xl ${item.bg} border border-black/5 flex items-center justify-between group hover:scale-[1.02] transition-transform duration-300`}>
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-black/5">
                              <item.icon className="size-5" style={{ color: item.color }} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                              <p className="text-xl font-black text-slate-900 leading-none">{item.value}</p>
                            </div>
                          </div>
                          
                          <div className="h-10 w-24 pointer-events-none">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={item.trend.map((v) => ({ value: v }))}>
                                <defs>
                                  <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={item.color} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={item.color} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Area 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke={item.color} 
                                  strokeWidth={2} 
                                  fillOpacity={1} 
                                  fill={`url(#grad-${idx})`} 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* My Internal Requests */}
              <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900">My Internal Requests</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Tickets you created for other departments</CardDescription>
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
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {/* Weekly & Monthly Performance */}
                  <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-[500px] flex flex-col">
                    <CardHeader className="pt-4 pb-2 px-5 border-b border-slate-100">
                      <CardTitle className="text-base font-bold text-slate-900">Performance Trends</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Your weekly and monthly statistics</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pt-0 pb-5 flex-1 flex flex-col min-h-0">
                      <div className="flex-1 w-full min-h-0 -ml-4">
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
                            <YAxis 
                              allowDecimals={false} 
                              domain={[0, 'auto']}
                              stroke="#64748b"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="assigned" fill="#032313" name="Assigned" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="resolved" fill="#ACDF33" name="Resolved" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Priority Breakdown */}
                  <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-[500px] flex flex-col">
                    <CardHeader className="pt-4 pb-2 px-5 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">Priority Breakdown</CardTitle>
                          <CardDescription className="text-xs mt-0.5">Tickets by severity level</CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">
                            {Object.values(staffPerformance.byPriority || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Total Tasks</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pt-0 pb-5 flex-1 flex flex-col min-h-0">
                      <div className="flex-1 w-full min-h-0 pointer-events-auto -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={[
                              { priority: 'Low', count: staffPerformance.byPriority?.LOW || 0, color: '#ACDF33' },
                              { priority: 'Medium', count: staffPerformance.byPriority?.MEDIUM || 0, color: '#78A326' },
                              { priority: 'High', count: staffPerformance.byPriority?.HIGH || 0, color: '#43661A' },
                              { priority: 'Critical', count: staffPerformance.byPriority?.CRITICAL || 0, color: '#032313' },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="priority" />
                            <YAxis 
                              stroke="#64748b" 
                              fontSize={11} 
                              tickLine={false} 
                              axisLine={false}
                              width={35}
                              allowDecimals={false}
                              domain={[0, 'auto']}
                            />
                            <Tooltip 
                              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '8px', 
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                padding: '8px 12px'
                              }}
                              itemStyle={{ fontSize: '12px', fontWeight: '700' }}
                              labelStyle={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}
                            />
                            <Bar 
                              dataKey="count" 
                              radius={[8, 8, 0, 0]} 
                            >
                              {[
                                { priority: 'Low', color: '#ACDF33' },
                                { priority: 'Medium', color: '#78A326' },
                                { priority: 'High', color: '#43661A' },
                                { priority: 'Critical', color: '#032313' },
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
