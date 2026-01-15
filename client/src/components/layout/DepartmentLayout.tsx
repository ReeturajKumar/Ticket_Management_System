import { useState } from "react"
// Layout wrapper for department pages
import { DepartmentHeader } from "./DepartmentHeader"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { cn } from "@/lib/utils"
import { DepartmentSidebar } from "./DepartmentSidebar"

interface DepartmentLayoutProps {
  children: React.ReactNode
}

export function DepartmentLayout({ children }: DepartmentLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <DepartmentHeader onMenuClick={() => setIsSidebarOpen(true)} />
      
      {/* Sidebar */}
      <DepartmentSidebar
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <main className={cn(
        "pt-16 transition-all duration-300 ease-in-out",
        "md:ml-56", // Offset for fixed sidebar (reduced from ml-64)
        "bg-slate-50/50" // Slight tint background
      )}>
        {children}
      </main>

      {/* Toast Notifications */}
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  )
}
