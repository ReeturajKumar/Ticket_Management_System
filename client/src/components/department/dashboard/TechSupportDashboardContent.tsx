import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Globe, Cpu, Shield, Activity } from "lucide-react"

interface TechSupportDashboardContentProps {
  data: any
}

export function TechSupportDashboardContent({ data }: TechSupportDashboardContentProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card className="bg-slate-900 text-white border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-400">System Uptime</CardTitle>
          <Globe className="h-4 w-4 text-indigo-400 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight">{data?.uptime || '0.00'}%</div>
          <p className="text-[10px] text-emerald-400 font-medium uppercase mt-1 tracking-wider">All clusters operational</p>
          <div className="mt-4 flex gap-1 h-3">
            {(data?.uptimeHistory || Array.from({length: 24}).map(() => 'healthy')).map((status: string, i: number) => (
              <div key={i} className={`flex-1 rounded-full ${status === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'} opacity-80`} />
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 text-right">Last 24 Hours</p>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-indigo-50/50 to-white dark:from-indigo-950/10 border-indigo-100 dark:border-indigo-900/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Infra Load</CardTitle>
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Cpu className="h-4 w-4 text-indigo-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{data?.infraLoad?.cpu || 0}%</div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Activity className="h-3 w-3 text-indigo-500" />
            Avg CPU utilization
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Memory</span>
                <span>{data?.infraLoad?.memory?.used || 0} GB / {data?.infraLoad?.memory?.total || 0} GB</span>
              </div>
              <Progress value={(data?.infraLoad?.memory?.used / data?.infraLoad?.memory?.total) * 100 || 0} className="h-1" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Storage</span>
                <span>{data?.infraLoad?.storage?.used || 0} TB / {data?.infraLoad?.storage?.total || 0} TB</span>
              </div>
              <Progress value={(data?.infraLoad?.storage?.used / data?.infraLoad?.storage?.total) * 100 || 0} className="h-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-slate-50/50 to-white dark:from-slate-900/10 border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Security Posture</CardTitle>
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Shield className="h-4 w-4 text-slate-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">Grade {data?.security?.grade || 'N/A'}</div>
          <p className="text-xs text-muted-foreground mt-1">Next audit in {data?.security?.nextAuditDays || 0} days</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-2 mt-4">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-100 dark:border-emerald-800/50 text-center">
              <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase">SSL</p>
              <p className="text-[10px] text-emerald-600 font-medium">{data?.security?.sslStatus || 'Unknown'}</p>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-100 dark:border-indigo-800/50 text-center">
              <p className="text-[10px] text-indigo-800 dark:text-indigo-400 font-bold uppercase">CDN</p>
              <p className="text-[10px] text-indigo-600 font-medium">{data?.security?.cdnStatus || 'Unknown'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TechSupportDashboardContent
