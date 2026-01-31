import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Globe, Cpu, Shield } from "lucide-react"

interface TechSupportDashboardContentProps {
  data: any
}

export function TechSupportDashboardContent({ data }: TechSupportDashboardContentProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card className="bg-slate-900 text-white border-slate-800 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3.5">
          <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-tight">System Uptime</CardTitle>
          <Globe className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
        </CardHeader>
        <CardContent className="px-3.5 pb-2.5">
          <div className="text-xl font-bold tracking-tight">{data?.uptime || '0.00'}%</div>
          <p className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5 tracking-wider">Operational</p>
          <div className="mt-2.5 flex gap-0.5 h-2">
            {(data?.uptimeHistory || Array.from({length: 24}).map(() => 'healthy')).map((status: string, i: number) => (
              <div key={i} className={`flex-1 rounded-sm ${status === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'} opacity-80`} />
            ))}
          </div>
          <p className="text-[9px] text-slate-500 mt-1.5 text-right uppercase font-bold tracking-tight">Last 24H</p>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-indigo-50/50 to-white dark:from-indigo-950/10 border-indigo-100 dark:border-indigo-900/30 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3.5">
          <CardTitle className="text-xs font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">Infra Load</CardTitle>
          <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Cpu className="h-3.5 w-3.5 text-indigo-600" />
          </div>
        </CardHeader>
        <CardContent className="px-3.5 pb-2.5">
          <div className="text-lg font-bold text-indigo-600">{data?.infraLoad?.cpu || 0}% CPU</div>
          <div className="mt-2.5 space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                <span>Memory</span>
                <span className="text-slate-900">{data?.infraLoad?.memory?.used || 0}/{data?.infraLoad?.memory?.total || 0} GB</span>
              </div>
              <Progress value={(data?.infraLoad?.memory?.used / data?.infraLoad?.memory?.total) * 100 || 0} className="h-1 bg-indigo-100" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                <span>Storage</span>
                <span className="text-slate-900">{data?.infraLoad?.storage?.used || 0}/{data?.infraLoad?.storage?.total || 0} TB</span>
              </div>
              <Progress value={(data?.infraLoad?.storage?.used / data?.infraLoad?.storage?.total) * 100 || 0} className="h-1 bg-indigo-100" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-slate-50/50 to-white dark:from-slate-900/10 border-slate-200 dark:border-slate-800 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3.5">
          <CardTitle className="text-xs font-bold uppercase tracking-tight text-slate-500">Security</CardTitle>
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Shield className="h-3.5 w-3.5 text-slate-600" />
          </div>
        </CardHeader>
        <CardContent className="px-3.5 pb-2.5">
          <div className="text-lg font-bold text-slate-900">Grade {data?.security?.grade || 'N/A'}</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Audit in {data?.security?.nextAuditDays || 0} days</p>
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-100 dark:border-emerald-800/50 text-center">
              <p className="text-[8px] text-emerald-800 dark:text-emerald-400 font-extrabold uppercase tracking-tight">SSL</p>
              <p className="text-[9px] text-emerald-600 font-bold">{data?.security?.sslStatus || 'Active'}</p>
            </div>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-100 dark:border-indigo-800/50 text-center">
              <p className="text-[8px] text-indigo-800 dark:text-indigo-400 font-extrabold uppercase tracking-tight">CDN</p>
              <p className="text-[9px] text-indigo-600 font-bold">{data?.security?.cdnStatus || 'Active'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TechSupportDashboardContent
