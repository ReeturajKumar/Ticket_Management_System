import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { UserPlus, FileText, HeartHandshake } from "lucide-react"

interface HRDashboardContentProps {
  data: any
  teamMembers?: any[]
}

export function HRDashboardContent({ data, teamMembers }: HRDashboardContentProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
      <Card className="bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/10 border-rose-100 dark:border-rose-900/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-rose-900 dark:text-rose-100">Employee Onboarding</CardTitle>
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
            <UserPlus className="h-4 w-4 text-rose-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.onboarding?.active || 0} Active</div>
          <p className="text-xs text-muted-foreground mt-1">{data?.onboarding?.pendingChecks || 0} pending background checks</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-rose-600">
              <span>Batch A Completion</span>
              <span>{data?.onboarding?.completionRate || 0}%</span>
            </div>
            <Progress value={data?.onboarding?.completionRate || 0} className="h-1.5 bg-rose-100" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/10 border-amber-100 dark:border-amber-900/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">Staff Policies</CardTitle>
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.policies?.complianceRate || 0}% Compliant</div>
          <p className="text-xs text-muted-foreground mt-1">Annual handbook acknowledgement</p>
          <div className="mt-4 flex -space-x-2 overflow-hidden">
            {teamMembers?.slice(0, 5).map((member) => (
              <div key={member.userId || member.id || `member-${member.name}`} className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                {member.name?.charAt(0).toUpperCase()}
              </div>
            ))}
            {teamMembers && teamMembers.length > 5 && (
              <div className="h-8 w-8 rounded-full border-2 border-white dark:border-slate-900 bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-600 underline">
                +{teamMembers.length - 5}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/10 border-emerald-100 dark:border-emerald-900/30">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Staff Wellness</CardTitle>
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <HeartHandshake className="h-4 w-4 text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.wellness?.score || 0} / 5.0</div>
          <p className="text-xs text-muted-foreground mt-1">Internal engagement score</p>
          <div className="mt-4 flex items-end gap-1.5 h-10">
            {(data?.wellness?.trend || [40, 60, 45, 80, 75, 90, 85]).map((h: number, i: number) => (
              <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-t-sm hover:bg-emerald-500 transition-colors cursor-help" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HRDashboardContent
