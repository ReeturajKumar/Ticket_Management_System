import { Navigate } from "react-router-dom"
import { isDepartmentAuthenticated, getCurrentDepartmentUser } from "@/services/departmentAuthService"

interface EmployeeProtectedRouteProps {
  children: React.ReactNode
}

export function EmployeeProtectedRoute({ children }: EmployeeProtectedRouteProps) {
  if (!isDepartmentAuthenticated()) {
    // Redirect to employee login if not authenticated
    return <Navigate to="/employee/login" replace />
  }

  const user = getCurrentDepartmentUser()

  // Role Check: Must be EMPLOYEE
  if (!user || user.role !== 'EMPLOYEE') {
    // If authenticated but wrong role, clear and redirect
    // We use the same storage for Department and Employee roles
    return <Navigate to="/employee/login" replace />
  }

  return <>{children}</>
}
