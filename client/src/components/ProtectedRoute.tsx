import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

type Role = 'ADMIN' | 'DEPARTMENT_USER' | 'EMPLOYEE'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: Role[]
  requireHead?: boolean
}

/**
 * Universal Protected Route component
 * Handles all roles and redirects to appropriate login pages
 */
export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  requireHead = false 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Helper to determine the correct login redirect path based on the current URL
  const getLoginPath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin/login'
    if (location.pathname.startsWith('/employee')) return '/employee/login'
    return '/department/login'
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to={getLoginPath()} state={{ from: location }} replace />
  }

  // Role check
  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role as Role)) {
    // If Admin trying to access Dept or vice versa, redirect to their home
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />
    }
    if (user.role === 'EMPLOYEE') {
      return <Navigate to="/employee/dashboard" replace />
    }
    return <Navigate to="/department/dashboard" replace />
  }

  // Department Head check
  if (requireHead && user && !user.isHead) {
    return <Navigate to="/department/dashboard" replace />
  }

  return <>{children}</>
}
