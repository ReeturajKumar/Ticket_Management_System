import { useState, useEffect } from "react"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { cn } from "@/lib/utils"
import { EmployeeHeader } from "./EmployeeHeader"
import { EmployeeSidebar } from "./EmployeeSidebar"
import { useNotificationSocket } from "@/hooks"

interface EmployeeLayoutProps {
  children: React.ReactNode
}

export function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Start notification socket
  useNotificationSocket()

  // Listen for mobile menu toggle events
  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev)
    window.addEventListener('toggleSidebar', handleToggle)
    return () => window.removeEventListener('toggleSidebar', handleToggle)
  }, [])

  return (
    <div className="min-h-screen bg-[#032313] selection:bg-[#ACDF33]/30">
      {/* Header */}
      <EmployeeHeader />
      
      {/* Sidebar */}
      <EmployeeSidebar
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content Area */}
      <main className={cn(
        "pt-16 transition-all duration-300 ease-in-out min-h-screen",
        "lg:ml-64", 
        "bg-[#fcfdfe] rounded-tl-[2rem] lg:rounded-tl-[3.5rem] shadow-2xl relative" 
      )}>
        <div className="p-4 md:p-6 lg:p-8 max-w-[1700px] mx-auto">
           {children}
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        theme="light"
      />
    </div>
  )
}
