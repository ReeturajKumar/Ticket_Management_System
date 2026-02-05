import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Loader2, Users, Search, Mail, 
   ChevronLeft, ChevronRight,
  UserCircle2, ShieldCheck, Eye
} from "lucide-react"
import { getAllUsers, getAdminConstants, type AdminUser } from "@/services/adminService"
import { toast } from "react-toastify"
import { UserDetailsDialog } from "@/components/admin/UserDetailsDialog"
import { CreateUserDialog } from "@/components/admin/CreateUserDialog"
import { useAdminSocketEvents } from "@/hooks/useAdminSocket"
import { useDebounce } from "@/hooks/useDebounce"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export default function AdminUsersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [constants, setConstants] = useState({ roles: [] as string[], departments: [] as string[] })
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
  const [searchInput, setSearchInput] = useState('') // Separate state for input
  const debouncedSearch = useDebounce(searchInput, 500) // 500ms debounce
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    fetchConstants()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [currentPage, filters])

  // Update search filter when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }))
    setCurrentPage(1) // Reset to first page when searching
  }, [debouncedSearch])

  // Listen for real-time user updates
  useAdminSocketEvents({
    onUserCreated: () => {
      fetchUsers()
    },
    onUserUpdated: () => {
      fetchUsers()
    },
    onTicketCreated: () => {
      // Refresh user stats if they include ticket counts
      fetchUsers()
    },
  })

  const fetchConstants = async () => {
    try {
      const result = await getAdminConstants()
      if (result.success) {
        setConstants(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch constants:", error)
    }
  }

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
    } catch (error: any) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId)
    setIsDialogOpen(true)
  }

  const handleUserUpdated = () => {
    fetchUsers()
  }

  if (isLoading && users.length === 0) {
    return (
      <AdminLayout>
        <div className="flex h-[calc(100vh-200px)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#00A38C]" />
            <p className="text-sm font-medium text-slate-500 tracking-tight">Accessing User Database...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {/* Simple Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                 User <span className="text-[#00A38C]">Management</span>
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                 Browse and manage access for all {pagination.total} platform users
                 {filters.search && (
                   <span className="text-[#00A38C] ml-1">
                     • Filtered by "{filters.search}"
                   </span>
                 )}
              </p>
           </div>

           <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={() => setIsCreateDialogOpen(true)} 
                className="h-10 px-5 rounded-xl bg-[#032313] text-[#ACDF33] font-black text-xs shadow-sm shadow-[#032313]/10 gap-2 hover:bg-[#032313] hover:text-[#ACDF33] active:bg-[#032313] transition-none"
              >
                <Users className="size-4" />
                Create User
              </Button>
           </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input 
                 type="text" 
                 placeholder="Search by name or email..." 
                 value={searchInput}
                 onChange={(e) => setSearchInput(e.target.value)}
                 className="h-10 w-full pl-9 pr-10 bg-slate-50/50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00A38C]/10 focus:border-[#00A38C] transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchInput !== debouncedSearch && (
                  <Loader2 className="size-3 animate-spin text-slate-400" />
                )}
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="size-4 rounded-full bg-slate-300 hover:bg-slate-400 flex items-center justify-center text-white text-xs transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
           </div>

           <Select value={filters.role || 'all'} onValueChange={(value) => handleFilterChange('role', value === 'all' ? '' : value)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                 <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100">
                 <SelectItem value="all">All Roles</SelectItem>
                 {constants.roles.map(role => (
                   <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                 ))}
              </SelectContent>
           </Select>

           <Select value={filters.department || 'all'} onValueChange={(value) => handleFilterChange('department', value === 'all' ? '' : value)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                 <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100">
                 <SelectItem value="all">All Departments</SelectItem>
                 {constants.departments.map(dept => (
                   <SelectItem key={dept} value={dept}>{dept.replace(/_/g, ' ')}</SelectItem>
                 ))}
              </SelectContent>
           </Select>

           <Select value={filters.approvalStatus || 'all'} onValueChange={(value) => handleFilterChange('approvalStatus', value === 'all' ? '' : value)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                 <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100">
                 <SelectItem value="all">All Status</SelectItem>
                 <SelectItem value="PENDING">Pending</SelectItem>
                 <SelectItem value="APPROVED">Approved</SelectItem>
                 <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
           </Select>
        </div>

        {/* Global Registry Table */}
        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500">
           {users.length === 0 ? (
             <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <div className="size-20 bg-slate-50 flex items-center justify-center rounded-[2rem] border border-slate-100">
                   <ShieldCheck className="size-10 text-slate-200" />
                </div>
                <div className="text-center px-4">
                   <h3 className="text-xl font-bold text-slate-900">No matching users</h3>
                   <p className="text-sm text-slate-400 mt-1 max-w-[300px]">
                      Try adjusting your filters or search terms to find what you're looking for.
                   </p>
                </div>
             </div>
           ) : (
             <Table>
                <TableHeader className="bg-slate-50/50">
                   <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="py-5 px-8 text-xs font-bold text-slate-500 uppercase">User Information</TableHead>
                      <TableHead className="py-5 px-4 text-xs font-bold text-slate-500 uppercase text-center">Department</TableHead>
                      <TableHead className="py-5 px-4 text-xs font-bold text-slate-500 uppercase text-center">Role</TableHead>
                      <TableHead className="py-5 px-4 text-xs font-bold text-slate-500 uppercase text-center">Status</TableHead>
                      <TableHead className="py-5 px-8 text-right text-xs font-bold text-slate-500 uppercase">Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {users.map((user) => (
                      <TableRow key={user.id} className="group border-slate-50 hover:bg-slate-50/30 transition-all duration-300">
                         <TableCell className="py-4 px-8">
                            <div className="flex items-center gap-4">
                               <div className="size-11 rounded-xl bg-slate-900 flex items-center justify-center text-[#ACDF33] shadow-sm group-hover:scale-105 transition-transform">
                                  <UserCircle2 className="size-6 stroke-[1.5]" />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <p className="text-[15px] font-bold text-slate-900 leading-tight">{user.name}</p>
                                     {user.isHead && (
                                        <Badge className="bg-[#ACDF33]/10 text-[#032313] border-none text-[8px] font-black h-4 px-1.5 rounded-[4px] shadow-none uppercase">HEAD</Badge>
                                     )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                     <Mail className="size-3 text-slate-400" />
                                     <span className="text-[11px] font-medium text-slate-400">{user.email}</span>
                                  </div>
                               </div>
                            </div>
                         </TableCell>
                         <TableCell className="py-4 px-4 text-center">
                            <span className="text-[13px] font-bold text-slate-700">
                               {user.department?.replace(/_/g, ' ') || 'GLOBAL'}
                            </span>
                         </TableCell>
                         <TableCell className="py-4 px-4 text-center">
                            <Badge className="bg-slate-100 text-slate-600 border-none text-[10px] font-bold px-2 py-0.5 rounded-md shadow-none uppercase">
                               {user.role}
                            </Badge>
                         </TableCell>
                         <TableCell className="py-4 px-4 text-center">
                            <div className="flex justify-center">
                               <Badge 
                                 className={cn(
                                   "text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-lg border-none shadow-none",
                                   user.approvalStatus === 'APPROVED' ? "bg-emerald-50 text-emerald-600" :
                                   user.approvalStatus === 'PENDING' ? "bg-amber-50 text-amber-600" :
                                   "bg-rose-50 text-rose-600"
                                 )}
                               >
                                 {user.approvalStatus}
                               </Badge>
                            </div>
                         </TableCell>
                         <TableCell className="py-4 px-8 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUserClick(user.id)}
                              className="h-9 px-4 rounded-xl text-slate-500 font-bold text-[11px] gap-2 hover:bg-transparent hover:text-slate-500 active:bg-transparent transition-none"
                            >
                               <Eye className="size-3.5" />
                               View Profile
                            </Button>
                         </TableCell>
                      </TableRow>
                   ))}
                </TableBody>
             </Table>
           )}
        </div>

        {/* Global Pagination Console */}
        {pagination.pages > 1 && (
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 p-6 rounded-3xl border border-dashed border-slate-200 mt-8 transition-all">
              <div className="flex items-center gap-4">
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Page Index <span className="text-slate-900 ml-2">{pagination.page} / {pagination.pages}</span>
                  </p>
                 <div className="h-4 w-[1px] bg-slate-200" />
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Total Records <span className="text-slate-900 ml-2">{pagination.total}</span>
                 </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 sm:flex-none h-10 px-5 rounded-xl border-slate-200 bg-white text-slate-600 font-bold text-xs shadow-sm shadow-black/5 hover:bg-white active:scale-95 disabled:opacity-30 transition-all"
                 >
                    <ChevronLeft className="size-4 mr-2" />
                    Previous
                 </Button>
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={currentPage === pagination.pages}
                    className="flex-1 sm:flex-none h-10 px-6 rounded-xl border-slate-200 bg-white text-slate-600 font-bold text-xs shadow-sm shadow-black/5 hover:bg-white active:scale-95 disabled:opacity-30 transition-all"
                 >
                    Next
                    <ChevronRight className="size-4 ml-2" />
                 </Button>
              </div>
           </div>
        )}

        {/* Dynamic Modals */}
        <UserDetailsDialog
          userId={selectedUserId}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onUserUpdated={handleUserUpdated}
        />

        <CreateUserDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onUserCreated={fetchUsers}
          defaultType="department-head"
        />
      </div>
    </AdminLayout>
  )
}
