import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard,
  Ticket,
  LogOut,
} from "lucide-react"

interface SidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

export function EmployeeSidebar({ className, isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/employee/login'
  }

  const menuItems = [
    {
      title: "Dashboard",
      href: "/employee/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "My Tickets",
      href: "/employee/tickets",
      icon: Ticket,
    },
  ]

  return (
    <>
      {/* Mobile & Tablet Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-[#032313] transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        <div className="flex h-full flex-col">
          
          {/* Brand Logo Section */}
          <div className="px-6 h-16 flex items-center">
             <Link to="/employee/dashboard" className="flex items-center transition-all hover:opacity-90">
                <img src="/logo.png" alt="CloudBlitz Logo" className="h-10 w-auto object-contain" />
             </Link>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 px-4 space-y-6 overflow-y-auto pt-6">
            <div>
              <div className="mb-6 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                MENU
              </div>
              
              <div className="space-y-1.5">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        "relative flex cursor-pointer items-center gap-3.5 px-3 py-2.5 text-sm font-medium transition-all group rounded-xl",
                        isActive 
                          ? "bg-[#ACDF33]/10 text-white" 
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className={cn(
                        "size-5 shrink-0 transition-colors",
                        isActive ? "text-[#ACDF33]" : "text-white/40 group-hover:text-white"
                      )} />
                      <span className={cn(
                        "transition-colors",
                        isActive ? "text-white" : "text-white/80 group-hover:text-white"
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Bottom Logout Section */}
          <div className="px-4 pb-8 mt-auto">
             <div className="h-px w-full bg-white/5 mb-6" />
             
             <button
               onClick={handleLogout}
               className="flex w-full cursor-pointer items-center gap-3.5 px-3 py-2.5 text-sm font-medium transition-all text-red-400 hover:text-red-300"
             >
                <LogOut className="size-5 shrink-0" />
                <span>Logout</span>
             </button>
          </div>

        </div>
      </aside>
    </>
  )
}
