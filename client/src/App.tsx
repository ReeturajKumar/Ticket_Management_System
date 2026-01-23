import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import CreatePublicTicketPage from "./pages/public/CreateTicket"

// Department Auth Pages
import DepartmentLoginPage from "./pages/department/auth/Login"
import DepartmentRegisterPage from "./pages/department/auth/Register"
import DepartmentVerifyOTP from "./pages/department/auth/VerifyOTP"
import DepartmentForgotPassword from "./pages/department/auth/ForgotPassword"
import DepartmentResetPassword from "./pages/department/auth/ResetPassword"

// Department Protected Pages
import DepartmentDashboard from "./pages/department/dashboard"
import DepartmentTicketsPage from "./pages/department/tickets"
import DepartmentTicketDetailsPage from "./pages/department/tickets/details"
import DepartmentProfilePage from "./pages/department/profile"
import TeamMemberDetailPage from "./pages/department/team/[userId]"
import DepartmentReportsPage from "./pages/department/reports"

// Protected Route Component
import { DepartmentProtectedRoute } from "./components/DepartmentProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Department Routes - Public Auth */}
        <Route path="/department/login" element={<DepartmentLoginPage />} />
        <Route path="/department/register" element={<DepartmentRegisterPage />} />
        <Route path="/department/verify-otp" element={<DepartmentVerifyOTP />} />
        <Route path="/department/forgot-password" element={<DepartmentForgotPassword />} />
        <Route path="/department/reset-password" element={<DepartmentResetPassword />} />

        {/* Department Routes - Protected */}
        <Route
          path="/department/dashboard"
          element={
            <DepartmentProtectedRoute>
              <DepartmentDashboard />
            </DepartmentProtectedRoute>
          }
        />
        <Route
          path="/department/profile"
          element={
            <DepartmentProtectedRoute>
              <DepartmentProfilePage />
            </DepartmentProtectedRoute>
          }
        />
        
        <Route
          path="/department/tickets"
          element={
            <DepartmentProtectedRoute>
              <DepartmentTicketsPage />
            </DepartmentProtectedRoute>
          }
        />

        {/* Specific route for unassigned tickets to avoid collision with :id param */}
        <Route
          path="/department/tickets/unassigned"
          element={
            <DepartmentProtectedRoute>
              <DepartmentTicketsPage />
            </DepartmentProtectedRoute>
          }
        />
        
        <Route
          path="/department/tickets/:id"
          element={
            <DepartmentProtectedRoute>
              <DepartmentTicketDetailsPage />
            </DepartmentProtectedRoute>
          }
        />

        <Route
          path="/department/team/:userId"
          element={
            <DepartmentProtectedRoute>
              <TeamMemberDetailPage />
            </DepartmentProtectedRoute>
          }
        />

        <Route
          path="/department/reports"
          element={
            <DepartmentProtectedRoute>
              <DepartmentReportsPage />
            </DepartmentProtectedRoute>
          }
        />

        {/* Public Routes */}
        <Route path="/submit-ticket" element={<CreatePublicTicketPage />} />
        <Route path="/" element={<Navigate to="/submit-ticket" replace />} />
        <Route path="*" element={<Navigate to="/submit-ticket" replace />} />
      </Routes>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </BrowserRouter>
  )
}

export default App
