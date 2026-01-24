import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getCurrentDepartmentUser, logoutDepartmentUser } from "@/services/departmentAuthService"
import { NotificationBell } from "@/components/notifications"
import {
  Building2,
  LogOut,
  Menu,
} from "lucide-react"

interface DepartmentHeaderProps {
  onMenuClick?: () => void
}

export function DepartmentHeader({ onMenuClick }: DepartmentHeaderProps) {
  const user = getCurrentDepartmentUser()
  
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
    await logoutDepartmentUser()
    window.location.href = '/department/login'
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden -ml-2"
            onClick={onMenuClick}
          >
            <Menu className="size-5" />
          </Button>

          {/* Logo */}
          <Link to="/department/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/10">
              <Building2 className="size-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">TMS</h1>
              <p className="text-xs text-muted-foreground">Department Portal</p>
            </div>
          </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="cursor-pointer gap-2 px-2"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-indigo-600/10 text-sm font-semibold text-indigo-600">
                    {getInitials(user?.name || "Staff")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="w-fit text-xs bg-indigo-100 text-indigo-700">
                      {user?.department}
                    </Badge>
                    {user?.isHead && (
                       <Badge variant="outline" className="w-fit text-xs border-indigo-200 text-indigo-600">
                        HEAD
                      </Badge>
                    )}
                  </div>
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
    </header>
  )
}
