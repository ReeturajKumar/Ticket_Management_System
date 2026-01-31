import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { getCurrentDepartmentUser, logoutDepartmentUser } from "@/services/departmentAuthService"
import { getStaffDashboardStats } from "@/services/departmentStaffService"
import { getDepartmentOverview } from "@/services/departmentHeadService"
import {
  LayoutDashboard,
  Ticket,
  LogOut,
  UserCircle,
  FileText,
  BarChart3,
  Users2
} from "lucide-react"

interface SidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

export function DepartmentSidebar({ className, isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const user = getCurrentDepartmentUser()
  const [ticketCount, setTicketCount] = useState<number>(0)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.isHead) {
          const stats = await getDepartmentOverview()
          if (stats?.success && stats?.data?.summary) {
            setTicketCount(stats.data.summary.totalTickets || 0)
          }
        } else {
          const stats = await getStaffDashboardStats()
          if (stats?.success && stats?.data?.summary) {
            setTicketCount(stats.data.summary.totalAssigned || 0)
          }
        }
      } catch (error) {
        console.error("Error fetching sidebar stats:", error)
      }
    }
    fetchStats()
  }, [user?.isHead])

  const handleLogout = async () => {
    await logoutDepartmentUser()
    window.location.href = '/department/login'
  }

  // Main menu items
  const menuItems = []

  if (user?.isHead) {
    // Heads get granular dashboard access
    menuItems.push(
      {
        title: "Overview",
        href: "/department/dashboard?tab=overview",
        icon: LayoutDashboard,
      },
      {
        title: "Analytics",
        href: "/department/dashboard?tab=analytics",
        icon: BarChart3,
      },
      {
        title: "Team Performance",
        href: "/department/dashboard?tab=team",
        icon: Users2,
      }
    )
  } else {
    // Staff get a single dashboard link
    menuItems.push({
      title: "Dashboard",
      href: "/department/dashboard",
      icon: LayoutDashboard,
    })
  }

  // Common items for all department staff
  menuItems.push({
    title: "My Tickets",
    href: "/department/tickets",
    icon: Ticket,
  })

  // Add Reports for Department Head
  if (user?.isHead) {
    menuItems.push({
      title: "Reports",
      href: "/department/reports",
      icon: FileText,
    })
  }

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
          {/* Logo / Branding - Moved into Sidebar as per design */}
          <div className="flex h-16 items-center justify-start px-7">
            <Link to="/department/dashboard" className="flex items-center transition-all hover:opacity-95">
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
                  // Improved active state logic to handle query params and exact matches
                  const isActive = item.href.includes('?') 
                    ? (location.pathname + location.search) === item.href
                    : location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/department/dashboard');

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
                        {/* Active Indicator Pill - Optional, keeping for extra emphasis or removing if 'bg' is enough. 
                            If User wants PURELY bg, we can remove this. But kept for design continuity unless asked to remove. */}
                        {isActive && (
                          <div className="absolute left-0 w-1 h-6 bg-[#ACDF33] rounded-r-full hidden" /> 
                        )}
                        {/* Hiding pill via 'hidden' class as BG is usually sufficient, uncomment if needed */}
                        
                        <item.icon className={cn("size-5 shrink-0 transition-colors", isActive ? "text-[#ACDF33]" : "text-white/40 group-hover:text-white")} />
                        <span className={cn("transition-colors", isActive ? "text-white" : "text-white/80 group-hover:text-white")}>{item.title}</span>
                        
                        {/* Live Badge for My Tickets */}
                        {item.title === "My Tickets" && (
                           <span className={cn(
                             "ml-auto flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-all",
                             ticketCount > 0 ? "bg-[#ACDF33] text-[#032313]" : "bg-white/10 text-white/40"
                           )}>
                              {ticketCount}
                           </span>
                        )}
                      </Link>
                  )
                })}
              </div>
            </div>

            {/* General Section */}
            <div>
              <div className="mb-6 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                General
              </div>
              <div className="space-y-1.5">
                <Link
                   to="/department/profile"
                   onClick={() => onClose?.()}
                   className={cn(
                     "relative flex cursor-pointer items-center gap-3.5 px-3 py-2.5 text-sm font-medium transition-all group",
                     "text-white",
                     location.pathname === '/department/profile' ? "bg-[#ACDF33]/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                   )}
                >
                   {location.pathname === '/department/profile' && (
                     <div className="absolute left-0 w-1 h-6 bg-[#ACDF33] rounded-r-full hidden" />
                   )}
                   <UserCircle className={cn("size-5 shrink-0 transition-colors", location.pathname === '/department/profile' ? "text-[#ACDF33]" : "text-white/40 group-hover:text-white")} />
                   <span className="transition-colors text-white">Profile</span>
                </Link>
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
