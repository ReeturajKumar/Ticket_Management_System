import { ErrorBoundary } from './ErrorBoundary'

// ============================================================================
// CHART ERROR BOUNDARY
// Wraps chart components to catch rendering errors gracefully
// ============================================================================

interface ChartErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback message */
  message?: string
}

/**
 * ChartErrorBoundary - Error boundary specifically for chart components
 * Provides a compact error UI that fits within card layouts
 */
export function ChartErrorBoundary({ children, message = "Failed to load chart data" }: ChartErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <div className="text-center">
            <p className="text-sm font-medium mb-1">{message}</p>
            <p className="text-xs">The chart could not be rendered. Please try refreshing the page.</p>
          </div>
        </div>
      }
      showDetails={false}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ChartErrorBoundary
