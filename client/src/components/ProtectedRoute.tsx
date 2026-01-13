import { Navigate } from "react-router-dom"
import { isAuthenticated, getCurrentUser } from "@/lib/auth"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />
  }

  // Check role-based access if allowedRoles is provided
  if (allowedRoles && allowedRoles.length > 0) {
    const user = getCurrentUser()
    // Normalizing role comparison (case-insensitive)
    if (user && !allowedRoles.map(r => r.toUpperCase()).includes(user.role.toUpperCase())) {
      // Redirect to login if authorized but wrong role
      return <Navigate to="/login" replace />
    }
  }

  return <>{children}</>
}
