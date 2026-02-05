import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, UserCheck, UserX, 
  Calendar, Users,
  Search, Filter, UserCircle2
} from "lucide-react"
import { 
  getPendingUsers, 
  approveUser, 
  rejectUser,
  type PendingUser 
} from "@/services/adminService"
import { toast } from "react-toastify"
import { useAdminSocketEvents } from "@/hooks/useAdminSocket"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function AdminPendingUsersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  // Listen for real-time user updates
  useAdminSocketEvents({
    onUserCreated: () => {
      fetchPendingUsers() // Refresh when new users register
    },
    onUserUpdated: () => {
      fetchPendingUsers() // Refresh when users are approved/rejected
    },
  })

  const fetchPendingUsers = async () => {
    try {
      setIsLoading(true)
      const result = await getPendingUsers()
      if (result.success) {
        setPendingUsers(result.data.pendingUsers)
      }
    } catch (error: any) {
      console.error("Failed to fetch pending users:", error)
      toast.error("Failed to load pending users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      setIsProcessing(true)
      const result = await approveUser(userId)
      if (result.success) {
        toast.success(result.message || "User approved successfully")
        fetchPendingUsers()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to approve user")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectClick = (user: PendingUser) => {
    setSelectedUser(user)
    setRejectionReason("")
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      toast.error("Please provide a reason")
      return
    }

    try {
      setIsProcessing(true)
      const result = await rejectUser(selectedUser.id, rejectionReason)
      if (result.success) {
        toast.success(result.message || "User rejected successfully")
        setRejectDialogOpen(false)
        setSelectedUser(null)
        setRejectionReason("")
        fetchPendingUsers()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reject user")
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredUsers = pendingUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-[calc(100vh-200px)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#00A38C]" />
            <p className="text-sm font-medium text-slate-500">Loading pending requests...</p>
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
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">
                   Pending <span className="text-[#00A38C]">Users</span>
                </h2>
                {pendingUsers.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-600 border-none text-xs font-bold px-2 py-1 rounded-full animate-in fade-in slide-in-from-right-1 duration-300">
                    {pendingUsers.length} pending
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 font-medium">
                 Manage new user registration requests for the platform
              </p>
           </div>

           <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full md:w-60 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00A38C]/10 focus:border-[#00A38C] transition-all"
                 />
              </div>
              <Button variant="outline" className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 font-medium text-sm gap-2">
                 <Filter className="size-4" />
                 Filters
              </Button>
           </div>
        </div>

        {/* Shadcn UI Table Implementation */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
           {filteredUsers.length === 0 ? (
             <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="size-16 bg-slate-50 flex items-center justify-center rounded-2xl">
                   <Users className="size-8 text-slate-200" />
                </div>
                <div className="text-center px-4">
                   <h3 className="text-lg font-bold text-slate-900">No Pending Requests</h3>
                   <p className="text-sm text-slate-500">
                      All user registrations have been processed.
                   </p>
                </div>
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                   <TableHead className="w-[300px] h-12 px-6 text-xs font-bold text-slate-500 uppercase">User Information</TableHead>
                   <TableHead className="h-12 px-4 text-xs font-bold text-slate-500 uppercase">Department</TableHead>
                   <TableHead className="h-12 px-4 text-xs font-bold text-slate-500 uppercase">Role</TableHead>
                   <TableHead className="h-12 px-4 text-xs font-bold text-slate-500 uppercase">Requested On</TableHead>
                   <TableHead className="h-12 px-6 text-right text-xs font-bold text-slate-500 uppercase">Administrative Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredUsers.map((user: PendingUser) => (
                   <TableRow key={user.id} className="hover:bg-slate-50/30 transition-colors">
                     <TableCell className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform group-hover:scale-105">
                           <UserCircle2 className="size-6 stroke-[1.5]" />
                         </div>
                         <div>
                           <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
                           <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                         </div>
                       </div>
                     </TableCell>
                     <TableCell className="px-4 py-4">
                       <span className="text-sm font-medium text-slate-700">{user.department}</span>
                     </TableCell>
                     <TableCell className="px-4 py-4">
                       <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                         {user.role}
                       </Badge>
                     </TableCell>
                     <TableCell className="px-4 py-4">
                       <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                         <Calendar className="size-3.5" />
                         <span>{new Date(user.requestedAt).toLocaleDateString()}</span>
                       </div>
                     </TableCell>
                     <TableCell className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleRejectClick(user)}
                           disabled={isProcessing}
                           className="h-9 px-3 rounded-lg text-red-500 font-bold text-xs gap-2 hover:bg-transparent hover:text-red-500 active:bg-transparent transition-none"
                         >
                           <UserX className="size-4" />
                           Reject
                         </Button>
                         <Button
                           size="sm"
                           onClick={() => handleApprove(user.id)}
                           disabled={isProcessing}
                           className="h-9 px-4 rounded-lg bg-[#032313] text-[#ACDF33] font-bold text-xs shadow-sm shadow-[#032313]/10 gap-2 hover:bg-[#032313] hover:text-[#ACDF33] active:bg-[#032313] transition-none"
                         >
                           <UserCheck className="size-4" />
                           Approve
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
        </div>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
            <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
               <DialogTitle className="text-xl font-bold text-slate-900">Reject User Registration</DialogTitle>
               <DialogDescription className="text-sm text-slate-500 mt-1">
                 Please specify why this registration request is being declined.
               </DialogDescription>
            </DialogHeader>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rejection Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g. Identity could not be verified, Incorrect department..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-[120px] rounded-xl border-slate-200 text-sm focus:ring-[#032313]/10 focus:border-[#032313] transition-all resize-none shadow-sm"
                />
              </div>

              <div className="flex gap-3">
                 <Button
                   variant="outline"
                   onClick={() => {
                     setRejectDialogOpen(false)
                     setSelectedUser(null)
                     setRejectionReason("")
                   }}
                   disabled={isProcessing}
                   className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                 >
                   Cancel
                 </Button>
                 <Button
                   onClick={handleReject}
                   disabled={isProcessing || !rejectionReason.trim()}
                   className="flex-1 h-11 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/20 hover:bg-red-500 active:bg-red-500 transition-none"
                 >
                   {isProcessing ? (
                     <Loader2 className="size-4 animate-spin" />
                   ) : "Confirm Rejection"}
                 </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
