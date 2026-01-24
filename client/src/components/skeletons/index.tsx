/**
 * Skeleton loading components barrel export
 * Used for code-splitting fallback UI
 */

export { DashboardSkeleton } from './DashboardSkeleton'
export { TicketsSkeleton, TicketCardSkeleton, TicketListSkeleton } from './TicketsSkeleton'
export { ProfileSkeleton } from './ProfileSkeleton'
export { ReportsSkeleton } from './ReportsSkeleton'

// Generic page skeleton
export function PageSkeleton() {
  return (
    <div className="flex-1 p-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-4 w-72 bg-muted rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-muted rounded" />
        ))}
      </div>
    </div>
  )
}
