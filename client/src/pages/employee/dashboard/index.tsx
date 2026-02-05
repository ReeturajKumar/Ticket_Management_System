import { 
  Ticket, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  TrendingUp,
  Loader2,
  Calendar,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { EmployeeLayout } from "@/components/layout/EmployeeLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CreateEmployeeTicketDialog } from "@/components/employee/CreateEmployeeTicketDialog"
import { EmployeeTicketDetailsDialog } from "@/components/employee/EmployeeTicketDetailsDialog"
import { Link } from "react-router-dom"
import { useEmployeeDashboard } from "@/hooks/useEmployeeDashboard"
import { useQueryClient } from "@tanstack/react-query"

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const {
    isLoading,
    isConnected,
    stats,
    recentTickets,
    weeklyStats,
    monthlyStats,
    activeTrendTab,
    setActiveTrendTab,
    createDialogOpen,
    setCreateDialogOpen,
    detailsDialogOpen,
    setDetailsDialogOpen,
    selectedTicketId,
    setSelectedTicketId
  } = useEmployeeDashboard()

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };


  if (isLoading) {
    return (
      <EmployeeLayout>
        <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00A38C]" />
        </div>
      </EmployeeLayout>
    )
  }

  return (
    <EmployeeLayout>
      <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Simplified Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              Good {getTimeGreeting()}, {user?.name?.split(' ')[0]} <span className="text-xl">👋</span>
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
               {user?.department || 'Member'} • <span className="text-slate-500">Support Hub</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
             <div className={cn(
               "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300",
               isConnected ? "bg-[#ACDF33]/10 border-[#ACDF33]/20" : "bg-slate-50 border-slate-100"
             )}>
                <div className={cn("size-1.5 rounded-full", isConnected ? "bg-[#00A38C] animate-pulse" : "bg-slate-300")} />
                <span className={cn("text-[10px] font-black uppercase tracking-wider", isConnected ? "text-[#008A76]" : "text-slate-400")}>
                  {isConnected ? 'Online' : 'Offline'}
                </span>
             </div>
             <Button 
               onClick={() => setCreateDialogOpen(true)}
               className="bg-[#032313] hover:bg-[#032313]/90 text-white font-bold rounded-lg px-4 h-9 text-xs border-none shadow-md active:scale-95 transition-all"
             >
               Raise New Ticket
             </Button>
          </div>
        </div>

        {/* Simplified Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          <div className="bg-[#032313] p-6 rounded-[1.75rem] shadow-xl relative overflow-hidden group min-h-[160px] flex flex-col justify-between">
             <div className="absolute top-0 right-0 p-6">
                <div className="size-1.5 rounded-full bg-[#ACDF33]" />
             </div>
             <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Your Activity</p>
             </div>
             <div className="relative z-10">
                <h3 className="text-xl font-black text-white leading-tight">
                  {stats.total} Total Tickets
                </h3>
                <p className="text-base font-bold text-[#ACDF33]">
                  All Submissions
                </p>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all min-h-[160px] flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Pending Work</p>
                <div className="size-8 rounded-full bg-orange-50 flex items-center justify-center">
                   <Clock className="size-4 text-orange-500" />
                </div>
             </div>
             <div className="space-y-1">
                <h3 className="text-4xl font-black text-slate-900 leading-none">{stats.inProgress}</h3>
                <div className="flex items-center gap-1.5 text-orange-500">
                   <TrendingUp className="size-3.5" />
                   <span className="text-[11px] font-bold">Being Solved</span>
                </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all min-h-[160px] flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Success Rate</p>
                <div className="size-8 rounded-full bg-emerald-50 flex items-center justify-center">
                   <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
             </div>
             <div className="space-y-1">
                <h3 className="text-4xl font-black text-slate-900 leading-none">{stats.resolved}</h3>
                <div className="flex items-center gap-1.5 text-emerald-500">
                   <CheckCircle2 className="size-3.5" />
                   <span className="text-[11px] font-bold">Tickets Solved</span>
                </div>
             </div>
          </div>

          <div className="bg-white p-6 rounded-[1.75rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all min-h-[160px] flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Notifications</p>
                <div className="size-8 rounded-full bg-rose-50 flex items-center justify-center">
                   <AlertCircle className="size-4 text-rose-500" />
                </div>
             </div>
             <div className="space-y-1">
                <h3 className="text-4xl font-black text-slate-900 leading-none">{stats.pending}</h3>
                <div className="flex items-center gap-1.5 text-rose-500">
                   <Calendar className="size-3.5" />
                   <span className="text-[11px] font-bold uppercase tracking-wider">Need Your Reply</span>
                </div>
             </div>
          </div>

        </div>

        {/* Simplified Charts & Tickets Section */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            
            {/* Recent Tickets Section */}
            <div className="lg:col-span-12 xl:col-span-7">
               <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                     <h3 className="text-lg font-black text-slate-900">Your Latest Tickets</h3>
                     <Link to="/employee/tickets" className="text-[10px] font-black text-[#00A38C] uppercase tracking-widest hover:underline">See All</Link>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                     {recentTickets.length > 0 ? recentTickets.slice(0, 4).map((ticket: any) => (
                        <div 
                           key={ticket._id} 
                           onClick={() => {
                              setSelectedTicketId(ticket._id)
                              setDetailsDialogOpen(true)
                       }}
                           className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-[#ACDF33]/40 hover:shadow-md transition-all cursor-pointer group"
                        >
                           <div className="flex justify-between items-start mb-2">
                              <Badge className={cn(
                                 "font-black text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-md border-none",
                                 ticket.priority === 'CRITICAL' ? "bg-rose-100 text-rose-700" :
                                 ticket.priority === 'HIGH' ? "bg-orange-100 text-orange-700" :
                                 "bg-blue-100 text-blue-700"
                              )}>
                                 {ticket.priority}
                              </Badge>
                              <span className="text-[9px] font-bold text-slate-300">#{ticket._id.slice(-6).toUpperCase()}</span>
                           </div>
                           <h4 className="text-[13px] font-bold text-slate-900 line-clamp-1 group-hover:text-[#00A38C] transition-colors">{ticket.subject}</h4>
                           <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/50">
                              <Badge variant="outline" className="text-[9px] font-bold py-0 border-slate-200 text-slate-400 capitalize">{ticket.status.toLowerCase().replace(/_/g, ' ')}</Badge>
                              <span className="text-[9px] font-bold text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                     )) : (
                        <div className="col-span-full py-16 text-center">
                           <Ticket className="size-10 text-slate-100 mx-auto mb-2" />
                           <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active tickets found</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Performance Snapshot */}
            <div className="lg:col-span-12 xl:col-span-5">
               <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-50 text-center">
                     <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Resolution Summary</h3>
                  </div>
                  <div className="flex-1 p-6 relative flex flex-col items-center justify-center">
                     <div className="h-[200px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                  data={[
                                    { name: 'Active', value: stats.inProgress + stats.pending, color: '#ACE331' },
                                    { name: 'Resolved', value: stats.resolved, color: '#032313' }
                                  ]}
                                  cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2}
                                  dataKey="value" stroke="none"
                              >
                                  {[
                                    { name: 'Active', value: stats.inProgress + stats.pending, color: '#ACE331' },
                                    { name: 'Resolved', value: stats.resolved, color: '#152e22' }
                                  ].map((entry, index) => <Cell key={index} fill={entry.color} />)}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-3xl font-black text-slate-900 mt-1">{stats.total}</span>
                        </div>
                     </div>
                     <div className="flex items-center justify-center gap-6 w-full mt-4">
                        <div className="flex items-center gap-2">
                           <div className="size-2 rounded-full bg-[#ACE331]" />
                           <span className="text-[11px] font-bold text-slate-600">Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="size-2 rounded-full bg-[#152e22]" />
                           <span className="text-[11px] font-bold text-slate-600">Solved</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Performance History */}
            <div className="lg:col-span-12">
               <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-black text-slate-900">Your Progress</h3>
                        <p className="text-[11px] font-bold text-slate-400">Total tickets raised over time</p>
                     </div>
                     <div className="flex bg-slate-50 p-1 rounded-xl">
                        {['weekly', 'monthly'].map((tab) => (
                           <button 
                             key={tab}
                             onClick={() => setActiveTrendTab(tab as any)}
                             className={cn(
                               "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                               activeTrendTab === tab ? "bg-[#032313] text-[#ACDF33] shadow-md" : "text-slate-400 hover:text-slate-600"
                             )}
                           >
                             {tab}
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="p-8 pb-4">
                     <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activeTrendTab === 'weekly' ? weeklyStats : monthlyStats}>
                              <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ACDF33" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#ACDF33" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}}
                                tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              />
                              <YAxis hide />
                              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                              <Area type="monotone" dataKey="total" stroke="#ACDF33" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>

        </div>

      </div>

      <CreateEmployeeTicketDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] })}
      />
      <EmployeeTicketDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        ticketId={selectedTicketId}
      />
    </EmployeeLayout>
  )
}
