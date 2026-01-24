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
  ProfileSkeleton, 
  ReportsSkeleton,
  PageSkeleton 
} from "./components/skeletons"

// Public pages - loaded immediately (entry points)
import CreatePublicTicketPage from "./pages/public/CreateTicket"

// Department Auth Pages - loaded immediately (entry points for auth flow)
import DepartmentLoginPage from "./pages/department/auth/Login"
import DepartmentRegisterPage from "./pages/department/auth/Register"
import DepartmentVerifyOTP from "./pages/department/auth/VerifyOTP"
import DepartmentForgotPassword from "./pages/department/auth/ForgotPassword"
import DepartmentResetPassword from "./pages/department/auth/ResetPassword"

// Protected Route Component
import { DepartmentProtectedRoute } from "./components/DepartmentProtectedRoute"

// ============================================================================
// LAZY LOADED PAGES (Code Splitting)
// These pages are loaded only when the user navigates to them
// This reduces the initial bundle size and improves first load performance
// ============================================================================

const DepartmentDashboard = lazy(() => import("./pages/department/dashboard"))
const DepartmentTicketsPage = lazy(() => import("./pages/department/tickets"))
const DepartmentTicketDetailsPage = lazy(() => import("./pages/department/tickets/details"))
const DepartmentProfilePage = lazy(() => import("./pages/department/profile"))
const TeamMemberDetailPage = lazy(() => import("./pages/department/team/[userId]"))
const DepartmentReportsPage = lazy(() => import("./pages/department/reports"))

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
              <Route path="/department/verify-otp" element={<DepartmentVerifyOTP />} />
              <Route path="/department/forgot-password" element={<DepartmentForgotPassword />} />
              <Route path="/department/reset-password" element={<DepartmentResetPassword />} />

              {/* Department Routes - Protected (Lazy Loaded with Skeletons) */}
              <Route
                path="/department/dashboard"
                element={
                  <DepartmentProtectedRoute>
                    <LazyRoute fallback={<DashboardSkeleton />}>
                      <DepartmentDashboard />
                    </LazyRoute>
                  </DepartmentProtectedRoute>
                }
              />
              <Route
                path="/department/profile"
                element={
                  <DepartmentProtectedRoute>
                    <LazyRoute fallback={<ProfileSkeleton />}>
                      <DepartmentProfilePage />
                    </LazyRoute>
                  </DepartmentProtectedRoute>
                }
              />
              
              <Route
                path="/department/tickets"
                element={
                  <DepartmentProtectedRoute>
                    <LazyRoute fallback={<TicketsSkeleton />}>
                      <DepartmentTicketsPage />
                    </LazyRoute>
                  </DepartmentProtectedRoute>
                }
              />

              {/* Specific route for unassigned tickets to avoid collision with :id param */}
              <Route
                path="/department/tickets/unassigned"
                element={
                  <DepartmentProtectedRoute>
                    <LazyRoute fallback={<TicketsSkeleton />}>
                      <DepartmentTicketsPage />
                    </LazyRoute>
                  </DepartmentProtectedRoute>
                }
              />
              
              <Route
                path="/department/tickets/:id"
                element={
                  <DepartmentProtectedRoute>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <DepartmentTicketDetailsPage />
                    </LazyRoute>
                  </DepartmentProtectedRoute>
                }
              />

              <Route
                path="/department/team/:userId"
                element={
                  <DepartmentProtectedRoute>
                    <LazyRoute fallback={<PageSkeleton />}>
                      <TeamMemberDetailPage />
                    </LazyRoute>
                  </DepartmentProtectedRoute>
                }
              />

              <Route
                path="/department/reports"
                element={
                  <DepartmentProtectedRoute>
                    <LazyRoute fallback={<ReportsSkeleton />}>
                      <DepartmentReportsPage />
                    </LazyRoute>
                  </DepartmentProtectedRoute>
                }
              />

              {/* Public Routes */}
                <Route path="/submit-ticket" element={<CreatePublicTicketPage />} />
                <Route path="/" element={<Navigate to="/submit-ticket" replace />} />
                <Route path="*" element={<Navigate to="/submit-ticket" replace />} />
              </Routes>
              <ToastContainer position="bottom-right" autoClose={3000} />
            </TicketStoreProvider>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
