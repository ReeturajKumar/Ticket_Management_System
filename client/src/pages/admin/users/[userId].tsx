import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Loader2, ArrowLeft, Building2, 
  Ticket, CheckCircle, Clock,
} from "lucide-react"
import { getUserDetails, updateUser, type AdminUserDetails } from "@/services/adminService"
import { toast } from "react-toastify"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AdminUserDetailsPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<AdminUserDetails | null>(null)
  const [ticketStats, setTicketStats] = useState<{
    assignedTickets: number
    resolvedTickets: number
    activeTickets: number
  } | null>(null)
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

  const fetchUserDetails = useCallback(async () => {
    if (!userId) return
    try {
      setIsLoading(true)
      const result = await getUserDetails(userId)
      if (result.success) {
        setUser(result.data.user)
        setTicketStats(result.data.ticketStats || null)
        setEditData({
          name: result.data.user.name,
          email: result.data.user.email,
          role: result.data.user.role,
          department: result.data.user.department || '',
          isHead: result.data.user.isHead || false,
          approvalStatus: result.data.user.approvalStatus || '',
        })
      }
    } catch (error: unknown) {
      console.error("Failed to fetch user details:", error)
      toast.error("Failed to load user details")
      navigate('/admin/users')
    } finally {
      setIsLoading(false)
    }
  }, [userId, navigate])

  useEffect(() => {
    if (userId) {
      fetchUserDetails()
    }
  }, [userId, fetchUserDetails])

  const handleSave = async () => {
    if (!userId) return
    try {
      setIsSaving(true)
      const result = await updateUser(userId, editData)
      if (result.success) {
        toast.success("User updated successfully")
        setIsEditing(false)
        fetchUserDetails() // Refresh data
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update user"
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
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

  if (!user) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin/users">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">User Details</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                View and manage user information
              </p>
            </div>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">Edit User</Button>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => {
                setIsEditing(false)
                fetchUserDetails() // Reset to original data
              }} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* User Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  {isEditing ? (
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm font-medium">{user.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm font-medium">{user.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  {isEditing ? (
                    <Select value={editData.role} onValueChange={(value) => setEditData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="DEPARTMENT_USER">Department User</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">{user.role}</Badge>
                  )}
                </div>
                {user.role === 'DEPARTMENT_USER' && (
                  <>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      {isEditing ? (
                        <Select value={editData.department} onValueChange={(value) => setEditData(prev => ({ ...prev, department: value }))}>
                          <SelectTrigger>
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
                          <Badge variant="outline">
                            <Building2 className="h-3 w-3 mr-1" />
                            {user.department}
                          </Badge>
                        ) : (
                          <p className="text-sm text-muted-foreground">No department</p>
                        )
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Is Department Head</Label>
                      {isEditing ? (
                        <Select 
                          value={editData.isHead ? 'true' : 'false'} 
                          onValueChange={(value) => setEditData(prev => ({ ...prev, isHead: value === 'true' }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">No</SelectItem>
                            <SelectItem value="true">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.isHead ? 'default' : 'outline'}>
                          {user.isHead ? 'Yes' : 'No'}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Approval Status</Label>
                      {isEditing ? (
                        <Select 
                          value={editData.approvalStatus} 
                          onValueChange={(value) => setEditData(prev => ({ ...prev, approvalStatus: value }))}
                        >
                          <SelectTrigger>
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
                        >
                          {user.approvalStatus || 'N/A'}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Created At</span>
                  <span className="text-sm font-medium">
                    {new Date(user.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Updated At</span>
                  <span className="text-sm font-medium">
                    {new Date(user.updatedAt).toLocaleString()}
                  </span>
                </div>
                {user.approvedBy && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Approved By</span>
                      <span className="text-sm font-medium">{user.approvedBy}</span>
                    </div>
                    {user.approvedAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Approved At</span>
                        <span className="text-sm font-medium">
                          {new Date(user.approvedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {user.rejectionReason && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Rejection Reason</span>
                      <p className="text-sm font-medium mt-1">{user.rejectionReason}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ticket Statistics */}
          {ticketStats && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Assigned</span>
                    </div>
                    <span className="text-2xl font-bold">{ticketStats.assignedTickets}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Resolved</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{ticketStats.resolvedTickets}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Active</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{ticketStats.activeTickets}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
