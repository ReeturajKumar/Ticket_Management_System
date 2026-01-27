import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, UserCheck, UserX, Users, 
  Mail, Building2, Calendar
} from "lucide-react"
import { 
  getPendingUsers, 
  approveUser, 
  rejectUser,
  type PendingUser 
} from "@/services/adminService"
import { toast } from "react-toastify"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

  useEffect(() => {
    fetchPendingUsers()
  }, [])

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
        fetchPendingUsers() // Refresh list
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
      toast.error("Please provide a rejection reason")
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
        fetchPendingUsers() // Refresh list
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to reject user")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
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
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Pending User Approvals</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Review and approve department user registration requests.
          </p>
        </div>

        {/* Pending Users List */}
        {pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCheck className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-semibold mb-2">No Pending Users</h3>
              <p className="text-sm text-muted-foreground text-center">
                All user registration requests have been processed.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <Users className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{user.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Badge variant="outline">
                          <Building2 className="h-3 w-3 mr-1" />
                          {user.department}
                        </Badge>
                        {user.isHead && (
                          <Badge variant="secondary">Department Head</Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Requested {new Date(user.requestedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectClick(user)}
                        disabled={isProcessing}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject User Registration</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting {selectedUser?.name}'s registration request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false)
                  setSelectedUser(null)
                  setRejectionReason("")
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  "Reject User"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
