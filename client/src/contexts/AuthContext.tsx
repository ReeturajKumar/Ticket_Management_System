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
  refreshDepartmentToken,
  getCurrentDepartmentUser,
  storeDepartmentTokens,
  isDepartmentAuthenticated,
} from '@/services/departmentAuthService'
import { loginEmployee, logoutEmployee } from '@/services/employeeAuthService'

// ============================================================================
// AUTH CONTEXT - Centralized Authentication State Management
// Handles login, logout, token refresh, and user state
// ============================================================================

// User type
export interface DepartmentUser {
  id: string
  name: string
  email: string
  role: 'DEPARTMENT_USER' | 'EMPLOYEE'
  department?: string
  isHead?: boolean
  avatar?: string
}

// Auth context type
interface AuthContextType {
  // User state
  user: DepartmentUser | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Auth actions
  login: (email: string, password: string, rememberMe?: boolean, role?: 'DEPARTMENT_USER' | 'EMPLOYEE') => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (userData: Partial<DepartmentUser>) => void
  
  // Token management
  getAccessToken: () => string | null
  isTokenValid: () => boolean
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null)

// Token refresh interval (14 minutes - tokens typically expire at 15 min)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000

// Provider props
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<DepartmentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Check if user is authenticated
  const isAuthenticated = useMemo(() => !!user && isDepartmentAuthenticated(), [user])

  // Get access token
  const getAccessToken = useCallback(() => {
    return localStorage.getItem('dept_accessToken')
  }, [])

  // Check if token is valid (basic check)
  const isTokenValid = useCallback(() => {
    const token = getAccessToken()
    if (!token) return false
    
    try {
      // Decode JWT payload (without verification - just to check expiry)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiry = payload.exp * 1000 // Convert to milliseconds
      return Date.now() < expiry
    } catch {
      return false
    }
  }, [getAccessToken])

  // Refresh user data from storage or server
  const refreshUser = useCallback(async () => {
    const storedUser = getCurrentDepartmentUser()
    if (storedUser) {
      setUser(storedUser)
    }
  }, [])

  // Update user data
  const updateUser = useCallback((userData: Partial<DepartmentUser>) => {
    setUser(prev => {
      if (!prev) return null
      const updated = { ...prev, ...userData }
      // Also update localStorage
      localStorage.setItem('dept_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  // Refresh access token
  const performTokenRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    try {
      const newToken = await refreshDepartmentToken()
      if (!newToken) {
        // Token refresh failed - log out user
        console.warn('Token refresh failed, logging out')
        setUser(null)
        localStorage.removeItem('dept_accessToken')
        localStorage.removeItem('dept_refreshToken')
        localStorage.removeItem('dept_user')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing])

  // Login function
  const login = useCallback(async (
    email: string, 
    password: string, 
    rememberMe: boolean = false,
    requestedRole: 'DEPARTMENT_USER' | 'EMPLOYEE' = 'DEPARTMENT_USER'
  ): Promise<boolean> => {
    try {
      const loginMethod = requestedRole === 'EMPLOYEE' ? loginEmployee : loginDepartmentUser
      const response = await loginMethod(email, password)
      
      if (response.success && response.data) {
        const { accessToken, refreshToken, user: userData } = response.data
        
        if (accessToken && refreshToken && userData) {
          // Store tokens and user
          storeDepartmentTokens(accessToken, refreshToken, userData)
          
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
      
      toast.error(response.message || 'Login failed')
      return false
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
      return false
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (user?.role === 'EMPLOYEE') {
        await logoutEmployee()
      } else {
        await logoutDepartmentUser()
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear state
      setUser(null)
      
      // Clear all auth-related storage
      localStorage.removeItem('dept_accessToken')
      localStorage.removeItem('dept_refreshToken')
      localStorage.removeItem('dept_user')
      localStorage.removeItem('dept_rememberMe')
      
      toast.info('You have been logged out')
    }
  }, [])

  // Initial auth check on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      
      try {
        const token = localStorage.getItem('dept_accessToken')
        const storedUser = getCurrentDepartmentUser()
        
        if (token && storedUser) {
          // Check if token is still valid
          if (isTokenValid()) {
            setUser(storedUser)
          } else {
            // Try to refresh token
            const newToken = await refreshDepartmentToken()
            if (newToken) {
              setUser(storedUser)
            } else {
              // Clear invalid session
              localStorage.removeItem('dept_accessToken')
              localStorage.removeItem('dept_refreshToken')
              localStorage.removeItem('dept_user')
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [isTokenValid])

  // Set up automatic token refresh
  useEffect(() => {
    if (!isAuthenticated) return

    // Refresh token periodically
    const intervalId = setInterval(() => {
      if (isTokenValid()) {
        performTokenRefresh()
      }
    }, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
  }, [isAuthenticated, isTokenValid, performTokenRefresh])

  // Context value
  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    updateUser,
    getAccessToken,
    isTokenValid,
  }), [
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    updateUser,
    getAccessToken,
    isTokenValid,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
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
