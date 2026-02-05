import { Button } from "@/components/ui/button"
import { Clock, ArrowDownRight, Loader2 } from "lucide-react"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  greeting?: string
  showLiveBadge?: boolean
  showTimeRange?: boolean
  showExport?: boolean
  isExporting?: boolean
  onExport?: () => void
  onViewTickets?: () => void
  showViewTickets?: boolean
  children?: React.ReactNode
}

export function DashboardHeader({
  title,
  subtitle,
  greeting,
  showLiveBadge = true,
  showTimeRange = false,
  showExport = false,
  isExporting = false,
  onExport,
  onViewTickets,
  showViewTickets = false,
  children
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div className="space-y-0.5">
        {greeting && (
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {greeting} 👋
          </h2>
        )}
        <h3 className={greeting ? "text-base font-semibold text-slate-500" : "text-2xl font-bold text-slate-900"}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium tracking-tight">
            {subtitle}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        {showLiveBadge && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
            <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </div>
        )}
        
        {showTimeRange && (
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="h-3.5 w-3.5" />
            Last 7 Days
          </Button>
        )}

        {showExport && (
          <Button size="sm" className="gap-2" onClick={onExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {isExporting ? 'Exporting...' : 'Export Report'}
          </Button>
        )}

        {children}

        {showViewTickets && (
          <Button size="sm" className="bg-[#ACDF33] hover:bg-[#ACDF33]/90 font-bold text-[#032313]" onClick={onViewTickets}>
            View All Tickets
          </Button>
        )}
      </div>
    </div>
  )
}

export function DashboardLoading() {
  return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
