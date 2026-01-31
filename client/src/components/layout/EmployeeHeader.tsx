import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import {
  LogOut,
  Plus,
} from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { CreateEmployeeTicketDialog } from "@/components/employee/CreateEmployeeTicketDialog"

export function EmployeeHeader() {
  const { user, logout } = useAuth()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  
  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/employee/login'
  }

  return (
    <header className={cn(
      "fixed top-0 z-50 w-full bg-[#032313] transition-all duration-300 ease-in-out",
      "lg:left-60 lg:w-[calc(100%-15rem)]"
    )}>
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Mobile Menu Button - Only visible on mobile/tablet */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))}
          className="lg:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-4 lg:gap-8 flex-1">
          {/* Context Display - Showing Role */}
          <div className="hidden lg:flex items-center gap-2">
             <div className="flex flex-col leading-tight">
               <span className="text-lg font-bold text-white uppercase tracking-wide">Internal Portal</span>
               <span className="text-[11px] font-extrabold text-[#ACDF33] uppercase tracking-wider opacity-90">
                  Internal Employee
               </span>
             </div>
          </div>
        </div>

        {/* Right Section - Functional Actions */}
        <div className="flex items-center gap-3">
          <Button 
             onClick={() => setCreateDialogOpen(true)}
             className="flex items-center justify-center sm:justify-between gap-3 bg-[#ACDF33] text-[#032313] hover:bg-[#ACDF33]/90 border border-white/10 rounded-full px-3 sm:px-5 h-10 min-w-[40px] sm:min-w-[170px] font-extrabold shadow-sm active:scale-95 transition-all"
          >
             <span className="text-[12px] uppercase tracking-wide hidden sm:inline">Create Ticket</span>
             <div className="flex size-6 items-center justify-center rounded-full bg-[#032313]/10">
                <Plus className="size-3.5 text-[#032313]" />
             </div>
          </Button>

           <div className="flex items-center gap-1.5 border-l border-white/10 pl-3 ml-1">
              <NotificationBell className="text-white hover:text-white" />
           </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="cursor-pointer p-0 hover:bg-transparent"
              >
                <Avatar className="size-9 border-2 border-white/20 shadow-sm ring-1 ring-white/10">
                  <AvatarFallback className="bg-[#ACDF33] text-xs font-black text-[#032313]">
                    {getInitials(user?.name || "Employee")}
                  </AvatarFallback>
                 </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CreateEmployeeTicketDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {}}
      />
    </header>
  )
}
