import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { logout } from "@/lib/auth"
import {
  Home,
  List,
  Plus,
  User,
  LogOut,
} from "lucide-react"

interface SidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

export function StudentSidebar({ className, isOpen, onClose }: SidebarProps) {
  const location = useLocation()

  const handleLogout = () => {
    logout()
  }

  const menuItems = [
    {
      title: "Dashboard",
      href: "/home",
      icon: Home,
    },
    {
      title: "My Tickets",
      href: "/tickets",
      icon: List,
    },
    {
      title: "Create Ticket",
      href: "/tickets/new",
      icon: Plus,
    },
  ]

  const bottomMenuItems = [
    {
      title: "Profile",
      href: "/profile",
      icon: User,
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
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-white transition-transform duration-300 ease-in-out dark:bg-slate-950",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Main Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Main Menu
            </div>
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
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom Navigation */}
          <div className="border-t p-4">
            <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </div>
            <div className="space-y-1">
              {bottomMenuItems.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => onClose?.()}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="size-5 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
              
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
        </div>
      </aside>
    </>
  )
}
