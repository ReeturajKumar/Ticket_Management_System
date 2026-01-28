import { useState } from "react"
// Layout wrapper for department pages
import { DepartmentHeader } from "./DepartmentHeader"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { cn } from "@/lib/utils"
import { DepartmentSidebar } from "./DepartmentSidebar"
import { useNotificationSocket } from "@/hooks/useNotificationSocket"

interface DepartmentLayoutProps {
  children: React.ReactNode
}

export function DepartmentLayout({ children }: DepartmentLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Initialize socket-to-notification bridge
  // This listens to socket events and adds them to the notification store
  useNotificationSocket()

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <DepartmentHeader onMenuClick={toggleSidebar} />
      
      {/* Sidebar */}
      <DepartmentSidebar
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <main className={cn(
        "pt-16 transition-all duration-300 ease-in-out",
        // On tablet (md): margin only when sidebar is open
        // On desktop (lg+): always show margin (sidebar always visible)
        isSidebarOpen ? "md:ml-56 lg:ml-56" : "md:ml-0 lg:ml-56",
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
