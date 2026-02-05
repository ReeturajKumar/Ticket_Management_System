import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Loader2, Building2, Download,  Users, Clock,
  Timer, BarChart3, PieChart, Activity
} from "lucide-react"
import { 
  getAnalyticsOverview, 
  getDepartmentAnalytics,
  getStaffAnalytics,
  exportTickets,
  exportUsers,
  exportAnalyticsReport,
  downloadFile,
  type AnalyticsOverview,
  type DepartmentAnalytics,
  type StaffAnalytics
} from "@/services/adminService"
import { toast } from "react-toastify"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell
} from 'recharts'
import { ChartErrorBoundary } from "@/components/ChartErrorBoundary"
import { cn } from "@/lib/utils"

const DEPARTMENT_COLORS = ['#032313', '#00A38C', '#ACDF33', '#6366f1', '#f59e0b', '#ec4899']

export default function AdminAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [deptData, setDeptData] = useState<DepartmentAnalytics | null>(null)
  const [staffData, setStaffData] = useState<StaffAnalytics | null>(null)
  const [period, setPeriod] = useState('30d')
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'staff'>('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const [overviewRes, deptRes, staffRes] = await Promise.all([
        getAnalyticsOverview({ period }),
        getDepartmentAnalytics(period),
        getStaffAnalytics({ period })
      ])
      
      if (overviewRes.success) setData(overviewRes.data)
      if (deptRes.success) setDeptData(deptRes.data)
      if (staffRes.success) setStaffData(staffRes.data)
    } catch (error: any) {
      console.error("Failed to fetch analytics:", error)
      toast.error("Failed to load analytics")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (type: 'tickets' | 'users' | 'report') => {
    try {
      let blob: Blob
      let filename: string

      if (type === 'tickets') {
        blob = await exportTickets({})
        filename = `tickets_export.xlsx`
      } else if (type === 'users') {
        blob = await exportUsers({})
        filename = `users_export.xlsx`
      } else {
        blob = await exportAnalyticsReport(period)
        filename = `analytics_report_${period}.xlsx`
      }

      downloadFile(blob, filename)
      toast.success('Export downloaded successfully')
    } catch (error: any) {
      console.error('Export failed:', error)
      toast.error('Failed to export data')
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

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-slate-500">No analytics data available</p>
        </div>
      </AdminLayout>
    )
  }

  // Status distribution for Total Performance chart
  const statusData = [
    { name: 'Open', value: data.summary.tickets.open, color: '#f59e0b' },
    { name: 'In Progress', value: data.summary.tickets.inProgress, color: '#84cc16' },
    { name: 'Assigned', value: data.summary.tickets.assigned, color: '#3b82f6' },
    { name: 'Waiting', value: data.summary.tickets.waiting, color: '#8b5cf6' },
    { name: 'Resolved', value: data.summary.tickets.resolved, color: '#10b981' },
    { name: 'Closed', value: data.summary.tickets.closed, color: '#64748b' },
  ].filter(s => s.value > 0)

  return (
    <AdminLayout>
      <div className="flex-1 p-2 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Analytics Dashboard</h2>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              System-wide performance metrics and insights
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Selector */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {['7d', '30d', '90d', '180d'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                    period === p 
                      ? "bg-[#032313] text-[#ACDF33]" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            {/* Export Dropdown */}
            <Select onValueChange={(value) => {
              if (value === 'tickets') handleExport('tickets')
              if (value === 'users') handleExport('users')
              if (value === 'report') handleExport('report')
            }}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-white">
                <Download className="size-3 mr-1" />
                <SelectValue placeholder="Export to Excel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tickets">Tickets (Excel)</SelectItem>
                <SelectItem value="users">Users (Excel)</SelectItem>
                <SelectItem value="report">Analytics Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#032313] p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-white/50 uppercase">Total Tickets</span>
              <BarChart3 className="size-4 text-[#ACDF33]" />
            </div>
            <p className="text-2xl font-black text-white">{data.summary.tickets.total}</p>
            <p className="text-xs text-[#ACDF33]">{data.summary.tickets.resolutionRate}% resolved</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Open</span>
              <Activity className="size-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{data.summary.tickets.open}</p>
            <p className="text-xs text-slate-500">+{data.summary.tickets.inProgress} in progress</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Resolution</span>
              <Timer className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{data.summary.resolution.avgHours}h</p>
            <p className="text-xs text-slate-500">Min: {data.summary.resolution.minHours}h</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Users</span>
              <Users className="size-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900">{data.summary.users.total}</p>
            <p className="text-xs text-slate-500">{data.summary.users.departmentUsers} staff</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: PieChart },
            { id: 'departments', label: 'Departments', icon: Building2 },
            { id: 'staff', label: 'Staff', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                activeTab === tab.id 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Trends Chart */}
            <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ticket Trends</h3>
                  <p className="text-[10px] text-slate-400">Created vs Resolved over time</p>
                </div>
              </div>
              <div className="h-[280px]">
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trends}>
                      <defs>
                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#032313" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#032313" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ACDF33" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ACDF33" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} allowDecimals={false} tickCount={6} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Area type="monotone" dataKey="created" stroke="#032313" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" name="Created" />
                      <Area type="monotone" dataKey="resolved" stroke="#ACDF33" strokeWidth={2} fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              </div>
            </div>

            {/* Total Performance - Status Distribution */}
            <div className="bg-white p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 text-center mb-2">Total Performance</h3>
              <div className="h-[220px] relative">
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ cx, cy, midAngle, outerRadius, percent }: any) => {
                          if (!midAngle || !percent || percent <= 0) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 25;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#374151"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize={12}
                              fontWeight="bold"
                            >
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                        labelLine={false}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => [value || 0, 'Count']} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
                {/* Center Count */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Count</p>
                    <p className="text-3xl font-black text-slate-900">{data.summary.tickets.total}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-2 flex-wrap">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="size-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-slate-600">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SLA Compliance */}
            <div className="bg-white p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">SLA Compliance</h3>
              <div className="space-y-3">
                {data.slaCompliance.map((sla) => (
                  <div key={sla.priority} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{sla.priority}</span>
                      <span className={cn(
                        "font-bold",
                        sla.complianceRate >= 90 ? "text-emerald-600" :
                        sla.complianceRate >= 70 ? "text-amber-600" : "text-red-600"
                      )}>
                        {sla.complianceRate}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          sla.complianceRate >= 90 ? "bg-emerald-500" :
                          sla.complianceRate >= 70 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${sla.complianceRate}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {sla.withinSLA} within SLA, {sla.breached} breached
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Top Performers</h3>
              <div className="space-y-2">
                {data.topPerformers.slice(0, 5).map((performer, index) => (
                  <div key={performer.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-amber-100 text-amber-700" :
                      index === 1 ? "bg-slate-200 text-slate-700" :
                      index === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{performer.name}</p>
                      <p className="text-xs text-slate-400">{performer.department?.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{performer.resolved}</p>
                      <p className="text-[10px] text-slate-400">resolved</p>
                    </div>
                    {performer.avgResolutionHours && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">{performer.avgResolutionHours}h</p>
                        <p className="text-[10px] text-slate-400">avg time</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Distribution */}
            <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Ticket Volume by Hour</h3>
              <div className="h-[180px]">
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hourlyDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#032313" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              </div>
            </div>
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && deptData && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deptData.departments.map((dept, index) => (
              <div key={dept.department} className="bg-white p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="size-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}20` }}
                    >
                      <Building2 className="size-4" style={{ color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length] }} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{dept.department.replace(/_/g, ' ')}</h3>
                  </div>
                  <Badge className={cn(
                    "text-[10px]",
                    dept.tickets.resolutionRate >= 80 ? "bg-emerald-100 text-emerald-700" :
                    dept.tickets.resolutionRate >= 50 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {dept.tickets.resolutionRate}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-slate-50 rounded-lg">
                    <p className="text-lg font-bold text-slate-900">{dept.tickets.total}</p>
                    <p className="text-[10px] text-slate-500">Total</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{dept.tickets.open}</p>
                    <p className="text-[10px] text-slate-500">Open</p>
                  </div>
                  <div className="text-center p-2 bg-emerald-50 rounded-lg">
                    <p className="text-lg font-bold text-emerald-600">{dept.tickets.resolved}</p>
                    <p className="text-[10px] text-slate-500">Resolved</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {dept.staff.total} staff ({dept.staff.heads} heads)
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {dept.avgResolutionHours ? `${dept.avgResolutionHours}h avg` : 'N/A'}
                  </span>
                </div>

                {/* Priority breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex gap-2">
                    {dept.priority.critical > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                        {dept.priority.critical} Critical
                      </span>
                    )}
                    {dept.priority.high > 0 && (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded">
                        {dept.priority.high} High
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === 'staff' && staffData && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3">Staff Member</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase px-4 py-3">Department</th>
                    <th className="text-center text-xs font-bold text-slate-500 uppercase px-4 py-3">Tickets</th>
                    <th className="text-center text-xs font-bold text-slate-500 uppercase px-4 py-3">Resolved</th>
                    <th className="text-center text-xs font-bold text-slate-500 uppercase px-4 py-3">Rate</th>
                    <th className="text-center text-xs font-bold text-slate-500 uppercase px-4 py-3">Avg Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffData.staff.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600">{member.name[0]}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-400">{member.email}</p>
                          </div>
                          {member.isHead && (
                            <Badge className="bg-purple-100 text-purple-700 text-[9px]">Head</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{member.department?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-slate-900">{member.tickets.total}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-emerald-600">{member.tickets.resolved}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-bold",
                          member.tickets.resolutionRate >= 80 ? "bg-emerald-100 text-emerald-700" :
                          member.tickets.resolutionRate >= 50 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {member.tickets.resolutionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-slate-600">
                          {member.avgResolutionHours ? `${member.avgResolutionHours}h` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
