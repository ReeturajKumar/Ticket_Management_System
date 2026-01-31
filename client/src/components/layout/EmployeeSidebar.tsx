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
      href: "/employee/tickets", // Assuming this will be created
      icon: Ticket,
    },
  ]

  return (
    <>
      {/* Mobile & Tablet Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-60 bg-[#032313] transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo / Branding */}
          <div className="flex h-16 items-center justify-start px-7">
            <Link to="/employee/dashboard" className="flex items-center transition-all hover:opacity-95">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            </Link>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
            
            {/* Menu Section */}
            <div>
              <div className="mb-6 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Menu
              </div>
              <div className="space-y-1.5">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => onClose?.()}
                        className={cn(
                          "relative flex cursor-pointer items-center gap-3.5 px-3 py-2.5 text-sm font-medium transition-all group rounded-xl",
                          isActive 
                            ? "bg-[#ACDF33]/10 text-white" 
                            : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <item.icon className={cn("size-5 shrink-0 transition-colors", isActive ? "text-[#ACDF33]" : "text-white/40 group-hover:text-white")} />
                        <span className={cn("transition-colors", isActive ? "text-white" : "text-white/80 group-hover:text-white")}>{item.title}</span>
                      </Link>
                  )
                })}
              </div>
            </div>



          </nav>

          {/* Bottom Navigation */}
          <div className="pb-8 px-4">
            <div className="h-px w-full bg-white/5 mb-6" />
            <button
              onClick={handleLogout}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3.5 px-3 py-2.5 text-sm font-medium transition-all",
                "text-red-400 hover:text-red-300"
              )}
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
