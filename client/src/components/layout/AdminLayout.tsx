import { useState } from "react"
import { AdminHeader } from "./AdminHeader"
import { AdminSidebar } from "./AdminSidebar"
import { cn } from "@/lib/utils"
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useNotificationSocket } from "@/hooks/useNotificationSocket"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Initialize notification socket for real-time notifications
  useNotificationSocket()

  return (
    <div className="min-h-screen bg-[#032313] selection:bg-[#ACDF33]/30">
      {/* Header */}
      <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />
      
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content Area */}
      <main className={cn(
        "pt-16 transition-all duration-500 ease-in-out min-h-screen",
        "md:ml-64", 
        "bg-[#fcfdfe] rounded-tl-[2rem] md:rounded-tl-[3rem] relative"
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
