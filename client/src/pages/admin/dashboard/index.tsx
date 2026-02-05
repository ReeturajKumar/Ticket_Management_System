import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight,
  Users,
  UserCheck,
  Ticket,
} from "lucide-react"
import { getAdminDashboardOverview, type AdminDashboardOverview } from "@/services/adminService"
import { toast } from "react-toastify"
import { useAdminSocketEvents } from "@/hooks/useAdminSocket"
import { useAuth } from "@/contexts/AuthContext"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { TicketDetailsDialog } from "@/components/admin/TicketDetailsDialog"
import { connectSocket } from "@/services/socket"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList,
  Legend,
  Area,
  Line,
  ComposedChart
} from "recharts"

// Animated Number Component for smooth stat updates
function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (displayValue !== value) {
      setIsAnimating(true)
      
      // Animate the number change - faster and more subtle
      const startValue = displayValue
      const endValue = value
      const duration = 300 // Reduced from 500ms to 300ms
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const currentValue = Math.round(startValue + (endValue - startValue) * easeOutCubic)
        
        setDisplayValue(currentValue)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }
      
      requestAnimationFrame(animate)
    }
  }, [value, displayValue])

  return (
    <span className={cn(
      "transition-all duration-200 ease-out inline-block", // Reduced duration
      isAnimating && "scale-102 text-[#00A38C]", // Reduced scale from 105 to 102
      className
    )}>
      {displayValue}
    </span>
  )
}

