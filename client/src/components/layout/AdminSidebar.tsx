import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Ticket,
  BarChart3,
  UserCheck,
} from "lucide-react"

interface AdminSidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

export function AdminSidebar({ className, isOpen, onClose }: AdminSidebarProps) {
  const location = useLocation()

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
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-56 border-r bg-white transition-transform duration-300 ease-in-out dark:bg-slate-950",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Main Navigation */}
          <nav className="flex-1 space-y-6 overflow-y-auto p-4">
            <div>
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-purple-600/80">
                Admin Panel
              </div>
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      )}
                    >
                      <Icon className="size-4" />
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
