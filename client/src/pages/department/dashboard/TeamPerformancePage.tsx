import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, Clock, TrendingUp, TrendingDown, 
  Users, Zap, Activity, ArrowUpRight, Ticket
} from "lucide-react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Progress } from "@/components/ui/progress"
import { TicketDetailsDialog } from "@/components/department/TicketDetailsDialog"
import { DASHBOARD_CONFIG } from "@/config/dashboardConfig"
import { useDepartmentDashboard } from "@/hooks/useDepartmentDashboard"
import { Navigate } from "react-router-dom"
import { DashboardHeader, DashboardLoading } from "@/components/department/dashboard/shared/DashboardHeader"

export default function TeamPerformancePage() {
  const {
    user,
    isLoading,
    data,
    teamPerformance,
    detailsDialogOpen,
    setDetailsDialogOpen,
    viewingTicketId,
  } = useDepartmentDashboard()

  if (isLoading) {
    return (
      <DepartmentLayout>
        <DashboardLoading />
      </DepartmentLayout>
    )
  }

  if (!user?.isHead) {
    return <Navigate to="/department/dashboard" replace />
  }

  return (
    <DepartmentLayout>
      <div className="flex-1 p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
        <DashboardHeader
          title="Team Performance"
          subtitle="Monitor individual staff efficiency and department workload."
        />

        {teamPerformance && teamPerformance.length > 0 ? (
          <>
            {/* 0. Team Vitality Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-[#042f2e] rounded-[1.5rem] p-6 border border-slate-900 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 size-32 bg-[#B4E247] opacity-5 blur-[60px] rounded-full -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-start justify-between mb-8 relative z-10"><span className="text-[#B4E247] opacity-90 uppercase tracking-[0.2em] text-[10px] font-black">Active Staff</span><div className="size-10 rounded-full bg-white text-black flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform duration-300"><ArrowUpRight className="size-5" /></div></div>
                    <div className="relative z-10"><div className="text-5xl font-black tracking-tighter text-white mb-3">{teamPerformance.length}</div><div className="flex items-center gap-2"><div className="bg-[#B4E247] text-[#042f2e] px-2.5 py-0.5 rounded-md text-[11px] font-black inline-flex items-center gap-1"><span>Available</span><TrendingUp className="size-3" /></div><span className="text-[11px] font-bold text-slate-400">vs last shift</span></div></div>
                </div>

                {[
                    { 
                        label: 'Tickets Resolved', 
                        val: data.teamStats?.totalResolved || teamPerformance.reduce((acc: number, curr: any) => acc + (curr.resolvedTickets || 0), 0), 
                        icon: CheckCircle, 
                        iconColor: '#B4E247',
                        bg: '#f7fee7',
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
                        <div className="flex items-start justify-between mb-4"><div className="flex items-center gap-3"><div className="size-10 rounded-xl flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: stat.bg, color: stat.iconColor }}><stat.icon className="size-5" /></div><span className="text-sm font-bold text-slate-500">{stat.label}</span></div></div>
                        <div className="flex items-end gap-3"><span className="text-3xl font-black text-slate-900 tracking-tighter">{stat.val}</span><div className={`px-2 py-1 rounded-full text-[10px] font-bold mb-1 bg-slate-50 ${stat.trendColor}`}>{stat.trend.includes('-') ? <TrendingDown className="size-3 inline mr-1" /> : <TrendingUp className="size-3 inline mr-1" />}{stat.trend}</div></div>
                        <p className="text-[11px] font-medium text-slate-400 mt-2 pl-1">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* 0.6 Departmental Capacity */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mb-5">
                <div className="lg:col-span-6 bg-[#032313] rounded-[1.5rem] p-4 shadow-2xl border border-white/5 flex flex-col relative overflow-hidden">
                    <div className="absolute -top-10 -left-10 size-32 bg-[#B4E247]/10 rounded-full blur-[60px]" />
                    <div className="flex items-center justify-between mb-3 relative z-10"><div className="flex items-center gap-4"><div className="flex flex-col"><h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-[#B4E247] mb-0.5 opacity-80">Workforce Overview</h4><h3 className="text-sm font-bold text-white tracking-tight">Team Distribution</h3></div><div className="h-6 w-px bg-white/10 mx-1" /><div className="flex items-baseline gap-1.5"><span className="text-xl font-black text-white tracking-tighter">{data.teamStats?.totalMembers || teamPerformance?.length || 0}</span><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Staff</p></div></div><div className="px-2 py-1 bg-white/5 text-[#B4E247] rounded-lg border border-white/10 flex items-center gap-1.5"><Users className="size-3" /><span className="text-[8px] font-black uppercase tracking-wider">Active Roster</span></div></div>
                    <div className="h-[280px] w-full relative z-10 mt-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(() => {
                                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                  const results = months.map((m) => ({ month: m, staff: 0 }));
                                  teamPerformance?.forEach((member: any) => { const date = member.joinedAt ? new Date(member.joinedAt) : new Date(); results[date.getMonth()].staff++; });
                                  return results;
                              })()} margin={{ top: 15, right: 5, left: -20, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8, fontWeight: 700 }} dy={10} interval={0} /><YAxis hide /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} content={({ active, payload, label }) => { if (active && payload && payload.length) { return (<div className="bg-[#032313] p-2 rounded-lg border border-white/10 shadow-2xl"><p className="text-[8px] font-black text-[#B4E247] uppercase tracking-widest mb-0.5">{label}</p><div className="flex items-center gap-1.5"><div className="size-1 rounded-full bg-[#B4E247]" /><span className="text-[10px] font-black text-white">Staff: {payload[0].value}</span></div></div>) } return null; }} /><Bar dataKey="staff" name="Staff" fill="#B4E247" radius={[2, 2, 2, 2]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-4 bg-[#B4E247] rounded-[1.5rem] p-6 shadow-2xl relative overflow-hidden border border-black/5 flex flex-col">
                    <div className="relative z-10 flex items-start justify-between mb-5"><div className="flex items-center gap-3"><div className="size-10 rounded-full bg-white flex items-center justify-center shadow-sm"><Activity className="size-5 text-[#032313]" /></div><div><h3 className="text-lg font-black leading-none text-[#032313]">Command Center</h3><p className="text-xs font-bold text-[#032313]/60 mt-0.5">Real-Time Event Stream</p></div></div><div className="size-8 rounded-full border border-[#032313]/10 flex items-center justify-center hover:bg-white/20 transition-colors"><ArrowUpRight className="size-4 text-[#032313]" /></div></div>
                    <div className="relative z-10 flex gap-2 mb-5 overflow-x-auto no-scrollbar">{['Platform Feed', ...(teamPerformance?.slice(0, 3).map((m: any) => m.name.split(' ')[0]) || [])].map((name, i) => (<span key={name} className={`px-4 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap border-2 transition-all ${i === 0 ? 'bg-[#032313] text-[#B4E247] border-[#032313]' : 'border-[#032313]/10 text-[#032313]'}`}>{name}</span>))}</div>
                    <div className="relative z-10 flex-1 space-y-3 overflow-y-auto scrollbar-hide pr-1">
                        {data.recentTickets?.slice(0, DASHBOARD_CONFIG.display.maxRecentTickets).map((ticket: any, idx: number) => {
                            const minutesAgo = Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / 60000);
                            const timeAgo = minutesAgo < 1 ? 'just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo/60)}h ago`;
                            return (
                                <div key={idx} className="bg-[#032313] p-3 rounded-2xl border border-white/5 flex items-start gap-3 group hover:bg-[#052e18] transition-all duration-300">
                                    <div className="size-9 shrink-0 rounded-xl bg-[#B4E247] flex items-center justify-center text-[12px] font-black text-[#032313] shadow-inner">{ticket.staffName?.charAt(0) || '?'}</div>
                                    <div className="flex-1 min-w-0"><div className="flex items-center justify-between mb-0.5"><div className="flex items-center gap-1.5 flex-wrap"><span className="text-[11px] font-black text-white">{ticket.staffName}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 ${ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'text-emerald-400' : 'text-amber-400'}`}>{ticket.status === 'RESOLVED' ? 'Resolved' : ticket.status === 'CLOSED' ? 'Closed' : 'Actioned'}</span><span className="text-[10px] font-black text-[#B4E247]">{ticket.ticketId}</span></div><span className="text-[8px] font-bold text-slate-500 whitespace-nowrap uppercase tracking-tighter">{timeAgo}</span></div><p className="text-[10px] font-medium text-slate-400 truncate leading-snug">{ticket.subject || 'System Activity Log'}</p><div className="flex items-center gap-1.5 mt-1.5">{ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? <CheckCircle className="size-2.5 text-emerald-400" /> : <Clock className="size-2.5 text-amber-400" />}<span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">{ticket.status?.replace('_', ' ')}</span></div></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="relative z-10 mt-5 pt-3 border-t border-black/5 flex items-center justify-between"><p className="text-[9px] font-black text-[#032313] uppercase tracking-widest">Live Updates Enabled</p><div className="flex items-center gap-2"><div className="size-1.5 rounded-full bg-[#032313] animate-pulse" /><span className="text-[9px] font-bold text-[#032313]">Synchronized</span></div></div>
                </div>
            </div>

             {/* 1. Advanced Performance Grid */}
             <div className="grid gap-6 grid-cols-1 lg:grid-cols-20 mt-8">
               <Card className="lg:col-span-13 shadow-sm border-none bg-white rounded-[2rem] overflow-hidden">
                 <CardHeader className="border-b bg-muted/10 px-6 py-5 flex flex-row items-center justify-between">
                    <div><CardTitle className="text-xl font-bold text-slate-900 leading-none">Team Roster</CardTitle><CardDescription className="text-xs text-slate-500 mt-1.5">Detailed metrics per active agent</CardDescription></div>
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100">Total: {teamPerformance.length}</div>
                 </CardHeader>
                 <CardContent className="p-0">
                   <div className="overflow-x-auto overflow-y-hidden scrollbar-hide"><table className="w-full"><thead><tr className="bg-slate-50/50 text-[10px] uppercase text-slate-500 tracking-widest border-b border-slate-100"><th className="px-6 py-4 text-left font-black">Staff Member</th><th className="px-6 py-4 text-center font-black">Workload</th><th className="px-6 py-4 text-center font-black">Resolved</th><th className="px-6 py-4 text-center font-black">Avg Time</th><th className="px-6 py-4 text-center font-black">Efficiency</th><th className="px-6 py-4 text-right font-black whitespace-nowrap">Profile</th></tr></thead><tbody className="divide-y divide-slate-50">
                     {teamPerformance.map((member: any) => (
                         <tr key={member.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => (window.location.href = `/department/team/${member.id || member._id || member.userId}`)}>
                           <td className="px-6 py-4"><div className="flex items-center gap-4 group"><div className="size-10 shrink-0 rounded-full bg-[#B4E247] flex items-center justify-center text-[#032313] font-black text-sm shadow-sm transition-transform group-hover:scale-105">{member.name?.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="font-black text-sm text-slate-900 group-hover:text-[#B4E247] transition-colors truncate">{member.name}</p><p className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{member.email}</p></div></div></td>
                           <td className="px-6 py-4"><div className="flex flex-col items-center gap-1.5"><Badge variant="outline" className={`text-[10px] font-black px-2 py-0.5 rounded-md border-2 transition-colors ${member.activeTickets > DASHBOARD_CONFIG.thresholds.workload.warning ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-[#B4E247]/10 text-[#032313] border-[#B4E247]/20"}`}>{member.activeTickets} Active</Badge><Progress value={Math.min(member.activeTickets * 10, 100)} className="h-1 w-16" /></div></td>
                           <td className="px-6 py-4 text-center"><div className="text-sm font-black text-slate-900">{(member.resolvedTickets || 0) + (member.closedTickets || 0)}</div></td>
                           <td className="px-6 py-4 text-center text-xs font-bold text-slate-500 whitespace-nowrap">{member.avgResolutionTime || 'N/A'}h</td>
                           <td className="px-6 py-4"><div className="flex items-center justify-center gap-3"><div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden shrink-0"><div className={`h-full transition-all duration-700 ${member.performance >= 90 ? 'bg-emerald-500' : member.performance >= 70 ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${member.performance || 0}%` }} /></div><span className={`text-xs font-black ${member.performance >= 90 ? 'text-emerald-600' : member.performance >= 70 ? 'text-indigo-600' : 'text-amber-600'}`}>{member.performance}%</span></div></td>
                           <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 border-2 border-slate-100 hover:border-[#B4E247] hover:bg-[#B4E247]/10" onClick={(e) => { e.stopPropagation(); window.location.href = `/department/team/${member.id || member._id || member.userId}`; }}><ArrowUpRight className="size-4" /></Button></td>
                       </tr>
                     ))}
                   </tbody></table></div>
                 </CardContent>
               </Card>

               <Card className="lg:col-span-7 hover:shadow-lg transition-all duration-300 border-none shadow-sm rounded-[2rem] bg-white flex flex-col overflow-hidden">
                  <CardHeader className="pb-2 pt-8 px-8 text-center"><CardTitle className="text-xl font-black text-[#032313] tracking-tight">Team Performance</CardTitle></CardHeader>
                  <CardContent className="px-8 pb-8 flex-1 flex flex-col items-center justify-center">
                     <div className="relative size-60 flex items-center justify-center">
                           {(() => {
                              const activeAgents = teamPerformance.filter((m: any) => m.activeTickets > 0).length;
                              const availableAgents = teamPerformance.length - activeAgents;
                              const total = teamPerformance.length;
                              const chartData = [{ name: 'Active Agents', value: activeAgents, color: '#B4E247' }, { name: 'Available Agents', value: availableAgents, color: '#10b981' }];
                              return (<><ResponsiveContainer width="100%" height="100%"><PieChart className="pointer-events-none"><Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={0} dataKey="value" stroke="none" startAngle={90} endAngle={450} isAnimationActive={false}>{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie></PieChart></ResponsiveContainer><div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Staff</span><span className="text-5xl font-black text-[#032313] tracking-tighter mt-1">{total}</span></div></>);
                           })()}
                     </div>
                     <div className="flex items-center gap-6 mt-4"><div className="flex items-center gap-2"><div className="size-3 rounded-full bg-[#B4E247]" /><span className="text-xs font-bold text-slate-600">Active Agents</span></div><div className="flex items-center gap-2"><div className="size-3 rounded-full bg-[#10b981]" /><span className="text-xs font-bold text-slate-600">Available Agents</span></div></div>
                  </CardContent>
               </Card>
             </div>
          </>
        ) : (
          <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><div className="rounded-full bg-muted p-3 mb-4"><Users className="h-6 w-6 text-muted-foreground" /></div><h3 className="font-semibold text-lg mb-1">No Staff Members</h3><p className="text-sm text-muted-foreground max-w-sm">There are no staff members in your department yet.</p></CardContent></Card>
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
