import { useState, useEffect, useCallback } from "react"
import { 
  Ticket, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { EmployeeLayout } from "@/components/layout/EmployeeLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CreateEmployeeTicketDialog } from "@/components/employee/CreateEmployeeTicketDialog"
import { EmployeeTicketDetailsDialog } from "@/components/employee/EmployeeTicketDetailsDialog"
import { employeeService } from "@/services/employeeService"
import { toast } from "react-toastify"
import { useSocketConnection, useRealTimeTickets } from "@/hooks/useSocket"
import { useDebouncedCallback } from "@/hooks/useDebounce"
import { useNavigate } from "react-router-dom"

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  // Initialize socket connection for real-time updates
  // Only connect if user is available and not already connected
  useSocketConnection({ autoConnect: true })

  const fetchDashboardData = useCallback(async () => {
    console.log('🔄 Employee Dashboard: Fetching dashboard data...')
    try {
      setIsLoading(true) 
      const response = await employeeService.getDashboardStats()
      if (response.success) {
        setDashboardData(response.data)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      toast.error("Failed to load dashboard statistics")
    } finally {
      setIsLoading(false) 
    }
  }, [])

  // Initial data fetch on mount
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Create debounced version to prevent multiple rapid API calls
  const { debouncedCallback: debouncedRefetch } = useDebouncedCallback(fetchDashboardData, 1000)

  // Listen for real-time ticket events that affect employee's own tickets
  useRealTimeTickets({
    showNotifications: false, 
    onTicketCreated: () => {
      console.log('👨‍💼 Employee Dashboard: Ticket created event - triggering debounced refetch')
      debouncedRefetch()
    },
    onTicketAssigned: () => {
      console.log('👨‍💼 Employee Dashboard: Ticket assigned event - triggering debounced refetch')
      debouncedRefetch()
    },
    onTicketStatusChanged: () => {
      console.log('👨‍💼 Employee Dashboard: Ticket status changed event - triggering debounced refetch')
      debouncedRefetch()
    },
    onTicketPriorityChanged: () => {
      console.log('👨‍💼 Employee Dashboard: Ticket priority changed event - triggering debounced refetch')
      debouncedRefetch()
    },
    onRefresh: () => {
      console.log('👨‍💼 Employee Dashboard: Generic refresh event - triggering debounced refetch')
      debouncedRefetch()
    },
  })

  const stats = dashboardData?.stats || { total: 0, resolved: 0, inProgress: 0, pending: 0 }
  const recentTickets = dashboardData?.recentTickets || []

  const statCards = [
    { title: "Total Tickets", count: stats.total, icon: Ticket, sub: `${stats.pending} Pending`, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Resolved", count: stats.resolved, icon: CheckCircle2, sub: "SLA Compliant", color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "In Progress", count: stats.inProgress, icon: Clock, sub: "Active load", color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Pending", count: stats.pending, icon: AlertCircle, sub: "Needs attention", color: "text-orange-600", bg: "bg-orange-50" },
  ]

  // Get time-based greeting
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

  return (
    <EmployeeLayout>
      {isLoading ? (
        <div className="flex h-[calc(100vh-100px)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 border-4 border-[#ACDF33] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500 animate-pulse uppercase tracking-[0.2em]">Syncing Workspace...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Good {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'Employee'} 👋
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-tight">
              Internal Employee • Operational Portal
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
              <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </div>
            <Button 
               size="sm" 
               className="bg-[#ACDF33] hover:bg-[#ACDF33]/90 text-[#032313] font-bold rounded-full px-5"
               onClick={() => navigate('/employee/tickets')}
            >
              View All Tickets
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
           {/* Featured Counter Card */}
           <Card className="hover:shadow-lg transition-all border-none shadow-md bg-[#032313] text-white rounded-2xl overflow-hidden">
              <CardContent className="p-3 space-y-1.5">
                 <div className="flex items-center gap-2">
                    <div className="size-2 bg-[#ACDF33] rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Daily Summary</span>
                 </div>
                 <div className="space-y-1">
                    <p className="text-2xl font-bold leading-tight">
                      {statCards[0].count}
                      <span className="block text-[#ACDF33] text-sm mt-0.5 font-medium">
                         {statCards[0].sub}
                      </span>
                    </p>
                 </div>
                 <Button variant="link" size="sm" className="text-white/60 hover:text-white p-0 h-auto text-xs font-bold group">
                    See Analytics <ArrowUpRight className="size-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                 </Button>
              </CardContent>
           </Card>

           {/* Standard Stat Cards */}
           {statCards.slice(1).map((card, i) => (
              <Card key={i} className="hover:shadow-lg transition-all border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
                 <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</h4>
                       <div className={cn("p-1.5 rounded-xl", card.bg)}>
                          <card.icon className={cn("size-4", card.color)} />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <p className="text-2xl font-bold text-slate-900">{card.count}</p>
                       <p className="text-[10px] text-slate-500 font-medium">{card.sub}</p>
                    </div>
                 </CardContent>
              </Card>
           ))}
        </div>

        {/* Main Sections */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            {/* Recent Tickets Column */}
            <div className="lg:col-span-7 space-y-1">
               <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-fit">
                  <CardHeader className="pt-2 pb-0 px-4 border-none flex flex-row items-center justify-between">
                     <div className="space-y-0">
                        <CardTitle className="text-[13px] font-bold text-slate-800">Recent Tickets</CardTitle>
                        <CardDescription className="text-[9px] text-slate-400">Latest 4 tickets</CardDescription>
                     </div>
                     <button
                        onClick={() => navigate("/employee/tickets")}
                        className="text-[#ACDF33] hover:text-[#ACDF33] hover:bg-[#ACDF33]/5 text-[10px] font-bold"   
                     >
                        View All
                     </button>
                  </CardHeader>
                  <CardContent className="p-0">
                     <div className="grid grid-cols-2 gap-2 p-1.5">
                        {recentTickets.length > 0 ? recentTickets.slice(0, 4).map((ticket: any) => (
                           <div 
                              key={ticket._id} 
                              onClick={() => {
                                 setSelectedTicketId(ticket._id)
                                 setDetailsDialogOpen(true)
                              }}
                              className="flex flex-col justify-between gap-2 p-2.5 border border-slate-100 rounded-xl hover:shadow-md hover:border-slate-200 transition-all duration-200 bg-white group h-full cursor-pointer"
                           >
                              <div className="flex items-start justify-between gap-2">
                                 <div className={cn(
                                    "size-7 rounded-lg flex items-center justify-center text-[10px] shrink-0",
                                    ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                 )}>
                                    {ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? <AlertCircle className="size-4" /> : <Ticket className="size-4" />}
                                 </div>
                                 <Badge variant="outline" className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 shrink-0",
                                    ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 
                                    ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                 )}>
                                    {ticket.status === 'PENDING' ? 'OPEN' : ticket.status.replace('_', ' ')}
                                 </Badge>
                              </div>
                              
                              <div className="space-y-1">
                                 <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-relaxed" title={ticket.subject}>
                                     {ticket.subject}
                                 </p>
                                 <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-50">
                                     <span>#{ticket._id.slice(-6).toUpperCase()}</span>
                                     <span className="text-slate-300">•</span>
                                     <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                 </div>
                              </div>
                           </div>
                        )) : (
                           <div className="col-span-full p-8 text-center space-y-3">
                              <Ticket className="size-8 text-slate-200 mx-auto mb-3" />
                              <p className="text-sm font-semibold text-slate-600">No recent tickets</p>
                              <p className="text-xs text-slate-400">Your submitted tickets will appear here</p>
                           </div>
                        )}
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* Right Column - Status/Activity */}
            <div className="lg:col-span-5 space-y-2">
               <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden h-fit bg-white">
                  <CardHeader className="pt-2 pb-0 text-center border-none">
                      <CardTitle className="text-sm font-bold text-slate-800">Total Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-1 pt-0 relative flex flex-col items-center justify-center">
                      <div className="h-[190px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart style={{ pointerEvents: 'none' }}>
                              <Pie
                                  data={[
                                    { name: 'Open', value: stats.pending, color: '#f59e0b' },
                                    { name: 'In Progress', value: stats.inProgress, color: '#84cc16' },
                                    { name: 'Resolved', value: stats.resolved, color: '#10b981' }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={65}
                                  outerRadius={85}
                                  paddingAngle={5}
                                  dataKey="value"
                                  stroke="none"
                                  labelLine={false}
                                  isAnimationActive={false}
                                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                      if (percent === 0) return null;
                                      const RADIAN = Math.PI / 180;
                                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                      const x = cx + radius * Math.cos(-(midAngle || 0) * RADIAN);
                                      const y = cy + radius * Math.sin(-(midAngle || 0) * RADIAN);
                                      
                                      return (
                                        <g>
                                          <circle cx={x} cy={y} r="16" fill="white" className="drop-shadow-sm" />
                                          <text x={x} y={y} fill="#1e293b" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold" style={{ fontSize: '10px', fontWeight: 'bold' }}>
                                            {`${((percent || 0) * 100).toFixed(0)}%`}
                                          </text>
                                        </g>
                                      );
                                  }}
                              >
                                  {[
                                    { name: 'Open', value: stats.pending, color: '#f59e0b' },
                                    { name: 'In Progress', value: stats.inProgress, color: '#84cc16' },
                                    { name: 'Resolved', value: stats.resolved, color: '#10b981' }
                                  ].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                              </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-sm font-medium text-slate-500 mb-1">Total</span>
                            <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-6 w-full mt-1">
                          <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full bg-amber-500" />
                              <span className="text-sm font-bold text-slate-600">Open</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full bg-lime-500" />
                              <span className="text-sm font-bold text-slate-600">In Progress</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full bg-emerald-500" />
                              <span className="text-sm font-bold text-slate-600">Resolved</span>
                          </div>
                      </div>
                  </CardContent>
               </Card>
            </div>
        </div>
        </div>
      )}
      <CreateEmployeeTicketDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchDashboardData}
      />
      <EmployeeTicketDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        ticketId={selectedTicketId}
      />
    </EmployeeLayout>
  )
}
