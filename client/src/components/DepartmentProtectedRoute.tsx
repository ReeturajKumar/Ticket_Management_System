import { Navigate } from "react-router-dom"
import { isDepartmentAuthenticated, getCurrentDepartmentUser } from "@/services/departmentAuthService"

interface DepartmentProtectedRouteProps {
  children: React.ReactNode
  requireHead?: boolean
}

export function DepartmentProtectedRoute({ children, requireHead = false }: DepartmentProtectedRouteProps) {
  if (!isDepartmentAuthenticated()) {
    // Redirect to department login if not authenticated
    return <Navigate to="/department/login" replace />
  }

  const user = getCurrentDepartmentUser()

  // Strict Role Check: Must be DEPARTMENT_USER
  if (!user || user.role !== 'DEPARTMENT_USER') {
    // If authenticated but wrong role (e.g. Student trying to access), clear and redirect
    localStorage.removeItem('dept_accessToken')
    localStorage.removeItem('dept_user')
    return <Navigate to="/department/login" replace />
  }
  
  // If route requires head access but user is not head
  if (requireHead && !user?.isHead) {
    return <Navigate to="/department/dashboard" replace />
  }

  return <>{children}</>
}
