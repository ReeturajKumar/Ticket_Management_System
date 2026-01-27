import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Loader2, Ticket, CheckCircle, Clock, Building2
} from "lucide-react"
import { getUserDetails, updateUser, type AdminUserDetails } from "@/services/adminService"
import { toast } from "react-toastify"

interface UserDetailsDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated?: () => void
}

export function UserDetailsDialog({ userId, open, onOpenChange, onUserUpdated }: UserDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<AdminUserDetails | null>(null)
  const [ticketStats, setTicketStats] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    isHead: false,
    approvalStatus: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails()
    } else {
      setUser(null)
      setTicketStats(null)
      setIsEditing(false)
    }
  }, [open, userId])

  const fetchUserDetails = async () => {
    if (!userId) return
    try {
      setIsLoading(true)
      const result = await getUserDetails(userId)
      if (result.success) {
        setUser(result.data.user)
        setTicketStats(result.data.ticketStats)
        setEditData({
          name: result.data.user.name,
          email: result.data.user.email,
          role: result.data.user.role,
          department: result.data.user.department || '',
          isHead: result.data.user.isHead || false,
          approvalStatus: result.data.user.approvalStatus || '',
        })
      }
    } catch (error: any) {
      console.error("Failed to fetch user details:", error)
      toast.error("Failed to load user details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return
    try {
      setIsSaving(true)
      const result = await updateUser(userId, editData)
      if (result.success) {
        toast.success("User updated successfully")
        setIsEditing(false)
        fetchUserDetails()
        onUserUpdated?.()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update user")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">User Details</DialogTitle>
              <DialogDescription className="mt-1">
                View and manage user information
              </DialogDescription>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="sm">
                Edit User
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    fetchUserDetails()
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">User not found</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            {/* Bento Grid Layout */}
            
            {/* User Basic Info - Large Card (8 cols) */}
            <div className="col-span-12 lg:col-span-8 p-4 rounded-lg border bg-card space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  {isEditing ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium">{user.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  {isEditing ? (
                    <Select value={editData.role} onValueChange={(value) => setEditData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="DEPARTMENT_USER">Department User</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                  )}
                </div>
                {user.role === 'DEPARTMENT_USER' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Department</Label>
                      {isEditing ? (
                        <Select value={editData.department} onValueChange={(value) => setEditData(prev => ({ ...prev, department: value }))}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLACEMENT">Placement</SelectItem>
                            <SelectItem value="OPERATIONS">Operations</SelectItem>
                            <SelectItem value="TRAINING">Training</SelectItem>
                            <SelectItem value="FINANCE">Finance</SelectItem>
                            <SelectItem value="TECHNICAL_SUPPORT">Technical Support</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        user.department ? (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            {user.department}
                          </Badge>
                        ) : (
                          <p className="text-xs text-muted-foreground">No department</p>
                        )
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Is Head</Label>
                      {isEditing ? (
                        <Select 
                          value={editData.isHead ? 'true' : 'false'} 
                          onValueChange={(value) => setEditData(prev => ({ ...prev, isHead: value === 'true' }))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">No</SelectItem>
                            <SelectItem value="true">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.isHead ? 'default' : 'outline'} className="text-xs">
                          {user.isHead ? 'Yes' : 'No'}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Approval Status</Label>
                      {isEditing ? (
                        <Select 
                          value={editData.approvalStatus} 
                          onValueChange={(value) => setEditData(prev => ({ ...prev, approvalStatus: value }))}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          variant={
                            user.approvalStatus === 'APPROVED' ? 'default' :
                            user.approvalStatus === 'PENDING' ? 'secondary' :
                            'destructive'
                          }
                          className="text-xs"
                        >
                          {user.approvalStatus || 'N/A'}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Ticket Statistics - Medium Card (4 cols) */}
            {ticketStats && (
              <div className="col-span-12 lg:col-span-4 p-4 rounded-lg border bg-card space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ticket Stats</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Assigned</span>
                    </div>
                    <span className="text-lg font-bold">{ticketStats.assignedTickets}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Resolved</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{ticketStats.resolvedTickets}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{ticketStats.activeTickets}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps - Small Card (4 cols) */}
            <div className="col-span-12 lg:col-span-4 p-4 rounded-lg border bg-card space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Timestamps</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{new Date(user.updatedAt).toLocaleDateString()}</span>
                </div>
                {user.approvedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Approved</span>
                    <span className="font-medium">{new Date(user.approvedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info - Medium Card (8 cols) */}
            {(user.approvedBy || user.rejectionReason) && (
              <div className="col-span-12 lg:col-span-8 p-4 rounded-lg border bg-card space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Additional Info</h3>
                <div className="space-y-2 text-xs">
                  {user.approvedBy && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Approved By</span>
                      <span className="font-medium">{user.approvedBy}</span>
                    </div>
                  )}
                  {user.rejectionReason && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground block mb-1">Rejection Reason</span>
                      <p className="font-medium text-sm">{user.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