// Master list of departments as defined in the system
const ALL_DEPARTMENTS = [
  'OPERATIONS',
  'FINANCE',
  'PLACEMENT',
  'TRAINING',
  'TECHNICAL_SUPPORT',
  'HR'
]

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<AdminDashboardOverview | null>(null)
  const [period, setPeriod] = useState('all')
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [isRealTimeUpdate, setIsRealTimeUpdate] = useState(false)
  const [updateTimeout, setUpdateTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setIsTicketDialogOpen(true)
  }

  // Debounced real-time update function
  const debouncedRealTimeUpdate = () => {
    // Clear existing timeout
    if (updateTimeout) {
      clearTimeout(updateTimeout)
    }

    // Set visual indicator immediately
    setIsRealTimeUpdate(true)
    setTimeout(() => setIsRealTimeUpdate(false), 600)

    // Debounce the actual API call
    const newTimeout = setTimeout(() => {
      fetchDashboardData(period, customRange, true)
    }, 300) // Wait 300ms before making API call

    setUpdateTimeout(newTimeout)
  }

  const fetchDashboardData = async (selectedPeriod: string = period, range = customRange, isRealTimeUpdate = false) => {
    try {
      // Only show loading for user-initiated actions, not real-time updates
      if (!isRealTimeUpdate) {
        setIsLoading(selectedPeriod === period)
      } else {
        // Show very subtle real-time update indicator
        setIsRealTimeUpdate(true)
        setTimeout(() => setIsRealTimeUpdate(false), 600) // Reduced from 1000ms
      }
      
      const result = await getAdminDashboardOverview(
        selectedPeriod, 
        selectedPeriod === 'custom' ? range.start : undefined,
        selectedPeriod === 'custom' ? range.end : undefined
      )
      if (result.success) {
        setData(result.data)
      }
    } catch (error: any) {
      console.error("Failed to fetch admin dashboard:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      if (!isRealTimeUpdate) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (period === 'custom' && (!customRange.start || !customRange.end)) return;
    fetchDashboardData(period, customRange)
  }, [period, customRange])

  // Initialize socket connection for admin users
  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      const socket = connectSocket(user.id, undefined)
      if (socket) {
        // Wait for socket to be authenticated before setting up event listeners
        const checkAuthentication = () => {
          if (socket.connected) {
            // Socket is ready for events
          }
        }
        
        socket.on('authenticated', checkAuthentication)
        
        return () => {
          socket.off('authenticated', checkAuthentication)
        }
      }
    }
  }, [user])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
    }
  }, [updateTimeout])

  useAdminSocketEvents({
    onUserCreated: debouncedRealTimeUpdate,
    onUserUpdated: debouncedRealTimeUpdate,
    onTicketCreated: debouncedRealTimeUpdate,
    onTicketUpdated: debouncedRealTimeUpdate,
  })

  // Status helper mapping
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'OPEN': return "bg-blue-100 text-blue-700"
      case 'IN_PROGRESS': return "bg-amber-100 text-amber-700"
      case 'RESOLVED': return "bg-emerald-100 text-emerald-700"
      case 'CLOSED': return "bg-slate-100 text-slate-600"
      case 'WAITING_FOR_USER': return "bg-purple-100 text-purple-700"
      default: return "bg-slate-100 text-slate-600"
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00A38C]" />
        </div>
      </AdminLayout>
    )
  }

  if (!data) return null


  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Subtle Real-time Update Indicator */}
        {isRealTimeUpdate && (
          <div className="fixed top-4 right-4 z-50 bg-[#00A38C]/90 text-white px-2 py-1 rounded-lg text-[10px] font-medium animate-in slide-in-from-right-1 duration-200 backdrop-blur-sm">
            ⚡ Live
          </div>
        )}
        
        {/* Header Section: Greeting & Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                 Welcome back, <span className="text-[#00A38C]">{user?.name?.split(' ')[0]}</span>
              </h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                 System Overview & Performance Analytics
              </p>
           </div>

           <div className="flex flex-col sm:flex-row items-end justify-end gap-3">
           {period === 'custom' && (
             <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                <input 
                  type="date" 
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#ACDF33]"
                  value={customRange.start}
                  onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                />
                <span className="text-[10px] font-black text-slate-300 uppercase">to</span>
                <input 
                  type="date" 
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1 text-[10px] font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#ACDF33]"
                  value={customRange.end}
                  onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                />
             </div>
           )}

           <div className="inline-flex p-1 bg-slate-900/5 rounded-2xl border border-slate-200/50">
              {[
                { label: 'Today', value: 'today' },
                { label: 'Week', value: 'last_week' },
                { label: 'Month', value: 'last_month' },
                { label: '3M', value: 'last_3_months' },
                { label: '6M', value: 'last_6_months' },
                { label: 'All', value: 'all' },
                { label: 'Custom', value: 'custom' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setPeriod(item.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all",
                    period === item.value 
                      ? "bg-[#032313] text-[#ACDF33] shadow-lg shadow-[#032313]/10" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-white"
                  )}
                >
                  {item.label}
                </button>
              ))}
           </div>
        </div>
      </div>

        {/* Dynamic Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Total Users Card */}
          <div className="bg-[#032313] p-6 rounded-[1.75rem] shadow-xl relative overflow-hidden group min-h-[160px] flex flex-col justify-between">
             <div className="absolute top-0 right-0 p-6">
                <Users className="size-4 text-[#ACDF33]/40" />
             </div>
             <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Platform Reach</p>
             </div>
              <div className="relative z-10">
                 <h3 className="text-xl font-black text-white leading-tight">
                   <AnimatedNumber value={data.summary.totalUsers} /> Total Accounts
                 </h3>
                 <p className="text-base font-bold text-[#ACDF33]">
                   <AnimatedNumber value={data.summary.approvedUsers} /> Active Users
                 </p>
              </div>
             <Link to="/admin/users" className="relative z-10 flex items-center gap-1.5 text-[10px] font-bold text-white/50 hover:text-white transition-colors group/btn mt-2">
                User List <ArrowUpRight className="size-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
             </Link>
          </div>

          {/* New Approvals Card */}
          <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all min-h-[160px] flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">New Approvals</p>
                <div className="size-8 rounded-full bg-orange-50 flex items-center justify-center">
                   <UserCheck className="size-4 text-orange-500" />
                </div>
             </div>
             <div className="space-y-1">
                <h3 className="text-4xl font-black text-slate-900 leading-none">
                  <AnimatedNumber value={data.summary.pendingUsers} />
                </h3>
                <div className="flex items-center gap-1.5 text-orange-500">
                   <TrendingUp className="size-3.5" />
                   <span className="text-[11px] font-bold">Waiting for Approval</span>
                </div>
             </div>
          </div>

          {/* All Tickets Card */}
          <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all min-h-[160px] flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Total Tickets</p>
                <div className="size-8 rounded-full bg-[#152e22]/10 flex items-center justify-center">
                   <Ticket className="size-4 text-[#032313]" />
                </div>
             </div>
              <div className="space-y-1">
                 <h3 className="text-4xl font-black text-slate-900 leading-none">
                   <AnimatedNumber value={data.summary.totalTickets} />
                 </h3>
              </div>
          </div>

          {/* Resolved Card */}
          <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all min-h-[160px] flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Solved Tickets</p>
                <div className="size-8 rounded-full bg-emerald-50 flex items-center justify-center">
                   <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
             </div>
              <div className="space-y-1">
                 <h3 className="text-4xl font-black text-slate-900 leading-none">
                   <AnimatedNumber value={data.summary.resolvedTickets + data.summary.closedTickets} />
                 </h3>
              </div>
          </div>

        </div>

        {/* Priority & Department Breakdown */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
           
           {/* Compact Ticket Urgency Grid */}
           <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                 <div>
                    <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">Ticket Urgency</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">SLA Priority Breakdown</p>
                 </div>
                 <Badge className={cn(
                   "bg-[#032313] text-[#ACDF33] border-none text-[8px] font-black px-1.5 py-0.5 transition-all duration-200",
                   isRealTimeUpdate && "scale-105" // Removed animate-pulse, just subtle scale
                 )}>Live Data</Badge>
              </div>

              {/* Compact Ticket Urgency Grid */}
              <div className="grid grid-cols-2 gap-3">
                 {[
                    { 
                      label: 'Critical', 
                      count: data.byPriority.CRITICAL || 0, 
                      color: '#ef4444', 
                      bg: 'bg-rose-50/40',
                      border: 'border-rose-100/30',
                      text: 'text-rose-600',
                      sla: '2H SLA'
                    },
                    { 
                      label: 'High', 
                      count: data.byPriority.HIGH || 0, 
                      color: '#f97316', 
                      bg: 'bg-orange-50/40',
                      border: 'border-orange-100/30',
                      text: 'text-orange-600',
                      sla: '6H SLA'
                    },
                    { 
                      label: 'Normal', 
                      count: data.byPriority.MEDIUM || 0, 
                      color: '#3b82f6', 
                      bg: 'bg-blue-50/40',
                      border: 'border-blue-100/30',
                      text: 'text-blue-600',
                      sla: '24H SLA'
                    },
                    { 
                      label: 'Low', 
                      count: data.byPriority.LOW || 0, 
                      color: '#64748b', 
                      bg: 'bg-slate-50/40',
                      border: 'border-slate-100/30',
                      text: 'text-slate-500',
                      sla: '48H SLA'
                    }
                 ].map((p) => {
                    const percentage = data.summary.totalTickets > 0 
                      ? Math.round((p.count / data.summary.totalTickets) * 100) 
                      : 0;
                    
                    return (
                      <div key={p.label} className={cn("p-3 rounded-2xl border transition-all hover:bg-white hover:shadow-sm", p.bg, p.border)}>
                         <div className="flex justify-between items-start mb-1.5">
                            <span className={cn("text-[9px] font-black uppercase tracking-wider", p.text)}>{p.label}</span>
                            <span className="text-[8px] font-bold text-slate-400 bg-white/80 px-1 py-0.5 rounded border border-slate-50">{p.sla}</span>
                         </div>
                         <div className="flex items-end gap-1.5">
                            <h4 className="text-2xl font-black text-slate-900 leading-none">
                              <AnimatedNumber value={p.count} />
                            </h4>
                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">{percentage}% Volume</span>
                         </div>
                         <div className="mt-2.5 h-1 w-full bg-slate-200/30 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: p.color }} />
                         </div>
                      </div>
                    )
                 })}
              </div>

              {/* Enhanced Bar Chart Visualization */}
              <div className="pt-6 mt-2 border-t border-slate-50">
                 <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart 
                          data={[
                            { name: 'CRITICAL', value: data.byPriority.CRITICAL || 0, color: '#ef4444' },
                            { name: 'HIGH', value: data.byPriority.HIGH || 0, color: '#f97316' },
                            { name: 'NORMAL', value: data.byPriority.MEDIUM || 0, color: '#3b82f6' },
                            { name: 'LOW', value: data.byPriority.LOW || 0, color: '#64748b' }
                          ]}
                          margin={{ top: 20, right: 0, left: -25, bottom: 0 }}
                       >
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                             dataKey="name" 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{fontSize: 8, fontWeight: 800, fill: '#64748b', letterSpacing: '0.05em'}}
                          />
                          <YAxis 
                             axisLine={false} 
                             tickLine={false} 
                             allowDecimals={false}
                             tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                             domain={[0, 'auto']}
                          />
                          <Tooltip 
                             cursor={{fill: '#f8fafc', opacity: 0.4}}
                             contentStyle={{ 
                                borderRadius: '14px', 
                                border: '1px solid #f1f5f9', 
                                boxShadow: '0 15px 35px rgba(0,0,0,0.08)', 
                                fontSize: '11px', 
                                fontWeight: '900',
                                padding: '8px 12px',
                                textTransform: 'uppercase',
                                color: '#032313'
                             }}
                          />
                          <Bar 
                             dataKey="value" 
                             radius={[6, 6, 0, 0]} 
                             barSize={38}
                             animationDuration={1500}
                          >
                             <LabelList 
                                dataKey="value" 
                                position="top" 
                                style={{ fill: '#032313', fontSize: 11, fontWeight: 900 }}
                                offset={10}
                             />
                             {[
                                { name: 'CRITICAL', value: data.byPriority.CRITICAL || 0, color: '#ef4444' },
                                { name: 'HIGH', value: data.byPriority.HIGH || 0, color: '#f97316' },
                                { name: 'NORMAL', value: data.byPriority.MEDIUM || 0, color: '#3b82f6' },
                                { name: 'LOW', value: data.byPriority.LOW || 0, color: '#64748b' }
                             ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} className="hover:fill-opacity-100 transition-all duration-300" />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>

           {/* Compact Department Distribution Grid */}
           <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                 <div>
                    <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">Active Departments</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Ticket Load Distribution</p>
                 </div>
                 <div className={cn(
                   "size-1.5 rounded-full bg-[#ACDF33] transition-all duration-200",
                   isRealTimeUpdate ? "scale-125" : "animate-pulse" // More subtle animation
                 )} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                 {ALL_DEPARTMENTS.map((dept) => {
                    const count = data.byDepartment[dept] || 0;
                    const totalTickets = data.summary.totalTickets || 1;
                    const percentage = Math.round((Number(count) / totalTickets) * 100);
                    
                    return (
                       <div key={dept} className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-white hover:border-[#ACDF33]/40 transition-all group">
                          <div className="flex justify-between items-center mb-1.5">
                             <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[140px]">{dept.replace(/_/g, ' ')}</span>
                             <span className="text-[13px] font-black text-slate-900">
                               <AnimatedNumber value={count} />
                             </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="flex-1 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                                <div 
                                   className="h-full bg-[#032313] rounded-full transition-all duration-1000 group-hover:bg-[#ACDF33]" 
                                   style={{ width: `${percentage}%` }}
                                />
                             </div>
                             <span className="text-[9px] font-bold text-slate-400">{percentage}%</span>
                          </div>
                       </div>
                    );
                 })}
              </div>

              {/* Department Load Bar Chart */}
              <div className="pt-6 mt-2 border-t border-slate-50">
                 <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart 
                          data={ALL_DEPARTMENTS.map(dept => ({
                             name: dept.split('_').map(w => w[0]).join(''), // Abbreviations
                             fullName: dept.replace(/_/g, ' '),
                             value: data.byDepartment[dept] || 0
                          }))}
                          margin={{ top: 20, right: 0, left: -25, bottom: 0 }}
                       >
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                             dataKey="name" 
                             axisLine={false} 
                             tickLine={false} 
                             tick={{fontSize: 8, fontWeight: 800, fill: '#64748b', letterSpacing: '0.05em'}}
                          />
                          <YAxis 
                             axisLine={false} 
                             tickLine={false} 
                             allowDecimals={false}
                             tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                             domain={[0, 'auto']}
                          />
                          <Tooltip 
                             cursor={{fill: '#f8fafc', opacity: 0.4}}
                             contentStyle={{ 
                                borderRadius: '14px', 
                                border: '1px solid #f1f5f9', 
                                boxShadow: '0 15px 35px rgba(0,0,0,0.08)', 
                                fontSize: '11px', 
                                fontWeight: '900',
                                padding: '8px 12px',
                                textTransform: 'uppercase',
                                color: '#032313'
                             }}
                          />
                          <Bar 
                             dataKey="value" 
                             radius={[6, 6, 0, 0]} 
                             barSize={32}
                             animationDuration={1500}
                             fill="#032313"
                             className="hover:fill-[#ACDF33] transition-all duration-300"
                          >
                             <LabelList 
                                dataKey="value" 
                                position="top" 
                                style={{ fill: '#032313', fontSize: 11, fontWeight: 900 }}
                                offset={10}
                             />
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
        </div>

        {/* Human Capital Analytics */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
           {/* Team Distribution List */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                 <div>
                    <h3 className="text-lg font-black text-slate-900">Departmental Teams</h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-tight mt-0.5">Personnel Breakdown</p>
                 </div>
                 <Badge className="bg-[#152e22] text-[#ACDF33] border-none text-[9px] font-black px-2 py-0.5 uppercase">
                    <AnimatedNumber value={data.summary.employees} /> Total Staff
                 </Badge>
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                 {ALL_DEPARTMENTS.map((dept) => {
                   const stats = data.usersByDepartment[dept] || { total: 0, heads: 0, staff: 0 };
                   return (
                     <div key={dept} className="p-3.5 rounded-[1.25rem] border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-[#ACDF33]/40 transition-all group">
                       <div className="flex items-center justify-between mb-2.5">
                         <span className="text-[12px] font-black text-slate-900 truncate max-w-[120px]">{dept.replace(/_/g, ' ')}</span>
                         <span className="text-[12px] font-black text-[#032313] bg-white px-2 py-0.5 rounded-full border border-slate-50 shadow-sm">
                           <AnimatedNumber value={stats.total} />
                         </span>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="flex-1">
                             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                                <span>Heads</span>
                                <span><AnimatedNumber value={stats.heads} /></span>
                             </div>
                             <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${stats.total > 0 ? (stats.heads / stats.total) * 100 : 0}%` }} />
                             </div>
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                                <span>Staff</span>
                                <span><AnimatedNumber value={stats.staff} /></span>
                             </div>
                             <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${stats.total > 0 ? (stats.staff / stats.total) * 100 : 0}%` }} />
                             </div>
                          </div>
                       </div>
                     </div>
                   )
                 })}
              </div>
           </div>

           {/* Team Structure Visualization */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                 <div>
                    <h3 className="text-lg font-black text-slate-900">Leadership vs Staff</h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-tight mt-0.5">Team Composition Ratio</p>
                 </div>
                 <div className="size-2 rounded-full bg-[#032313]" />
              </div>
              
              <div className="h-[280px] w-full pt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                       data={ALL_DEPARTMENTS.map(dept => ({
                          name: dept.split('_').map(w => w[0]).join(''), // Abbreviations
                          Heads: data.usersByDepartment[dept]?.heads || 0,
                          Staff: data.usersByDepartment[dept]?.staff || 0,
                       }))}
                       margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                       barGap={8}
                    >
                       <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                       <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 9, fontVariant: 'small-caps', fontWeight: 800, fill: '#64748b'}}
                       />
                       <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          allowDecimals={false}
                          tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}}
                       />
                       <Tooltip 
                          cursor={{fill: '#f8fafc', opacity: 0.5}}
                          contentStyle={{ 
                             borderRadius: '16px', 
                             border: 'none', 
                             boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                             fontSize: '11px',
                             fontWeight: 'bold',
                             padding: '12px'
                          }}
                       />
                       <Legend 
                          verticalAlign="top" 
                          align="right" 
                          iconType="circle"
                          wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '20px' }}
                       />
                       <Bar 
                          dataKey="Heads" 
                          fill="#f97316" 
                          radius={[4, 4, 0, 0]} 
                          barSize={16}
                          animationDuration={1500}
                       />
                       <Bar 
                          dataKey="Staff" 
                          fill="#10b981" 
                          radius={[4, 4, 0, 0]} 
                          barSize={16}
                          animationDuration={2000}
                       />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Operations & Growth Analytics */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 pb-10">
           {/* Recent Updates Portal */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[480px]">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
                 <div>
                    <h3 className="text-lg font-black text-slate-900">Recent Updates</h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-tight mt-0.5">Live Ticketing Stream</p>
                 </div>
                 <Link 
                    to="/admin/tickets" 
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-100 transition-all group"
                 >
                    <span className="text-[10px] font-black text-slate-600 group-hover:text-slate-900 uppercase">Visit All</span>
                    <ArrowUpRight className="size-3 text-slate-400 group-hover:text-slate-900 transition-colors" />
                 </Link>
              </div>

              <div className="flex-1 space-y-3 overflow-hidden">
                 {data.recentTickets.slice(0, 3).map((ticket) => (
                    <div 
                       key={ticket.id} 
                       className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-[#ACDF33]/40 hover:shadow-md transition-all group cursor-pointer"
                       onClick={() => handleTicketClick(ticket.id)}
                    >
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                             <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shadow-sm", getStatusStyle(ticket.status))}>
                                {ticket.status.replace(/_/g, ' ')}
                             </span>
                             <span className={cn(
                                "text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border",
                                ticket.priority === 'CRITICAL' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                ticket.priority === 'HIGH' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                                'bg-slate-50 border-slate-100 text-slate-500'
                             )}>
                                {ticket.priority}
                             </span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                       </div>
                       <h4 className="text-[14px] font-black text-slate-900 line-clamp-1 mb-1 group-hover:text-[#00A28A] transition-colors">{ticket.subject}</h4>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                             <div className="size-5 rounded-full bg-slate-200 border border-white flex items-center justify-center">
                                <span className="text-[8px] font-black text-slate-600">{ticket.createdByName[0]}</span>
                             </div>
                             <span className="text-[10px] font-bold text-slate-600">{ticket.createdByName}</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{ticket.department.replace(/_/g, ' ')}</span>
                       </div>
                    </div>
                 ))}

                 {data.recentTickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                       <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">No Recent Activity</p>
                    </div>
                 )}
              </div>
           </div>

           {/* Platform Growth Graph */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[480px]">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
                 <div>
                    <h3 className="text-lg font-black text-slate-900">Platform Activity Growth</h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-tight mt-0.5">Tickets Volume & Resolution Trends</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                       <div className="size-2 rounded-full bg-[#032313]" />
                       <span className="text-[9px] font-black text-slate-500 uppercase">Input</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <div className="size-2 rounded-full bg-[#ACDF33]" />
                       <span className="text-[9px] font-black text-slate-500 uppercase">Output</span>
                    </div>
                 </div>
              </div>

              <div className="flex-1 w-full pt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                          <linearGradient id="glowInput" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#032313" stopOpacity={0.08}/>
                             <stop offset="95%" stopColor="#032313" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="glowOutput" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#ACDF33" stopOpacity={0.12}/>
                             <stop offset="95%" stopColor="#ACDF33" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="0" vertical={true} horizontal={false} stroke="#f1f5f9" />
                       <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}}
                          tickFormatter={(str: string) => {
                             const d = new Date(str);
                             return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                          }}
                          minTickGap={20}
                       />
                       <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          allowDecimals={false}
                          tick={{fontSize: 9, fontWeight: 700, fill: '#cbd5e1'}}
                       />
                       <Tooltip 
                          cursor={{ stroke: '#f8fafc', strokeWidth: 2 }}
                          content={({ active, payload, label }) => {
                             if (active && payload && payload.length) {
                                return (
                                   <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 pb-2 border-b border-slate-100">
                                         {label !== undefined ? new Date(label as any).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                                      </p>
                                      <div className="space-y-3">
                                         {payload.map((entry: any, index: number) => (
                                            <div key={index} className="flex items-center justify-between gap-6">
                                               <div className="flex items-center gap-2.5">
                                                  <div className="size-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                                                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{entry.name}</span>
                                               </div>
                                               <div className="flex items-baseline gap-1">
                                                  <span className="text-[13px] font-black text-slate-900">{entry.value}</span>
                                                  <span className="text-[8px] font-bold text-slate-400 uppercase">units</span>
                                               </div>
                                            </div>
                                         ))}
                                      </div>
                                   </div>
                                );
                             }
                             return null;
                          }}
                       />
                       <Area 
                          type="monotone" 
                          dataKey="created" 
                          stroke="none"
                          fill="url(#glowInput)" 
                          animationDuration={2000}
                       />
                       <Area 
                          type="monotone" 
                          dataKey="resolved" 
                          stroke="none"
                          fill="url(#glowOutput)" 
                          animationDuration={2500}
                       />
                       <Line 
                          type="monotone" 
                          dataKey="created" 
                          name="Platform Input"
                          stroke="#032313" 
                          strokeWidth={4}
                          dot={false}
                          activeDot={{ r: 7, fill: '#032313', stroke: '#fff', strokeWidth: 3 }}
                          animationDuration={2000}
                       />
                       <Line 
                          type="monotone" 
                          dataKey="resolved" 
                          name="Platform Output"
                          stroke="#ACDF33" 
                          strokeWidth={4}
                          dot={false}
                          activeDot={{ r: 7, fill: '#ACDF33', stroke: '#fff', strokeWidth: 3 }}
                          animationDuration={2500}
                       />
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

      </div>

      {/* Ticket Details Dialog */}
      <TicketDetailsDialog
        ticketId={selectedTicketId}
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
      />
    </AdminLayout>
  )
}
