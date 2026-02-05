import { Link, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard,
  Users,
  Ticket,
  BarChart3,
  UserCheck,
  LogOut,
} from "lucide-react"
import { getAdminDashboardOverview } from "@/services/adminService"

interface AdminSidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

export function AdminSidebar({ className, isOpen, onClose }: AdminSidebarProps) {
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const location = useLocation()
  const { logout } = useAuth()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getAdminDashboardOverview('all')
        if (res.success) {
          setPendingCount(res.data.summary.pendingUsers)
        }
      } catch (err) {
        console.error("Sidebar stats fetch failed:", err)
      }
    }
    fetchStats()
  }, [])

  const handleLogout = async () => {
    await logout()
    window.location.href = '/admin/login'
  }

  const menuItems = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Pending Users",
      href: "/admin/pending-users",
      icon: UserCheck,
      badge: pendingCount?.toString() || null
    },
    {
      title: "All Users",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "All Tickets",
      href: "/admin/tickets",
      icon: Ticket,
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
  ]

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-60 bg-[#032313] transition-transform duration-500 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-full flex-col">
          
          {/* Brand Logo Section */}
          <div className="px-6 h-20 flex items-center">
             <Link to="/admin/dashboard" className="flex items-center transition-all hover:opacity-90">
                <img src="/logo.png" alt="CloudBlitz Logo" className="h-[75px] w-auto object-contain" />
             </Link>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 px-4 space-y-4 overflow-y-auto pt-4">
            <div>
              <div className="mb-4 px-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#517373]">
                MENU
              </div>
              
              <div className="space-y-4">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center justify-between group rounded-xl px-4 py-2 transition-all duration-300",
                        isActive 
                          ? "bg-[#152e22]" 
                          : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                         <div className={cn(
                           "transition-all duration-300",
                           isActive ? "text-[#ACDF33]" : "text-white/60 group-hover:text-white"
                         )}>
                           <Icon className="size-5 stroke-[2]" />
                         </div>
                         <span className={cn(
                           "text-[14px] font-bold tracking-tight transition-colors duration-300 transform",
                           isActive ? "text-white" : "text-white/60 group-hover:text-white"
                         )}>
                           {item.title}
                         </span>
                      </div>
                      
                      {item.badge && (
                        <div className="size-5 rounded-full bg-[#ACDF33] flex items-center justify-center text-[10px] font-black text-[#032313]">
                           {item.badge}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Bottom Logout Section */}
          <div className="px-4 pb-6 mt-auto">
             <div className="h-[1px] w-full bg-white/5 mb-6" />
             
             <button
               onClick={handleLogout}
               className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl hover:bg-white/5 transition-all duration-300 group"
             >
                <div className="text-[#FF4D4D] group-hover:scale-105 transition-transform">
                   <LogOut className="size-5 stroke-[2]" />
                </div>
                <span className="text-[14px] font-bold text-[#FF4D4D] group-hover:text-red-400">
                   Logout
                </span>
             </button>
          </div>

        </div>
      </aside>
    </>
  )
}
