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
import { NotificationBell } from "@/components/notifications/NotificationBell"
import {
  LogOut,
  Menu,
  ChevronDown,
} from "lucide-react"

interface AdminHeaderProps {
  onMenuClick?: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, logout } = useAuth()
  
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
    window.location.href = '/admin/login'
  }

  return (
    <header className={cn(
      "fixed top-0 right-0 z-30 h-16 bg-[#032313] transition-all duration-500",
      "left-0 md:left-64"
    )}>
      <div className="flex h-full items-center justify-between px-8">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden size-10 rounded-xl text-white/60 hover:bg-white/5 focus-visible:ring-0"
            onClick={onMenuClick}
          >
            <Menu className="size-6" />
          </Button>

          <div className="hidden md:flex items-center gap-2 select-none">
             <div className="flex flex-col leading-tight">
               <span className="text-[15px] font-bold text-white tracking-tight">System OS</span>
               <span className="text-[10px] font-black text-[#ACDF33] uppercase tracking-[0.2em]">
                  Control Center
               </span>
             </div>
          </div>
        </div>

        {/* Right Section / Global Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          
          {/* Live Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#ACDF33]/10 rounded-full border border-[#ACDF33]/20 select-none transition-all hover:bg-[#ACDF33]/20">
             <div className="size-1.5 rounded-full bg-[#ACDF33] animate-pulse" />
             <span className="text-[9px] font-black text-[#ACDF33] uppercase tracking-wider">Live</span>
          </div>

          {/* Notification Bell */}
          <NotificationBell className="text-white/40 hover:text-[#ACDF33]" />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="group flex items-center gap-2.5 py-1 px-1 rounded-full transition-all active:scale-95 select-none focus:outline-none hover:bg-white/5"
              >
                <div className="size-8.5 rounded-full bg-[#152e22] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#ACDF33]/30 transition-colors">
                  <Avatar className="size-full rounded-none">
                    <AvatarFallback className="bg-transparent text-[11px] font-extrabold text-white/50 group-hover:text-[#ACDF33] transition-colors">
                      {getInitials(user?.name || "AD")}
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
    </header>
  )
}
