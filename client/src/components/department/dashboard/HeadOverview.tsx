import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, 
  Zap, Activity, UserCheck, Users
} from "lucide-react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts'
import { Progress } from "@/components/ui/progress"

import { ChartErrorBoundary } from "@/components/ChartErrorBoundary"
import { DASHBOARD_CONFIG } from "@/config/dashboardConfig"
import { cn } from "@/lib/utils"
import { calculateProgressValue, parseResolutionTime } from "@/utils/calculateTrends"
import { StatCard } from "./shared/StatCards"
import { RecentTicketsCard } from "./shared/RecentTicketsCard"

interface HeadOverviewProps {
  data: any
  teamPerformance: any[]
  onViewTicket: (id: string) => void
  ticketVolumeTrend: number
  isVolumeIncreasing: boolean
  statusChartData: any[]
}

export function HeadOverview({
  data,
  teamPerformance,
  onViewTicket,
  ticketVolumeTrend,
  isVolumeIncreasing,
  statusChartData
}: HeadOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">

        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            variant="dark"
            title="Total Tickets"
            value={data.summary?.totalTickets || 0}
            subValue={`${data.summary?.unassignedTickets || 0} Unassigned`}
            icon={Activity}
            onClick={() => {}}
          />

          <StatCard
            title="Open / In Progress"
            value={(data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)}
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            trend={{
              label: ((data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)) > (data.summary?.totalTickets || 1) * 0.5 ? "High workload" : "Manageable load",
              isPositive: !(((data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)) > (data.summary?.totalTickets || 1) * 0.5),
              value: 0,
              color: ((data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)) > (data.summary?.totalTickets || 1) * 0.5 ? "text-amber-600" : "text-emerald-600"
            }}
          />

          <StatCard
            title="Resolved"
            value={(data.summary?.resolvedTickets || 0) + (data.summary?.closedTickets || 0)}
            icon={CheckCircle}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            trend={{
              label: `${data.analytics?.slaCompliance || '0%'} SLA Compliance`,
              isPositive: true,
              value: 0,
              color: "text-emerald-600"
            }}
          />

          <StatCard
            title="Critical Issues"
            value={data.byPriority?.CRITICAL || 0}
            icon={AlertCircle}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
            trend={{
              label: "Requires attention",
              isPositive: false,
              value: 0,
              color: "text-orange-600"
            }}
          />
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-4">
            <RecentTicketsCard 
              tickets={data.recentTickets} 
              onViewTicket={onViewTicket} 
            />

            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="py-2 px-5 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">Performance Overview</CardTitle>
                <CardDescription className="text-xs mt-0.5">Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-600">Team Performance</span><Zap className="h-3.5 w-3.5 text-yellow-500" /></div>
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-primary">{Math.round((data.summary?.resolvedTickets || 0) / Math.max(data.summary?.totalTickets || 1, 1) * 100)}%</div>
                      <Progress value={(data.summary?.resolvedTickets || 0) / Math.max(data.summary?.totalTickets || 1, 1) * 100} className="h-1.5" />
                      <p className="text-[10px] text-slate-500">Resolution rate</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-600">Avg Resolution</span><Clock className="h-3.5 w-3.5 text-blue-500" /></div>
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-blue-600">{data.analytics?.avgResolutionTime || '0h'}</div>
                      <Progress value={calculateProgressValue(parseResolutionTime(data.analytics?.avgResolutionTime), DASHBOARD_CONFIG.targets.resolutionTimeHours, true)} className="h-1.5" />
                      <p className="text-[10px] text-slate-500">Target: {DASHBOARD_CONFIG.targets.resolutionTimeHours / 24} days</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-600">Active Workload</span><Activity className="h-3.5 w-3.5 text-green-500" /></div>
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-green-600">{(data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)}</div>
                      <Progress value={Math.min(100, ((data.summary?.openTickets || 0) + (data.summary?.inProgressTickets || 0)) / Math.max((data.summary?.totalTickets || 1) * DASHBOARD_CONFIG.multipliers.activeWorkloadThreshold, 1) * 100)} className="h-1.5" />
                      <p className="text-[10px] text-slate-500">Active tickets</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-600">SLA Compliance</span><CheckCircle className="h-3.5 w-3.5 text-purple-500" /></div>
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-purple-600">{data.analytics?.slaCompliance || '0%'}</div>
                      <Progress value={parseInt(data.analytics?.slaCompliance) || 0} className="h-1.5" />
                      <p className="text-[10px] text-slate-500">Target: {DASHBOARD_CONFIG.targets.slaCompliance}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-[350px] flex flex-col">
              <CardHeader className="py-3 px-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Ticket Volume</CardTitle>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm bg-[#032313]" /><span className="text-xs font-medium text-slate-600">Open</span></div>
                      <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm bg-[#ACDF33]" /><span className="text-xs font-medium text-slate-600">Resolved</span></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{data.summary?.totalTickets || 0}</p>
                    <div className="flex items-center gap-1.5 mt-1 justify-end">
                      <span className={cn("text-xs font-bold", isVolumeIncreasing ? "text-emerald-600" : "text-slate-400")}> {isVolumeIncreasing ? "+" : ""}{ticketVolumeTrend}%</span>
                      {isVolumeIncreasing ? <TrendingUp className="size-3.5 text-emerald-500" /> : <TrendingDown className="size-3.5 text-slate-400" />}
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
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={30} />
                          <Bar dataKey="created" name="Created" fill="#032313" radius={[4, 4, 0, 0]} barSize={20} />
                          <Bar dataKey="resolved" name="Resolved" fill="#ACDF33" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartErrorBoundary>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
                <div className="flex items-center justify-between"><CardTitle className="text-base font-bold text-slate-900">Priority Report</CardTitle></div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {[
                  { label: 'Critical Priority', value: data.byPriority?.CRITICAL || 0, max: data.summary?.totalTickets || 1, color: '#ef4444' },
                  { label: 'High Priority', value: data.byPriority?.HIGH || 0, max: data.summary?.totalTickets || 1, color: '#f59e0b' },
                  { label: 'Medium Priority', value: data.byPriority?.MEDIUM || 0, max: data.summary?.totalTickets || 1, color: '#ACDF33' },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-700">{item.label} ({item.value})</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all duration-500" style={{ width: `${(item.value / item.max) * 100}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-[350px]">
              <CardHeader className="pb-0 pt-4 px-5 text-center"><CardTitle className="text-base font-bold text-slate-900">Total Performance</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {statusChartData.length > 0 ? (
                  <ChartErrorBoundary>
                    <div className="h-[200px] relative pointer-events-none">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="value" label={({ cx, cy, midAngle, outerRadius, innerRadius, percent }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = (outerRadius + innerRadius) / 2;
                            const x = cx + radius * Math.cos(-(midAngle || 0) * RADIAN);
                            const y = cy + radius * Math.sin(-(midAngle || 0) * RADIAN);
                            return (<g><circle cx={x} cy={y} r={20} fill="white" stroke="#e2e8f0" strokeWidth={1.5} /><text x={x} y={y} fill="#1f2937" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '13px', fontWeight: '700' }}>{`${((percent || 0) * 100).toFixed(0)}%`}</text></g>);
                          }} labelLine={false}>
                            {statusChartData.map((entry, index) => (<Cell key={`cell-${entry.name}-${index}`} fill={entry.color} stroke="none" />))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center"><p className="text-xs font-medium text-slate-500">Count</p><p className="text-3xl font-bold text-slate-900 mt-1">{data.summary?.totalTickets || 0}</p></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 flex-wrap mt-4">
                      {statusChartData.slice(0, 3).map((item) => (<div key={item.name} className="flex items-center gap-1.5"><div className="size-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} /><span className="text-xs font-medium text-slate-600">{item.name}</span></div>))}
                    </div>
                  </ChartErrorBoundary>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="py-3 px-5 border-b border-slate-100"><CardTitle className="text-base font-bold text-slate-900">Shortcuts</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group w-full cursor-pointer">
                    <div className="flex items-center gap-3"><div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Users className="size-4" /></div><div className="text-left"><p className="text-sm font-semibold text-slate-900">Unassigned</p><p className="text-[10px] text-slate-500">{data.summary?.unassignedTickets || 0} items</p></div></div>
                    <TrendingUp className="size-4 text-slate-400 group-hover:text-indigo-600 transition-all" />
                  </div>
                  <div className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group w-full cursor-pointer">
                    <div className="flex items-center gap-3"><div className="size-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"><AlertCircle className="size-4" /></div><div className="text-left"><p className="text-sm font-semibold text-slate-900">Critical</p><p className="text-[10px] text-slate-500">{data.byPriority?.CRITICAL || 0} urgent</p></div></div>
                    <TrendingUp className="size-4 text-slate-400 group-hover:text-rose-600 transition-all" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Inflow Trends</CardTitle></CardHeader>
            <CardContent><div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.analytics?.trends || []}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ACDF33" stopOpacity={0.1}/><stop offset="95%" stopColor="#ACDF33" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="created" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCreated)" /><Area type="monotone" dataKey="resolved" stroke="#ACDF33" fillOpacity={1} fill="url(#colorResolved)" /></AreaChart>
                </ResponsiveContainer>
              </div></CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Team Status</CardTitle></CardHeader>
            <CardContent><div className="space-y-4">
                {teamPerformance?.slice(0, 5).map((member: any, index: number) => (
                  <div key={member.id || index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{member.name}</span></div><span className="text-muted-foreground">{member.activeTickets || 0} tickets</span></div>
                    <Progress value={Math.min((member.activeTickets || 0) * 10, 100)} className="h-2" />
                  </div>
                )) || (<p className="text-sm text-muted-foreground text-center py-8">No team data</p>)}
              </div></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
