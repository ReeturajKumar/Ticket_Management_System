import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  loginDepartmentUser,
  logoutDepartmentUser,
  getCurrentDepartmentUser,
  storeDepartmentTokens,
  isDepartmentAuthenticated,
} from '@/services/departmentAuthService'
import { loginEmployee, logoutEmployee } from '@/services/employeeAuthService'
import { loginAdminUser, logoutAdminUser, getCurrentAdminUser, storeAdminUser, isAdminAuthenticated } from '@/services/adminAuthService'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds - balance between real-time and performance
      gcTime: 1000 * 60 * 30,    // 30 minutes
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

// ============================================================================
// AUTH CONTEXT - Centralized Authentication State Management
// Handles login, logout, and user state
// ============================================================================

// User type
export interface DepartmentUser {
  id: string
  name: string
  email: string
  role: 'DEPARTMENT_USER' | 'EMPLOYEE' | 'ADMIN'
  department?: string
  isHead?: boolean
  avatar?: string
  isApproved?: boolean
}

// Auth context type
interface AuthContextType {
  // User state
  user: DepartmentUser | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Auth actions
  login: (email: string, password: string, rememberMe?: boolean, role?: 'DEPARTMENT_USER' | 'EMPLOYEE' | 'ADMIN') => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (userData: Partial<DepartmentUser>) => void
  
  // Token management
  getToken: () => string | null
  isTokenValid: () => boolean
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<DepartmentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is authenticated
  const isAuthenticated = useMemo(() => {
    if (!user) return false
    return user.role === 'ADMIN' 
      ? isAdminAuthenticated() 
      : isDepartmentAuthenticated()
  }, [user])

  // Get current token
  const getToken = useCallback(() => {
    if (user?.role === 'ADMIN') {
      return localStorage.getItem('admin_token')
    }
    return localStorage.getItem('dept_token')
  }, [user?.role])

  // Check if token is valid (basic check)
  const isTokenValid = useCallback(() => {
    const token = getToken()
    if (!token) return false
    
    try {
      // Decode JWT payload (without verification - just to check expiry)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiry = payload.exp * 1000 // Convert to milliseconds
      return Date.now() < expiry
    } catch {
      return false
    }
  }, [getToken])

  // Refresh user data from storage or server
  const refreshUser = useCallback(async () => {
    const storedUser = getCurrentDepartmentUser() || getCurrentAdminUser()
    if (storedUser) {
      setUser(storedUser as DepartmentUser)
    }
  }, [])

  // Update user data
  const updateUser = useCallback((userData: Partial<DepartmentUser>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...userData }
      const prefix = (updated.role === 'ADMIN') ? 'admin' : 'dept'
      localStorage.setItem(`${prefix}_user`, JSON.stringify(updated))
      return updated
    })
  }, [])

  const login = useCallback(async (
    email: string, 
    password: string, 
    rememberMe: boolean = false,
    requestedRole: 'DEPARTMENT_USER' | 'EMPLOYEE' | 'ADMIN' = 'DEPARTMENT_USER'
  ): Promise<boolean> => {
    try {
      let result: any
      if (requestedRole === 'ADMIN') {
        result = await loginAdminUser(email, password, rememberMe)
      } else if (requestedRole === 'EMPLOYEE') {
        result = await loginEmployee(email, password)
      } else {
        result = await loginDepartmentUser(email, password)
      }
      
      if (result.success && result.data) {
        const { token, user: userData } = result.data
        
        if (token && userData) {
          if (requestedRole === 'ADMIN') {
            storeAdminUser(userData, token)
          } else {
            storeDepartmentTokens(token, userData)
          }
          
          // Store remember me preference
          if (rememberMe) {
            localStorage.setItem('dept_rememberMe', 'true')
          } else {
            localStorage.removeItem('dept_rememberMe')
          }
          
          // Update state
          setUser(userData as DepartmentUser)
          
          toast.success(`Welcome back, ${userData.name}!`)
          return true
        }
      }
      
      toast.error(result.message || 'Login failed')
      return false
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (user?.role === 'ADMIN') {
        await logoutAdminUser()
      } else if (user?.role === 'EMPLOYEE') {
        await logoutEmployee()
      } else {
        await logoutDepartmentUser()
      }
    } catch (error) {
      // Silent error during logout
    } finally {
      // Clear state
      setUser(null)
      
      // Clear all auth-related storage
      const prefixes = ['dept', 'admin']
      prefixes.forEach(p => {
        localStorage.removeItem(`${p}_token`)
        localStorage.removeItem(`${p}_user`)
        localStorage.removeItem(`${p}_rememberMe`)
      })
      
      toast.info('You have been logged out')
    }
  }, [user])

  // Initial auth check on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      
      try {
        const adminToken = localStorage.getItem('admin_token')
        const deptToken = localStorage.getItem('dept_token')
        const storedAdmin = getCurrentAdminUser()
        const storedDept = getCurrentDepartmentUser()
        
        if (adminToken && storedAdmin) {
          setUser(storedAdmin)
        } else if (deptToken && storedDept) {
          // Check if token is still valid (only for dept/employee for now)
          if (isTokenValid()) {
            setUser(storedDept)
          } else {
            // Re-login/Clear invalid session
            localStorage.removeItem('dept_token')
            localStorage.removeItem('dept_user')
          }
        }
      } catch (error) {
        // Silent error during auth initialization
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [isTokenValid])

  // Context value
  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    updateUser,
    getToken,
    isTokenValid,
  }), [
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    updateUser,
    getToken,
    isTokenValid,
  ])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Hook for checking specific permissions
export function usePermissions() {
  const { user, isAuthenticated } = useAuth()
  
  return useMemo(() => ({
    isAuthenticated,
    isHead: user?.role === 'DEPARTMENT_USER' && (user?.isHead ?? false),
    isStaff: user?.role === 'DEPARTMENT_USER' && !user?.isHead,
    isEmployee: user?.role === 'EMPLOYEE',
    isAdmin: user?.role === 'ADMIN',
    department: user?.department ?? null,
    
    // Permission checks
    canAssignTickets: user?.isHead ?? false,
    canViewAllTickets: user?.isHead ?? false,
    canBulkOperations: user?.isHead ?? false,
    canManageTeam: user?.isHead ?? false,
    canExportReports: user?.isHead ?? false,
  }), [user, isAuthenticated])
}

// Hook for auth-required navigation
export function useAuthNavigation() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  const requireAuth = useCallback((redirectTo: string = '/department/login') => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo)
      return false
    }
    return true
  }, [isAuthenticated, isLoading, navigate])

  const redirectIfAuthenticated = useCallback((redirectTo: string = '/department/dashboard') => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTo)
      return true
    }
    return false
  }, [isAuthenticated, isLoading, navigate])

  return {
    requireAuth,
    redirectIfAuthenticated,
  }
}

export default AuthProvider

