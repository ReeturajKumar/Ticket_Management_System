import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Loader2, Users, Search, Mail, Building2,  UserCheck, UserX,  UserCog
} from "lucide-react"
import { getAllUsers, type AdminUser } from "@/services/adminService"
import { toast } from "react-toastify"
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog"
import { CreateUserDialog } from "@/components/admin/CreateUserDialog"
import { useAdminSocketEvents } from "@/hooks/useAdminSocket"

export default function AdminUsersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  })
  const [filters, setFilters] = useState({
    role: '',
    department: '',
    approvalStatus: '',
    search: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createDialogType, setCreateDialogType] = useState<'department-head' | 'department-staff'>('department-head')

  useEffect(() => {
    fetchUsers()
  }, [currentPage, filters])

  // Listen for real-time user updates
  useAdminSocketEvents({
    onUserCreated: () => {
      fetchUsers() // Refresh list when user is created
    },
    onUserUpdated: () => {
      fetchUsers() // Refresh list when user is updated
    },
  })

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const result = await getAllUsers({
        ...filters,
        page: currentPage,
        limit: 20,
      })
      if (result.success) {
        setUsers(result.data.users)
        setPagination(result.data.pagination)
      }
    } catch (error: unknown) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page on filter change
  }

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId)
    setIsDialogOpen(true)
  }

  const handleUserUpdated = () => {
    fetchUsers() // Refresh the list when user is updated
  }

  if (isLoading && users.length === 0) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage all system users
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => {
                setCreateDialogType('department-head')
                setIsCreateDialogOpen(true)
              }} 
              className="w-full sm:w-auto"
            >
              <UserCog className="mr-2 h-4 w-4" />
              Create Head
            </Button>
            <Button 
              onClick={() => {
                setCreateDialogType('department-staff')
                setIsCreateDialogOpen(true)
              }} 
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Users className="mr-2 h-4 w-4" />
              Create Staff
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={filters.role || 'all'} onValueChange={(value) => handleFilterChange('role', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="DEPARTMENT_USER">Department User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.department || 'all'} onValueChange={(value) => handleFilterChange('department', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="PLACEMENT">Placement</SelectItem>
                  <SelectItem value="OPERATIONS">Operations</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="FINANCE">Finance</SelectItem>
                  <SelectItem value="TECHNICAL_SUPPORT">Technical Support</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.approvalStatus || 'all'} onValueChange={(value) => handleFilterChange('approvalStatus', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Users ({pagination.total})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{user.name}</h3>
                          {user.isHead && (
                            <Badge variant="outline" className="text-xs">Head</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {user.role}
                          </Badge>
                          {user.department && (
                            <Badge variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {user.department}
                            </Badge>
                          )}
                          {user.approvalStatus && (
                            <Badge 
                              variant={
                                user.approvalStatus === 'APPROVED' ? 'default' :
                                user.approvalStatus === 'PENDING' ? 'secondary' :
                                'destructive'
                              }
                              className="text-xs"
                            >
                              {user.approvalStatus === 'PENDING' && <UserCheck className="h-3 w-3 mr-1" />}
                              {user.approvalStatus === 'REJECTED' && <UserX className="h-3 w-3 mr-1" />}
                              {user.approvalStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="sm:flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full sm:w-auto"
                        onClick={() => handleUserClick(user.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 sm:flex-none"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={currentPage === pagination.pages}
                    className="flex-1 sm:flex-none"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <UserDetailsDialog
          userId={selectedUserId}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onUserUpdated={handleUserUpdated}
        />

        {/* Create User Dialog */}
        <CreateUserDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onUserCreated={fetchUsers}
          defaultType={createDialogType}
        />
      </div>
    </AdminLayout>
  )
}
