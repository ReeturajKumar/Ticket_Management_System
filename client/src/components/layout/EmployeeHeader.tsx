import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import {
  LogOut,
  Plus,
  ChevronDown,
} from "lucide-react"
import { CreateEmployeeTicketDialog } from "@/components/employee/CreateEmployeeTicketDialog"
import { NotificationBell } from "@/components/notifications/NotificationBell"

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
      "fixed top-0 left-0 right-0 z-50 h-16 bg-[#032313] transition-all duration-300 ease-in-out",
      "lg:left-64 lg:right-0 lg:w-[calc(100%-16rem)]"
    )}>
      <div className="flex h-full items-center justify-between px-6 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggleSidebar'))}
            className="lg:hidden p-2 -ml-2 text-white/60 hover:bg-white/5 rounded-xl transition-colors focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden lg:flex items-center gap-2 select-none">
             <div className="flex flex-col leading-tight">
               <span className="text-[15px] font-bold text-white tracking-tight">Internal Portal</span>
               <span className="text-[10px] font-black text-[#ACDF33] uppercase tracking-[0.2em]">
                  Employee Center
               </span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Live Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#ACDF33]/10 rounded-full border border-[#ACDF33]/20 select-none transition-all hover:bg-[#ACDF33]/20">
             <div className="size-1.5 rounded-full bg-[#ACDF33] animate-pulse" />
             <span className="text-[9px] font-black text-[#ACDF33] uppercase tracking-wider">Live</span>
          </div>

          <Button 
             onClick={() => setCreateDialogOpen(true)}
             className="flex items-center gap-3 bg-[#ACDF33] text-[#032313] hover:bg-[#ACDF33]/90 rounded-full px-5 h-10 font-bold active:scale-95 transition-all shadow-[0_4px_15px_rgba(172,223,51,0.2)] focus-visible:ring-0"
          >
             <span className="text-xs uppercase tracking-wide hidden sm:inline">New Ticket</span>
             <Plus className="size-4 shrink-0" />
          </Button>

          {/* Notification Bell */}
          <NotificationBell className="text-white/40 hover:text-[#ACDF33]" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="group flex items-center gap-2.5 py-1 px-1 rounded-full transition-all active:scale-95 select-none focus:outline-none hover:bg-white/5">
                <div className="size-8.5 rounded-full bg-[#152e22] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#ACDF33]/30 transition-colors">
                  <Avatar className="size-full rounded-none">
                    <AvatarFallback className="bg-transparent text-[11px] font-extrabold text-white/50 group-hover:text-[#ACDF33] transition-colors">
                      {getInitials(user?.name || "US")}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <ChevronDown className="size-3.5 text-white/40 group-hover:text-white transition-colors group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-[240px] mt-2 p-0 rounded-xl bg-white border-none shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-4 select-none">
                   <h3 className="text-[15px] font-bold text-slate-900 leading-tight truncate">{user?.name}</h3>
                   <p className="text-[12px] font-medium text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>
                
                <div className="h-[1px] w-full bg-slate-100" />
                
                <div className="p-1">
                   <DropdownMenuItem
                    className="group flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer hover:!bg-red-50 focus:!bg-red-50 text-[#FF4D4D] focus:text-[#FF4D4D] transition-colors border-none"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4 stroke-[2.5]" />
                    <span className="text-[14px] font-bold">Log out</span>
                  </DropdownMenuItem>
                </div>
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
