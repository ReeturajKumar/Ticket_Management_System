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
import { getCurrentUser, logout } from "@/lib/auth"
import {
  Ticket,
  Bell,
  LogOut,
  Menu,
} from "lucide-react"

interface StudentHeaderProps {
  onMenuClick?: () => void
}

export function StudentHeader({ onMenuClick }: StudentHeaderProps) {
  const user = getCurrentUser()
  
  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = () => {
    logout()
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
          <Link to="/home" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Ticket className="size-6 text-primary" />
            </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Student Ticketing</h1>
            <p className="text-xs text-muted-foreground">Support System</p>
          </div>
        </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative cursor-pointer"
              >
                <Bell className="size-5" />
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                <DropdownMenuItem className="cursor-pointer flex-col items-start gap-1 p-3">
                  <div className="flex w-full items-start justify-between">
                    <p className="text-sm font-medium">Ticket #1234 Updated</p>
                    <span className="text-xs text-muted-foreground">2m ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your ticket has been assigned to IT Department
                  </p>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer flex-col items-start gap-1 p-3">
                  <div className="flex w-full items-start justify-between">
                    <p className="text-sm font-medium">New Response</p>
                    <span className="text-xs text-muted-foreground">1h ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Department replied to your ticket #1233
                  </p>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer flex-col items-start gap-1 p-3">
                  <div className="flex w-full items-start justify-between">
                    <p className="text-sm font-medium">Ticket Resolved</p>
                    <span className="text-xs text-muted-foreground">3h ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your ticket #1232 has been marked as resolved
                  </p>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-center text-primary">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="cursor-pointer gap-2 px-2"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(user?.name || "User")}
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
                  <Badge variant="secondary" className="w-fit text-xs">
                    {user?.role || "Student"}
                  </Badge>
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
