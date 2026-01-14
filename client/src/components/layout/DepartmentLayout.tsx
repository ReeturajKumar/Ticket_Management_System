import { useState } from "react"
// Layout wrapper for department pages
import { DepartmentHeader } from "./DepartmentHeader"

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
        "md:ml-64", // Offset for fixed sidebar
        "bg-slate-50/50" // Slight tint background
      )}>
        {children}
      </main>
    </div>
  )
}
