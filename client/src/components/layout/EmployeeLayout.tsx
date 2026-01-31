import { useState, useEffect } from "react"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { cn } from "@/lib/utils"
import { EmployeeHeader } from "./EmployeeHeader"
import { EmployeeSidebar } from "./EmployeeSidebar"

interface EmployeeLayoutProps {
  children: React.ReactNode
}

export function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Listen for mobile menu toggle events
  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev)
    window.addEventListener('toggleSidebar', handleToggle)
    return () => window.removeEventListener('toggleSidebar', handleToggle)
  }, [])

  return (
    <div className="min-h-screen bg-[#032313]">
      {/* Header */}
      <EmployeeHeader />
      
      {/* Sidebar */}
      <EmployeeSidebar
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <main className={cn(
        "pt-16 transition-all duration-300 ease-in-out min-h-screen",
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
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme="light"
      />
    </div>
  )
}
