import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subValue?: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  trend?: {
    value: string | number
    label: string
    isPositive: boolean
    color?: string
  }
  className?: string
  variant?: 'default' | 'dark'
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  iconBg = "bg-slate-50",
  iconColor = "text-slate-600",
  trend,
  className,
  variant = 'default',
  onClick
}: StatCardProps) {
  if (variant === 'dark') {
    return (
      <Card 
        className={cn(
          "hover:shadow-lg transition-all border-none shadow-md bg-[#032313] text-white rounded-3xl overflow-hidden cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-2 bg-[#ACDF33] rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">Update</span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] opacity-60 font-medium">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <h3 className="text-base font-bold leading-tight">
              {value} {title}
              {subValue && <span className="block text-[#ACDF33] text-lg mt-0.5">{subValue}</span>}
            </h3>
          </div>
          {onClick && (
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors group">
              <span>View Details</span>
              <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-all border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</h4>
          <div className={cn("p-1.5 rounded-xl", iconBg)}>
            <Icon className={cn("size-4", iconColor)} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {trend && (
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {trend.isPositive ? (
                <TrendingUp className={cn("size-3.5", trend.color || "text-emerald-500")} />
              ) : (
                <TrendingDown className={cn("size-3.5", trend.color || "text-amber-500")} />
              )}
              <span className={trend.color || (trend.isPositive ? "text-emerald-600" : "text-amber-600")}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface AnalyticsKPICardProps {
  title: string
  value: string | number
  trend: {
    percentage: number
    isPositive: boolean
    label?: string
  }
  variant?: 'dark' | 'light'
}

export function AnalyticsKPICard({
  title,
  value,
  trend,
  variant = 'light'
}: AnalyticsKPICardProps) {
  if (variant === 'dark') {
    return (
      <Card className="hover:shadow-xl transition-all border-none bg-gradient-to-br from-[#032112] to-[#04331a] text-white rounded-[2rem] p-6 h-48 group overflow-hidden relative flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#ACDF33]/5 blur-[40px] rounded-full -mr-12 -mt-12" />
        <div className="flex justify-between items-start z-10">
          <h4 className="text-[10px] font-bold opacity-60 uppercase tracking-[0.1em] text-[#ACDF33]">{title}</h4>
          <div className="size-10 rounded-full bg-white text-[#032112] flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg">
            <ArrowUpRight className="size-4.5" strokeWidth={2} />
          </div>
        </div>
        <div className="z-10">
          <h3 className="text-4xl font-bold tracking-tight leading-none mb-3">{value}</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#ACDF33] text-[#032112] rounded text-[10px] font-bold uppercase tracking-wider">
              <span>{trend.percentage}%</span>
              {trend.isPositive ? <ArrowUpRight className="size-2.5" strokeWidth={2.5} /> : <TrendingDown className="size-2.5" strokeWidth={2.5} />}
            </div>
            <span className="text-[10px] font-semibold opacity-50">{trend.label || 'vs last period'}</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-xl transition-all border border-slate-100 bg-white rounded-[2rem] p-6 h-48 group overflow-hidden relative flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start z-10">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">{title}</h4>
        <div className="size-10 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:bg-[#ACDF33] group-hover:border-[#ACDF33] group-hover:text-[#032112] transition-all cursor-pointer shadow-sm">
          <ArrowUpRight className="size-4.5" strokeWidth={2} />
        </div>
      </div>
      <div className="z-10">
        <h3 className="text-4xl font-bold text-slate-900 tracking-tight leading-none mb-3">{value}</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200/50">
            <span>{trend.percentage}%</span>
            {trend.isPositive ? <TrendingUp className="size-2.5" strokeWidth={2.5} /> : <TrendingDown className="size-2.5" strokeWidth={2.5} />}
          </div>
          <span className="text-[10px] font-semibold text-slate-400">{trend.label || 'vs last period'}</span>
        </div>
      </div>
    </Card>
  )
}

interface ReportStatCardProps {
  title: string
  value: string | number
  subText: string
  icon: LucideIcon
  variant?: 'dark' | 'light'
}

export function ReportStatCard({
  title,
  value,
  subText,
  icon: Icon,
  variant = 'light'
}: ReportStatCardProps) {
  if (variant === 'dark') {
    return (
      <Card className="hover:shadow-md transition-all border-none bg-[#032112] text-white rounded-2xl p-4 h-32 group overflow-hidden relative flex flex-col justify-between shadow-sm">
        <div className="flex justify-between items-start z-10">
          <h4 className="text-[9px] font-bold opacity-60 uppercase tracking-widest text-[#ACDF33]">{title}</h4>
          <Icon className="size-3.5 text-[#ACDF33] opacity-50" />
        </div>
        <div className="z-10">
          <h3 className="text-2xl font-bold tracking-tight leading-none mb-1">{value}</h3>
          <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">{subText}</p>
        </div>
      </Card>
    )
  }

  // Try to determine color from icon name or other heuristic if needed, or pass as prop. 
  // For now simple default.
  
  return (
    <Card className="hover:shadow-md transition-all border border-slate-100 bg-white rounded-2xl p-4 h-32 group overflow-hidden relative flex flex-col justify-between shadow-sm">
      <div className="flex justify-between items-start z-10">
        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{title}</h4>
        <Icon className="size-3.5 opacity-50 text-slate-500" />
      </div>
      <div className="z-10">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">{value}</h3>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{subText}</p>
      </div>
    </Card>
  )
}
