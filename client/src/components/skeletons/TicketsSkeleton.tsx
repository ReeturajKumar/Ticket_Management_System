import { Card, CardContent } from "@/components/ui/card"

/**
 * Skeleton loading component for Tickets page
 * Shows animated placeholders while content loads
 */
export function TicketsSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-40 bg-muted rounded" />
          <div className="h-9 w-20 bg-muted rounded" />
          <div className="h-9 w-20 bg-muted rounded" />
        </div>
      </div>

      {/* Tabs & Filters Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-10 w-96 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-64 bg-muted rounded" />
          <div className="h-10 w-36 bg-muted rounded" />
        </div>
      </div>

      {/* Kanban Board Skeleton */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((col) => (
          <div key={col} className="flex flex-col">
            {/* Column Header */}
            <div className="mb-4 flex items-center gap-2 border-b pb-2">
              <div className="h-2.5 w-2.5 bg-muted rounded-full" />
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-5 w-6 bg-muted rounded" />
            </div>
            
            {/* Column Content */}
            <div className="flex-1 space-y-3 min-h-[200px] rounded-lg p-3 bg-muted/30">
              {[1, 2, 3].map((card) => (
                <TicketCardSkeleton key={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Individual ticket card skeleton
 */
export function TicketCardSkeleton() {
  return (
    <Card className="mb-2.5">
      <CardContent className="p-2.5">
        <div className="space-y-1.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="h-3 w-12 bg-muted rounded" />
                <div className="h-3.5 w-14 bg-muted rounded" />
              </div>
              <div className="h-4 w-full bg-muted rounded mb-1" />
            </div>
          </div>

          {/* Description */}
          <div className="h-3 w-3/4 bg-muted rounded" />

          {/* Footer */}
          <div className="space-y-1.5 pt-1.5 border-t mt-1.5">
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-10 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * List view ticket skeleton
 */
export function TicketListSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
        </div>
      </div>

      {/* List Items */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-16 bg-muted rounded" />
                    <div className="h-5 w-14 bg-muted rounded" />
                    <div className="h-5 w-48 bg-muted rounded" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-full bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default TicketsSkeleton
