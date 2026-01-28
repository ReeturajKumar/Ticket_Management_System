import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { getCurrentDepartmentUser, logoutDepartmentUser } from "@/services/departmentAuthService"
import {
  LayoutDashboard,
  Ticket,
  LogOut,
  UserCircle,
  FileText
} from "lucide-react"

interface SidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

export function DepartmentSidebar({ className, isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const user = getCurrentDepartmentUser()

  const handleLogout = async () => {
    await logoutDepartmentUser()
    window.location.href = '/department/login'
  }

  // Common items for all department staff
  const menuItems = [
    {
      title: "Dashboard",
      href: "/department/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Profile",
      href: "/department/profile",
      icon: UserCircle
    },
    {
      title: "My Tickets",
      href: "/department/tickets",
      icon: Ticket,
    },
  ]

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
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-56 border-r bg-white transition-transform duration-300 ease-in-out dark:bg-slate-950",
          // Hidden by default on mobile and tablet, visible on desktop (lg+)
          // Show when isOpen is true on mobile/tablet, always visible on desktop
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Main Navigation */}
          <nav className="flex-1 space-y-6 overflow-y-auto p-4">
            
            {/* Staff Section */}
            <div>
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-indigo-600/80">
                Workspace
              </div>
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => onClose?.()}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
                          : "text-muted-foreground hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                      )}
                    >
                      <item.icon className="size-5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

          </nav>

          {/* Bottom Navigation */}
          <div className="border-t p-4">
            <Link
               to="/department/profile"
               onClick={() => onClose?.()}
               className={cn(
                 "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-1",
                   location.pathname === '/department/profile'
                     ? "bg-indigo-50 text-indigo-600"
                     : "text-muted-foreground hover:bg-slate-100 hover:text-slate-900"
               )}
            >
               <UserCircle className="size-5 shrink-0" />
               <span>Profile</span>
            </Link>

            <button
              onClick={handleLogout}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
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
