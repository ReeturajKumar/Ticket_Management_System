import { useState } from "react"
import { AdminHeader } from "./AdminHeader"
import { AdminSidebar } from "./AdminSidebar"
import { cn } from "@/lib/utils"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />
      
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <main className={cn(
        "pt-16 transition-all duration-300 ease-in-out",
        "md:ml-56", // Offset for fixed sidebar
        "bg-slate-50/50" // Slight tint background
      )}>
        {children}
      </main>
    </div>
  )
}
