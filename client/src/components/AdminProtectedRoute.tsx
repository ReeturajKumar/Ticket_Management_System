import { Navigate } from "react-router-dom"
import { isAdminAuthenticated, getCurrentAdminUser } from "@/services/adminAuthService"

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />
  }

  const user = getCurrentAdminUser()

  // Check if user is admin (ADMIN or SUPER_ADMIN role)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    // If authenticated but not admin, redirect to login
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
