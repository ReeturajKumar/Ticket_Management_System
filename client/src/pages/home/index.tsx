import { useState, useEffect } from "react"
import { StudentLayout } from "@/components/layout/StudentLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getStudentDashboardStats, getStudentMonthlyStats, getStudentDepartmentStats } from "@/services/dashboardService"
import { Link } from "react-router-dom"
import { Ticket, User, Shield, TrendingUp, Clock, CheckCircle, Loader2, BarChart3, PieChart as PieChartIcon, ExternalLink, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList
} from "recharts"



export default function HomePage() {
  const [user] = useState(getCurrentUser())
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    inProgressTickets: 0,
    closedTickets: 0,
    reopenedTickets: 0,
    pendingResponse: 0,
  })
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [statusDistribution, setStatusDistribution] = useState<any[]>([])
  const [departmentStats, setDepartmentStats] = useState<any[]>([])
  const [recentTickets, setRecentTickets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, monthlyRes, deptRes] = await Promise.all([
          getStudentDashboardStats(),
          getStudentMonthlyStats(),
          getStudentDepartmentStats()
        ])

        // Process Overview Stats
        if (overviewRes.data) {
          if (overviewRes.data.summary) {
            setStats({
              totalTickets: overviewRes.data.summary.totalTickets,
              openTickets: overviewRes.data.summary.openTickets,
              resolvedTickets: overviewRes.data.summary.resolvedTickets,
              inProgressTickets: overviewRes.data.summary.inProgressTickets,
              closedTickets: overviewRes.data.summary.closedTickets,
              reopenedTickets: overviewRes.data.summary.reopenedTickets,
              pendingResponse: overviewRes.data.summary.openTickets
            })

            // Create Status Distribution Data for Pie Chart
            const summary = overviewRes.data.summary
            const distData = [
              { name: 'Open', value: summary.openTickets },
              { name: 'In Progress', value: summary.inProgressTickets },
              { name: 'Resolved', value: summary.resolvedTickets },
              { name: 'Closed', value: summary.closedTickets },
              { name: 'Reopened', value: summary.reopenedTickets },
            ].filter(item => item.value > 0)
            
            setStatusDistribution(distData)
          }
          
          if (overviewRes.data.recentTickets) {
            setRecentTickets(overviewRes.data.recentTickets)
          }
        }

        // Process Monthly Stats for Area Chart
        if (monthlyRes.data?.monthly) {
          setMonthlyStats(monthlyRes.data.monthly)
        }

        // Process Department Stats
        if (deptRes.data?.departments) {
          setDepartmentStats(deptRes.data.departments)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8 select-none">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
            <div className="space-y-1.5">
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return "Good Morning,";
                  if (hour < 18) return "Good Afternoon,";
                  return "Good Evening,";
                })()} {user?.name?.split(' ')[0]}! 
              </h2>
              <p className="text-muted-foreground font-medium">
                Here's what's happening with your tickets today, {format(new Date(), "EEEE, MMM d, yyyy")}.
              </p>
            </div>

            <div className="flex items-center">
               <Link to="/tickets/new">
                 <Button size="lg" className="rounded-xl shadow-sm hover:shadow-md transition-all font-semibold">
                   <Plus className="mr-2 size-5" />
                   Create New Ticket
                 </Button>
               </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <Ticket className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.totalTickets}
                </div>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <Clock className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.openTickets}
                </div>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Pending action
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <TrendingUp className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.inProgressTickets}
                </div>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Avg processing time: 24h
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.resolvedTickets}
                </div>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Successfully closed
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed</CardTitle>
                <CheckCircle className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.closedTickets}
                </div>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Finalized
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reopened</CardTitle>
                <Clock className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.reopenedTickets}
                </div>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Needs attention
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

            {/* Dashboard Main Charts Section */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
              {/* Monthly Activity Chart (Area) - Occupies 4 columns on desktop */}
              <Card className="shadow-sm border-muted/60 lg:col-span-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="size-5 text-primary" />
                    Monthly Activity
                  </CardTitle>
                  <CardDescription>
                    Overview of ticket volume over the last 6 months.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full min-w-0">
                    {isLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : monthlyStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyStats}
                          margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                          }}
                        >
                          <defs>
                            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            </linearGradient>
                            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                            </linearGradient>
                          </defs>
                          <XAxis 
                            dataKey="month" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => {
                              const date = new Date(value + '-01');
                              return date.toLocaleDateString('en-US', { month: 'short' });
                            }}
                            dy={10}
                           />
                           <YAxis 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            allowDecimals={false}
                           />
                           <Tooltip
                              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="rounded-lg border bg-popover p-3 shadow-md ring-1 ring-black/5">
                                      <div className="mb-2 border-b border-border/50 pb-2 text-sm font-semibold text-foreground">
                                         {new Date(label + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                      </div>
                                      <div className="flex flex-col gap-1.5">
                                        {payload.map((entry: any, index: number) => (
                                          <div key={index} className="flex items-center justify-between gap-8 text-xs">
                                            <div className="flex items-center gap-2">
                                              <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                              <span className="text-muted-foreground font-medium">{entry.name}</span>
                                            </div>
                                            <span className="font-bold text-foreground font-mono">{entry.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              }}
                           />
                           <Legend 
                              verticalAlign="top" 
                              align="right"
                              iconType="circle" 
                              fontSize={12} 
                              height={36}
                              content={({ payload }) => (
                                <div className="flex justify-end gap-4 pb-2">
                                  {payload?.map((entry: any, index: number) => (
                                    <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span>{entry.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                           />
                           <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No activity data available
                      </div>
                    )}
                  </div>


                </CardContent>
              </Card>

              {/* Status Distribution Chart (Pie) - Occupies 3 columns on desktop */}
              <Card className="shadow-sm border-muted/60 lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="size-5 text-primary" />
                  Status Distribution
                </CardTitle>
                <CardDescription>
                  Current breakdown of your tickets by status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => {
                             // Custom colors map for statuses
                             let color = '#94a3b8'; // default slate-400
                             if (entry.name === 'Open') color = '#3b82f6'; // blue-500
                             if (entry.name === 'In Progress') color = '#f59e0b'; // amber-500
                             if (entry.name === 'Resolved') color = '#10b981'; // emerald-500
                             if (entry.name === 'Closed') color = '#64748b'; // slate-500
                             if (entry.name === 'Reopened') color = '#ef4444'; // red-500
                             
                             return <Cell key={`cell-${index}`} fill={color} strokeWidth={0} />
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            borderColor: 'hsl(var(--border))', 
                            borderRadius: 'var(--radius)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          itemStyle={{ color: 'hsl(var(--popover-foreground))', fontSize: '0.875rem' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36} 
                          iconType="circle"
                          formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No tickets to display
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Insights Section */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
             <Card className="shadow-sm border-muted/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-5 text-primary" />
                  Department Breakdown
                </CardTitle>
                <CardDescription>
                  See which departments handle your tickets most frequently.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  {isLoading ? (
                     <div className="flex h-full items-center justify-center">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : departmentStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={departmentStats}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        barSize={32}
                      >
                         <XAxis type="number" hide />
                         <YAxis 
                          dataKey="department" 
                          type="category" 
                          width={100}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                          axisLine={false}
                          tickLine={false}
                         />
                         <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-popover p-2 shadow-md ring-1 ring-black/5">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="size-2 rounded-full" 
                                        style={{ backgroundColor: payload[0].payload.fill }} 
                                      />
                                      <span className="font-semibold text-foreground">
                                        {label}:
                                      </span>
                                      <span className="font-mono font-bold text-foreground">
                                        {payload[0].value}
                                      </span>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                         />
                         <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                            {departmentStats.map((entry: any, index: number) => {
                              let color = '#3b82f6'; // Default
                              if (entry.department === 'PLACEMENT') color = '#3b82f6';
                              if (entry.department === 'OPERATIONS') color = '#f59e0b';
                              if (entry.department === 'TRAINING') color = '#10b981';
                              if (entry.department === 'FINANCE') color = '#6366f1';
                              
                              // Pass color to payload for tooltip
                              entry.fill = color;
                              
                              return <Cell key={`cell-${index}`} fill={color} strokeWidth={0} />
                            })}
                            <LabelList 
                              dataKey="total" 
                              position="right" 
                              className="fill-foreground text-xs font-bold" 
                              formatter={(value: any) => value > 0 ? value : ''}
                            />
                         </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                       No department data available
                    </div>
                  )}
                </div>
              </CardContent>
             </Card>

             <Card className="shadow-sm border-muted/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  Monthly Trends
                </CardTitle>
                <CardDescription>
                  Ticket volume trends by department over time.
                </CardDescription>
              </CardHeader>
              <CardContent>

                <div className="h-[300px] w-full min-w-0">
                  {isLoading ? (
                     <div className="flex h-full items-center justify-center">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : monthlyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyStats}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        barSize={32}
                      >
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.1} />
                         <XAxis 
                          dataKey="month" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => {
                            const date = new Date(value + '-01');
                            return date.toLocaleDateString('en-US', { month: 'short' });
                          }}
                          dy={10}
                         />
                         <YAxis 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          allowDecimals={false}
                         />
                         <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-popover p-3 shadow-md ring-1 ring-black/5">
                                    <div className="mb-2 border-b border-border/50 pb-2 text-sm font-semibold text-foreground">
                                       {new Date(label + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      {payload.map((entry: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between gap-8 text-xs">
                                          <div className="flex items-center gap-2">
                                            <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-muted-foreground font-medium">{entry.name}</span>
                                          </div>
                                          <span className="font-bold text-foreground font-mono">{entry.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                         />
                         <Legend 
                            verticalAlign="bottom" 
                            height={60}
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '12px' }}
                            formatter={(value) => <span className="text-xs text-muted-foreground font-medium">{value}</span>}
                         />
                         <Bar dataKey="byDepartment.PLACEMENT" name="Placement" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                         <Bar dataKey="byDepartment.OPERATIONS" name="Operations" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                         <Bar dataKey="byDepartment.TRAINING" name="Training" fill="#10b981" radius={[4, 4, 0, 0]} />
                         <Bar dataKey="byDepartment.FINANCE" name="Finance" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                       No trend data available
                    </div>
                  )}
                </div>
              </CardContent>
             </Card>
          </div>

          {/* Recent Tickets Section */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Recent Tickets</CardTitle>
                <CardDescription>
                  Your latest 6 tickets across all departments.
                </CardDescription>
              </div>
              <Link to="/tickets">
                <Button variant="outline" size="sm" className="gap-2">
                  View All <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : recentTickets.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recentTickets.map((ticket: any) => (
                      <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="block h-full">
                        <div className="flex h-full flex-col justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="outline"
                                className={
                                  ticket.status === 'OPEN' ? "bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white border-transparent" :
                                  ticket.status === 'IN_PROGRESS' ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent" :
                                  ticket.status === 'RESOLVED' ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" :
                                  ticket.status === 'REOPENED' ? "bg-red-500 hover:bg-red-600 text-white border-transparent" :
                                  ""
                                }
                              >
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <h4 className="font-semibold line-clamp-1" title={ticket.subject}>
                              {ticket.subject}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {ticket.department} • {ticket.priority}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No recent tickets found.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Fast access to common tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <Link to="/tickets/new">
                  <Button className="h-24 w-full cursor-pointer flex-col gap-2 hover:bg-accent hover:text-accent-foreground" variant="outline">
                    <Ticket className="size-6 text-primary" />
                    <span className="font-semibold">Create New Ticket</span>
                  </Button>
                </Link>
                <Link to="/tickets">
                  <Button className="h-24 w-full cursor-pointer flex-col gap-2 hover:bg-accent hover:text-accent-foreground" variant="outline">
                    <User className="size-6 text-primary" />
                    <span className="font-semibold">View My Tickets</span>
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button className="h-24 w-full cursor-pointer flex-col gap-2 hover:bg-accent hover:text-accent-foreground" variant="outline">
                    <Shield className="size-6 text-primary" />
                    <span className="font-semibold">Account Settings</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  )
}
