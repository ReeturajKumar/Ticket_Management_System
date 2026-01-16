import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import LoginPage from "./pages/auth/login"
import SignUpPage from "./pages/auth/signup"
import ForgotPassword from "./pages/auth/ForgotPassword"
import ResetPassword from "./pages/auth/ResetPassword"
import HomePage from "./pages/home"
import ProfilePage from "./pages/profile"
import CreateTicketPage from "./pages/tickets/create"
import TicketListPage from "./pages/tickets"
import TicketDetailsPage from "./pages/tickets/details"
import DepartmentLoginPage from "./pages/department/auth/Login"
import DepartmentRegisterPage from "./pages/department/auth/Register"
import DepartmentVerifyOTP from "./pages/department/auth/VerifyOTP"
import DepartmentForgotPassword from "./pages/department/auth/ForgotPassword"
import DepartmentResetPassword from "./pages/department/auth/ResetPassword"
import DepartmentDashboard from "./pages/department/dashboard"
import DepartmentTicketsPage from "./pages/department/tickets"
import DepartmentTicketDetailsPage from "./pages/department/tickets/details"
import { DepartmentProtectedRoute } from "./components/DepartmentProtectedRoute"
import DepartmentProfilePage from "./pages/department/profile"
import TeamMemberDetailPage from "./pages/department/team/[userId]"
import DepartmentReportsPage from "./pages/department/reports"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <HomePage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/tickets"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <TicketListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/new"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <CreateTicketPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <TicketDetailsPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        
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

        {/* Default redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </BrowserRouter>
  )
}

export default App
