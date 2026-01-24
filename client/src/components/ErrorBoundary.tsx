import React, { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, RefreshCcw, Home, Bug } from 'lucide-react'

// ============================================================================
// ERROR BOUNDARY COMPONENT
// Catches JavaScript errors anywhere in child component tree
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback component */
  fallback?: ReactNode
  /** Called when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Whether to show detailed error info (dev mode) */
  showDetails?: boolean
  /** Custom reset handler */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Store error info for display
    this.setState({ errorInfo })
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    // In production, you would send this to an error reporting service
    // Example: logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    this.props.onReset?.()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details (development mode) */}
              {this.props.showDetails && this.state.error && (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                    <Bug className="h-4 w-4" />
                    Error Details
                  </div>
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-muted-foreground">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleReset} 
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleReload} 
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  className="flex-1"
                  variant="ghost"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// ERROR FALLBACK COMPONENTS
// ============================================================================

interface ErrorFallbackProps {
  error?: Error
  resetErrorBoundary?: () => void
  title?: string
  description?: string
}

/**
 * Simple error fallback for inline errors
 */
export function ErrorFallback({ 
  error, 
  resetErrorBoundary,
  title = "Something went wrong",
  description = "An error occurred while loading this content."
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {description}
      </p>
      {error && (
        <p className="text-xs text-muted-foreground font-mono mb-4 p-2 bg-muted rounded">
          {error.message}
        </p>
      )}
      {resetErrorBoundary && (
        <Button onClick={resetErrorBoundary} size="sm">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )
}

/**
 * Compact error fallback for cards/small sections
 */
export function CompactErrorFallback({ resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <span>Failed to load</span>
      {resetErrorBoundary && (
        <Button onClick={resetErrorBoundary} size="sm" variant="ghost" className="h-7 px-2">
          Retry
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// HIGHER-ORDER COMPONENT VERSION
// ============================================================================

/**
 * HOC to wrap a component with error boundary
 * 
 * @example
 * const SafeTicketList = withErrorBoundary(TicketList, {
 *   fallback: <TicketListErrorFallback />,
 *   onError: (error) => logError(error),
 * });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`

  return ComponentWithErrorBoundary
}

export default ErrorBoundary
