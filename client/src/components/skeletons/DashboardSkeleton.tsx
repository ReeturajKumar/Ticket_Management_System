import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Skeleton loading component for Dashboard page
 * Shows animated placeholders while content loads
 */
export function DashboardSkeleton() {
  return (
    <div className="flex-1 p-8 pt-6 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
        </div>
        <div className="h-10 w-32 bg-muted rounded" />
      </div>

      {/* Tabs Skeleton */}
      <div className="h-10 w-96 bg-muted rounded" />

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <div className="h-5 w-40 bg-muted rounded mb-2" />
            <div className="h-3 w-56 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px] bg-muted rounded" />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <div className="h-5 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-40 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px] bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardSkeleton
