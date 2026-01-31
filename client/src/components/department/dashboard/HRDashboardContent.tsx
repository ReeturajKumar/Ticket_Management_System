import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { UserPlus, FileText, HeartHandshake } from "lucide-react"

interface HRDashboardContentProps {
  data: any
  teamMembers?: any[]
}

export function HRDashboardContent({ data, teamMembers }: HRDashboardContentProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card className="bg-linear-to-br from-rose-50/50 to-white dark:from-rose-950/10 border-rose-100 dark:border-rose-900/30 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3.5">
          <CardTitle className="text-xs font-bold text-rose-900 dark:text-rose-100 uppercase tracking-tight">Onboarding</CardTitle>
          <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
            <UserPlus className="h-3.5 w-3.5 text-rose-600" />
          </div>
        </CardHeader>
        <CardContent className="px-3.5 pb-2.5">
          <div className="text-lg font-bold">{data?.onboarding?.active || 0} Active</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{data?.onboarding?.pendingChecks || 0} pending checks</p>
          <div className="mt-2.5 space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-rose-600">
              <span>Batch A Progress</span>
              <span>{data?.onboarding?.completionRate || 0}%</span>
            </div>
            <Progress value={data?.onboarding?.completionRate || 0} className="h-1 bg-rose-100" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-amber-50/50 to-white dark:from-amber-950/10 border-amber-100 dark:border-amber-900/30 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3.5">
          <CardTitle className="text-xs font-bold text-amber-900 dark:text-amber-100 uppercase tracking-tight">Staff Policies</CardTitle>
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <FileText className="h-3.5 w-3.5 text-amber-600" />
          </div>
        </CardHeader>
        <CardContent className="px-3.5 pb-2.5">
          <div className="text-lg font-bold">{data?.policies?.complianceRate || 0}% Compliant</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Annual acknowledgement</p>
          <div className="mt-2.5 flex -space-x-1.5 overflow-hidden">
            {teamMembers?.slice(0, 5).map((member) => (
              <div key={member.userId || member.id || `member-${member.name}`} className="h-6 w-6 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                {member.name?.charAt(0).toUpperCase()}
              </div>
            ))}
            {teamMembers && teamMembers.length > 5 && (
              <div className="h-6 w-6 rounded-full border border-white bg-amber-100 flex items-center justify-center text-[9px] font-bold text-amber-600">
                +{teamMembers.length - 5}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-linear-to-br from-emerald-50/50 to-white dark:from-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3.5">
          <CardTitle className="text-xs font-bold text-emerald-900 dark:text-emerald-100 uppercase tracking-tight">Staff Wellness</CardTitle>
          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <HeartHandshake className="h-3.5 w-3.5 text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent className="px-3.5 pb-2.5">
          <div className="text-lg font-bold">{data?.wellness?.score || 0} / 5.0</div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Engagement score</p>
          <div className="mt-2.5 flex items-end gap-1 h-8">
            {(data?.wellness?.trend || [40, 60, 45, 80, 75, 90, 85]).map((h: number, i: number) => (
              <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-emerald-500/20 rounded-t-sm" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HRDashboardContent
