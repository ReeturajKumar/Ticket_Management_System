import { useState, useEffect } from "react"
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

  // Listen for mobile menu toggle events
  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev)
    window.addEventListener('toggleSidebar', handleToggle)
    return () => window.removeEventListener('toggleSidebar', handleToggle)
  }, [])

  return (
    <div className="min-h-screen bg-[#032313]">
      {/* Header */}
      <DepartmentHeader />
      
      {/* Sidebar */}
      <DepartmentSidebar
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <main className={cn(
        "pt-16 transition-all duration-300 ease-in-out min-h-screen",
        // On tablet (md): margin only when sidebar is open
        // On desktop (lg+): always show margin (sidebar always visible)
        isSidebarOpen ? "md:ml-60 lg:ml-60" : "md:ml-0 lg:ml-60",
        "bg-white shadow-sm" 
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
