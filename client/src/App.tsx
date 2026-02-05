import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Error Boundary for catching runtime errors
import { ErrorBoundary } from "./components/ErrorBoundary"

// Global State Providers
import { AuthProvider } from "./contexts/AuthContext"
import { SocketProvider } from "./contexts/SocketContext"
import { TicketStoreProvider } from "./stores/ticketStore"
import { NotificationProvider } from "./stores/notificationStore"

// Skeleton loading components for code-split routes
import { 
  DashboardSkeleton, 
  TicketsSkeleton, 
  ReportsSkeleton,
  PageSkeleton 
} from "./components/skeletons"

// Public pages - loaded immediately (entry points)
import CreatePublicTicketPage from "./pages/public/CreateTicket"

// Department Auth Pages - loaded immediately (entry points for auth flow)
import DepartmentLoginPage from "./pages/department/auth/Login"
import DepartmentRegisterPage from "./pages/department/auth/Register"

// Forgot/Reset password routes removed as per request

// Admin Auth Pages - loaded immediately (entry points for auth flow)
import AdminLoginPage from "./pages/admin/auth/Login"

// Employee Auth Pages
import EmployeeLoginPage from "./pages/employee/auth/Login"
import EmployeeRegisterPage from "./pages/employee/auth/Register"

// Protected Route Components
import { ProtectedRoute } from "./components/ProtectedRoute"
import AdminTicketDetailsPage from "./pages/admin/tickets/[ticketId]"

// ============================================================================
// LAZY LOADED PAGES (Code Splitting)
// These pages are loaded only when the user navigates to them
// This reduces the initial bundle size and improves first load performance
// ============================================================================

const DepartmentDashboard = lazy(() => import("./pages/department/dashboard/Overview"))
const DepartmentAnalyticsPage = lazy(() => import("./pages/department/dashboard/AnalyticsPage"))
const DepartmentTeamPerformancePage = lazy(() => import("./pages/department/dashboard/TeamPerformancePage"))
const DepartmentTicketsPage = lazy(() => import("./pages/department/tickets"))
const DepartmentTicketDetailsPage = lazy(() => import("./pages/department/tickets/details"))
// Profile page removed as per request
const TeamMemberDetailPage = lazy(() => import("./pages/department/team/[userId]"))
const DepartmentReportsPage = lazy(() => import("./pages/department/reports"))

// Admin Pages - Lazy Loaded
const AdminDashboardPage = lazy(() => import("./pages/admin/dashboard"))
const AdminPendingUsersPage = lazy(() => import("./pages/admin/pending-users"))
const AdminUsersPage = lazy(() => import("./pages/admin/users"))
const AdminTicketsPage = lazy(() => import("./pages/admin/tickets"))
const AdminAnalyticsPage = lazy(() => import("./pages/admin/analytics"))
const AdminUserDetailsPage = lazy(() => import("./pages/admin/users/[userId]"))

// Employee Pages
const EmployeeDashboard = lazy(() => import("./pages/employee/dashboard"))
const EmployeeTicketsPage = lazy(() => import("./pages/employee/tickets/index"))
const EmployeeTicketDetailsPage = lazy(() => import("./pages/employee/tickets/details/index"))

// ============================================================================
// LAZY ROUTE WRAPPER
// Provides Suspense boundary with appropriate skeleton for each route
// ============================================================================

interface LazyRouteProps {
  children: React.ReactNode
  fallback: React.ReactNode
}

function LazyRoute({ children, fallback }: LazyRouteProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>
}

