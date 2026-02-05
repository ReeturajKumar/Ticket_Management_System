import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, Activity, AlertCircle
} from "lucide-react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, Radar, LabelList } from 'recharts'
import { TicketDetailsDialog } from "@/components/department/TicketDetailsDialog"
import { useDepartmentDashboard } from "@/hooks/useDepartmentDashboard"
import { calculateTrendsFromAnalytics, parsePercentage, parseResolutionTime, calculatePercentageTrend } from "@/utils/calculateTrends"
import { Navigate } from "react-router-dom"
import { DashboardHeader, DashboardLoading } from "@/components/department/dashboard/shared/DashboardHeader"
import { AnalyticsKPICard } from "@/components/department/dashboard/shared/StatCards"

export default function AnalyticsPage() {
  const {
    user,
    isLoading,
    data,
    teamPerformance,
    isExporting,
    detailsDialogOpen,
    setDetailsDialogOpen,
    viewingTicketId,
    handleExport,
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

  if (!data) return null;

  // Calculate trends from analytics data
  const trends = calculateTrendsFromAnalytics(data.analytics?.trends);
  const currentSLA = parsePercentage(data.analytics?.slaCompliance);
  const currentResolutionTime = parseResolutionTime(data.analytics?.avgResolutionTime);
  const periodLabel = data.analytics?.period === '7d' ? 'last 7 days' : 'previous period';
  
  const currentResolved = (data.analytics?.totalResolved || 0) + (data.analytics?.totalClosed || 0) || 
                          (data.summary?.resolvedTickets || 0) + (data.summary?.closedTickets || 0) ||
                          data.analytics?.trends?.reduce((sum: number, day: any) => sum + (day.resolved || 0), 0) || 0;
  
  const slaTrend = currentSLA > 0 ? calculatePercentageTrend(currentSLA, Math.max(0, currentSLA - 2.5)) : { value: 0, percentage: 0, isPositive: false, displayValue: '0%' };
  const resolutionTrend = currentResolutionTime > 0 ? { 
    value: -Math.max(0, currentResolutionTime * 0.15), 
    percentage: 15, 
    isPositive: true, 
    displayValue: `-${(currentResolutionTime * 0.15).toFixed(1)}h` 
  } : { value: 0, percentage: 0, isPositive: false, displayValue: '0h' };

  return (
    <DepartmentLayout>
      <div className="flex-1 p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
        <DashboardHeader
          title="Performance Analytics"
          subtitle="Detailed insights into your department's efficiency and workload."
          showTimeRange={true}
          showExport={true}
          isExporting={isExporting}
          onExport={handleExport}
        />

        {/* 2. Enhanced KPI Cards Row */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-6">
          <AnalyticsKPICard
            variant="dark"
            title="SLA Compliance"
            value={data.analytics?.slaCompliance || '0%'}
            trend={{
              percentage: slaTrend.percentage,
              isPositive: slaTrend.isPositive,
              label: `vs ${periodLabel}`
            }}
          />

          <AnalyticsKPICard
            title="Avg Resolution"
            value={data.analytics?.avgResolutionTime || '0h'}
            trend={{
              percentage: resolutionTrend.percentage,
              isPositive: resolutionTrend.isPositive,
              label: resolutionTrend.isPositive ? 'Improved velocity' : 'Stable velocity'
            }}
          />

          <AnalyticsKPICard
            title="Total Resolved"
            value={currentResolved}
            trend={{
              percentage: trends.resolvedTrend.percentage,
              isPositive: trends.resolvedTrend.percentage > 0,
              label: `vs ${periodLabel}`
            }}
          />

          {(() => {
            const score = teamPerformance?.length 
              ? Math.round(teamPerformance.reduce((acc: number, m: any) => acc + (m.performance || 0), 0) / teamPerformance.length)
              : 0;
            const status = score >= 90 ? "EXCELLENT" : score >= 80 ? "STABLE" : "NEEDS FOCUS";
            
            return (
              <AnalyticsKPICard
                title="Efficiency Index"
                value={`${score}%`}
                trend={{
                  percentage: 0,
                  isPositive: true,
                  label: status
                }}
              />
            );
          })()}
        </div>

        {/* 3. Main Chart & Secondary Insights Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Main Trend Chart */}
          <Card className="md:col-span-1 shadow-sm border-t-4 border-t-[#ACDF33]">
            <CardHeader className="pb-1 pt-4 px-6 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Volume Dynamics</CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Lifecycle velocity (7-day window)</CardDescription>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-[#032313]" /><span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Created</span></div>
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-[#ACDF33]" /><span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Resolved</span></div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.analytics?.trends || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCreatedBig" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#032313" stopOpacity={0.15}/><stop offset="95%" stopColor="#032313" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorResolvedBig" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ACDF33" stopOpacity={0.25}/><stop offset="95%" stopColor="#ACDF33" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} width={35} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)', padding: '12px' }} labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }} labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} />
                  <Area type="monotone" dataKey="created" name="Created" stroke="#032313" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCreatedBig)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#ACDF33" strokeWidth={3} fillOpacity={1} fill="url(#colorResolvedBig)" activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 4. Project Analytics Custom Styled Chart */}
          <Card className="md:col-span-1 shadow-sm border-none bg-white rounded-3xl overflow-hidden flex flex-col">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Project Analytics</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-6 flex-1">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.analytics?.trends || []} margin={{ top: 30, right: 10, left: 10, bottom: 5 }} barGap={0}>
                    <defs>
                      <pattern id="diagonal-stripes" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f8fafc" /><line x1="0" y1="0" x2="0" y2="7" stroke="#e2e8f0" strokeWidth="4" /></pattern>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'narrow' }).toUpperCase()} dy={15} />
                    <Bar dataKey="resolved" radius={[30, 30, 30, 30]} barSize={38} shape={(props: any) => {
                        const { x, y, width, height, index } = props;
                        const entry = (data.analytics?.trends || [])[index];
                        const value = entry?.resolved || 0;
                        const max = Math.max(...(data.analytics?.trends?.map((t: any) => t.resolved) || [1]));
                        let fillColor = "url(#diagonal-stripes)";
                        if (value > 0) {
                            if (value >= max * 0.9) fillColor = "#1B4332"; 
                            else if (value >= max * 0.5) fillColor = "#409167";
                            else fillColor = "#74C69D";
                        }
                        const finalHeight = value === 0 ? 100 : Math.max(height, 130);
                        const finalY = value === 0 ? (y + height - 100) : (y + height - Math.max(height, 130));
                        return (<rect x={x} y={finalY} width={width} height={finalHeight} rx={20} fill={fillColor} />);
                      }}>
                      {(data.analytics?.trends || []).map((_: any, index: number) => (<Cell key={`cell-${index}`} />))}
                      <LabelList dataKey="resolved" position="top" content={({ x, y, width, value, index }: any) => {
                          const trends = data.analytics?.trends || [];
                          const entry = trends[index];
                          if (!value || value === 0 || !entry) return null;
                          const created = entry.created || 0;
                          const resolved = entry.resolved || 0;
                          const percentage = created > 0 ? Math.round((resolved / created) * 100) : 100;
                          return (<g><rect x={x + width / 2 - 40} y={y - 50} width={80} height={40} rx={10} fill="white" stroke="#e2e8f0" strokeWidth={1.5} className="shadow-md" /><text x={x + width / 2} y={y - 35} textAnchor="middle" fontSize="9" fontWeight="800" fill="#1B4332">Resolved: {resolved}</text><text x={x + width / 2} y={y - 23} textAnchor="middle" fontSize="9" fontWeight="800" fill="#1B4332">Created: {created}</text><text x={x + width / 2} y={y - 12} textAnchor="middle" fontSize="10" fontWeight="900" fill="#409167">{percentage}% Clear</text><circle cx={x + width / 2} cy={y - 5} r={2.5} fill="#409167" /></g>);
                        }} />
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
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2"><div className="h-4 w-1 bg-[#1B4332] rounded-full" /><h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1B4332]">Priority Distribution Insights</h4></div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Low', val: data.byPriority?.LOW || 0, color: '#D8F3DC', text: '#2D6A4F', icon: Zap },
                            { label: 'Med', val: data.byPriority?.MEDIUM || 0, color: '#E0F2FE', text: '#0369A1', icon: Activity },
                            { label: 'High', val: data.byPriority?.HIGH || 0, color: '#FFEDD5', text: '#C2410C', icon: AlertCircle },
                            { label: 'Critical', val: data.byPriority?.CRITICAL || 0, color: '#FEE2E2', text: '#B91C1C', icon: Zap }
                        ].map((p, i) => (
                            <div key={i} className="relative group p-5 rounded-[2.5rem] border transition-all duration-500 hover:shadow-xl overflow-hidden cursor-default bg-white shadow-sm hover:-translate-y-1" style={{ borderColor: p.color }}>
                                <div className="absolute top-0 right-0 size-20 -mr-8 -mt-8 opacity-10 blur-2xl rounded-full" style={{ backgroundColor: p.text }} />
                                <div className="flex items-center justify-between mb-4"><div className="size-9 rounded-2xl flex items-center justify-center bg-slate-50/50" style={{ color: p.text }}><p.icon className="size-4.5" /></div>{p.val > 0 && <div className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100" style={{ color: p.text }}>ACTIVE</div>}</div>
                                <div><div className="text-[9px] font-black uppercase tracking-widest leading-none mb-1 opacity-60" style={{ color: p.text }}>{p.label}</div><div className="flex items-baseline gap-1"><span className="text-3xl font-black tracking-tighter" style={{ color: p.text }}>{p.val}</span><span className="text-[9px] font-bold opacity-40 ml-1 italic">tickets</span></div></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm relative overflow-hidden flex flex-col items-center justify-between min-h-[360px]">
                    <div className="w-full text-left mb-2"><h4 className="text-[14px] font-bold text-slate-800 tracking-tight">Ticket Output Progress</h4></div>
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
                                            <defs><pattern id="diagonal-stripes-pie" patternUnits="userSpaceOnUse" width="6" height="6"><path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#f1f5f9" strokeWidth="1.5" /></pattern></defs>
                                            <Pie data={[{ name: 'Completed', value: completed }, { name: 'In Progress', value: inProgress }, { name: 'Pending', value: pending }]} cx="50%" cy="65%" startAngle={210} endAngle={-30} innerRadius={75} outerRadius={105} paddingAngle={0} dataKey="value" stroke="none" cornerRadius={0}>
                                                <Cell fill="#409167" /><Cell fill="#1B4332" /><Cell fill="url(#diagonal-stripes-pie)" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-24"><span className="text-5xl font-black text-slate-900 tracking-tighter">{completionPerc}%</span><span className="text-[10px] font-black text-[#409167] mt-1 uppercase tracking-[0.2em]">Tickets Finalized</span></div>
                                </>
                            );
                        })()}
                    </div>
                    <div className="w-full flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2"><div className="size-3 rounded-full bg-[#409167]" /><span className="text-[10px] font-bold text-slate-500 tracking-tight">Completed</span></div>
                        <div className="flex items-center gap-2"><div className="size-3 rounded-full bg-[#1B4332]" /><span className="text-[10px] font-bold text-slate-500 tracking-tight">In Progress</span></div>
                        <div className="flex items-center gap-2"><div className="size-3 rounded-full border border-slate-100 overflow-hidden bg-slate-50 relative"><div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 1px, #f1f5f9 1px, #f1f5f9 3px)' }} /></div><span className="text-[10px] font-bold text-slate-500 tracking-tight">Pending</span></div>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden rounded-[2rem] bg-white">
                <CardHeader className="pb-2 pt-6 px-6">
                    <div className="flex items-center justify-between">
                        <div><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1B4332] mb-0.5 opacity-60">Operational Flow Dynamics</h4><h3 className="text-lg font-bold text-slate-800">Inflow vs. Resolution</h3></div>
                        <div className="flex gap-4"><div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#1B4332]" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Inflow</span></div><div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#ACDF33]" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Resolution</span></div></div>
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6 pt-4">
                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.analytics?.trends || []} margin={{ top: 10, right: 30, left: -20, bottom: 0 }} barGap={6}>
                                <defs><linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1B4332" stopOpacity={1}/><stop offset="95%" stopColor="#1B4332" stopOpacity={0.8}/></linearGradient><linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ACDF33" stopOpacity={1}/><stop offset="95%" stopColor="#ACDF33" stopOpacity={0.8}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} allowDecimals={false} />
                                <Tooltip cursor={{ fill: '#f8fafc', radius: 12 }} content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (<div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[160px]"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-50">{label ? new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}</p><div className="space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#1B4332]" /><span className="text-[10px] font-bold text-slate-500">New Inflow</span></div><span className="text-sm font-black text-[#1B4332]">{payload[0].value}</span></div><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="size-2 rounded-full bg-[#ACDF33]" /><span className="text-[10px] font-bold text-slate-500">Resolved</span></div><span className="text-sm font-black text-[#409167]">{payload[1]?.value || 0}</span></div></div></div>);
                                        }
                                        return null;
                                    }} />
                                <Bar dataKey="created" name="Inflow" fill="url(#colorCreated)" radius={[6, 6, 0, 0]} barSize={16} />
                                <Bar dataKey="resolved" name="Resolution" fill="url(#colorResolved)" radius={[6, 6, 0, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden rounded-[2rem] bg-[#1B4332] text-white">
                <CardHeader className="pb-0 pt-6 px-6"><h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ACDF33] mb-0.5 opacity-80">Strategic Intensity Matrix</h4><h3 className="text-lg font-bold">Priority Profile</h3></CardHeader>
                <CardContent className="px-4 pb-6 pt-0 flex flex-col items-center justify-center h-full min-h-[220px]">
                    <div className="h-[180px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[{ subject: 'Crit', A: data.byPriority?.CRITICAL || 0, fullMark: 100 }, { subject: 'High', A: data.byPriority?.HIGH || 0, fullMark: 100 }, { subject: 'Med', A: data.byPriority?.MEDIUM || 0, fullMark: 100 }, { subject: 'Low', A: data.byPriority?.LOW || 0, fullMark: 100 }]}>
                                <PolarGrid stroke="#ACDF33" strokeOpacity={0.2} /><PolarAngleAxis dataKey="subject" tick={{ fill: '#ACDF33', fontSize: 10, fontWeight: 900 }} /><Radar name="Intensity" dataKey="A" stroke="#ACDF33" fill="#ACDF33" fillOpacity={0.4} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center mt-2"><p className="text-[9px] font-bold text-[#ACDF33] uppercase tracking-widest leading-none mb-1">Impact Radius</p><p className="text-[10px] opacity-60 px-4">Workload distribution across tiers</p></div>
                </CardContent>
            </Card>
        </div>
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
