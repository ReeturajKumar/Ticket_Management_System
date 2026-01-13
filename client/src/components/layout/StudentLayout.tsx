import { useState } from "react"
import { StudentHeader } from "./StudentHeader"
import { StudentSidebar } from "./StudentSidebar"
import { cn } from "@/lib/utils"

interface StudentLayoutProps {
  children: React.ReactNode
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <StudentHeader onMenuClick={() => setIsSidebarOpen(true)} />
      
      {/* Sidebar */}
      <StudentSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <main className={cn(
        "pt-16 transition-all duration-300 ease-in-out",
        "md:ml-64" // Only offset on desktop
      )}>
        {children}
      </main>
    </div>
  )
}