function App() {
  // Check if running in development mode
  const isDevelopment = import.meta.env.DEV

  return (
    <ErrorBoundary 
      showDetails={isDevelopment}
      onError={(error, errorInfo) => {
        // In production, you would send this to an error tracking service
        // Example: Sentry.captureException(error, { extra: errorInfo })
        console.error('App Error:', error, errorInfo)
      }}
    >
      <BrowserRouter>
        {/* Global State Providers */}
        <AuthProvider>
          {/* Socket Provider - Manages real-time connection */}
          <SocketProvider autoConnect>
            {/* Notification Provider - Manages notifications state */}
            <NotificationProvider>
              <TicketStoreProvider>
                <Routes>
              {/* Department Routes - Public Auth (Not lazy loaded - entry points) */}
              <Route path="/department/login" element={<DepartmentLoginPage />} />
              <Route path="/department/register" element={<DepartmentRegisterPage />} />

              {/* Forgot/Reset password routes removed */}

              {/* Admin Auth Routes - Public */}
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Employee Auth Routes - Public */}
              <Route path="/employee/login" element={<EmployeeLoginPage />} />
              <Route path="/employee/register" element={<EmployeeRegisterPage />} />

              <Route
                path="/employee/dashboard"
                element={
                  <ProtectedRoute requiredRoles={['EMPLOYEE']}>
                    <LazyRoute fallback={<DashboardSkeleton />}>
                      <EmployeeDashboard />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/tickets"
                element={
                  <ProtectedRoute requiredRoles={['EMPLOYEE']}>
                    <LazyRoute fallback={<TicketsSkeleton />}>
                      <EmployeeTicketsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/tickets/:id"
                element={
                  <ProtectedRoute requiredRoles={['EMPLOYEE']}>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <EmployeeTicketDetailsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />

              {/* Department Routes - Protected (Lazy Loaded with Skeletons) */}
              <Route
                path="/department/dashboard"
                element={
                   <ProtectedRoute requiredRoles={['DEPARTMENT_USER']}>
                    <LazyRoute fallback={<DashboardSkeleton />}>
                      <DepartmentDashboard />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/department/analytics"
                element={
                  <ProtectedRoute requiredRoles={['DEPARTMENT_USER']} requireHead>
                    <LazyRoute fallback={<DashboardSkeleton />}>
                      <DepartmentAnalyticsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/department/team"
                element={
                  <ProtectedRoute requiredRoles={['DEPARTMENT_USER']} requireHead>
                    <LazyRoute fallback={<DashboardSkeleton />}>
                      <DepartmentTeamPerformancePage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              {/* Profile route removed */}
              
              <Route
                path="/department/tickets"
                element={
                  <ProtectedRoute requiredRoles={['DEPARTMENT_USER']}>
                    <LazyRoute fallback={<TicketsSkeleton />}>
                      <DepartmentTicketsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />

              {/* Specific route for unassigned tickets to avoid collision with :id param */}
              <Route
                path="/department/tickets/unassigned"
                element={
                  <ProtectedRoute requiredRoles={['DEPARTMENT_USER']}>
                    <LazyRoute fallback={<TicketsSkeleton />}>
                      <DepartmentTicketsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/department/tickets/:id"
                element={
                  <ProtectedRoute requiredRoles={['DEPARTMENT_USER']}>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <DepartmentTicketDetailsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/department/team/:userId"
                element={
                  <ProtectedRoute requiredRoles={['DEPARTMENT_USER']}>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <TeamMemberDetailPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/department/reports"
                element={
                  <ProtectedRoute requiredRoles={['DEPARTMENT_USER']} requireHead>
                    <LazyRoute fallback={<ReportsSkeleton />}>
                      <DepartmentReportsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <LazyRoute fallback={<DashboardSkeleton />}>
                      <AdminDashboardPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pending-users"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <AdminPendingUsersPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <AdminUsersPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/:userId"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <AdminUserDetailsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tickets"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <LazyRoute fallback={<TicketsSkeleton />}>
                      <AdminTicketsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tickets/:ticketId"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <AdminTicketDetailsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <LazyRoute fallback={<ReportsSkeleton />}>
                      <AdminAnalyticsPage />
                    </LazyRoute>
                  </ProtectedRoute>
                }
              />

              {/* Public Routes */}
                <Route path="/submit-ticket" element={<CreatePublicTicketPage />} />
                <Route path="/" element={<Navigate to="/submit-ticket" replace />} />
                <Route path="*" element={<Navigate to="/submit-ticket" replace />} />
              </Routes>
              <ToastContainer 
                position="bottom-right" 
                autoClose={4000} 
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                limit={3}
              />
            </TicketStoreProvider>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
