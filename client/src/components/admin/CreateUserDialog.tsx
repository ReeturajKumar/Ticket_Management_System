import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, UserPlus, Building2, UserCog, Users } from "lucide-react"
import { createUser } from "@/services/adminService"
import { toast } from "react-toastify"

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated?: () => void
  defaultType?: 'department-head' | 'department-staff' | 'employee'
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated, defaultType = 'department-head' }: CreateUserDialogProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [userType, setUserType] = useState<'department-head' | 'department-staff' | 'employee'>(defaultType)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DEPARTMENT_USER',
    department: '',
    isHead: true,
    approvalStatus: 'APPROVED',
  })

  // Update form data when user type changes
  const handleUserTypeChange = (type: 'department-head' | 'department-staff' | 'employee') => {
    setUserType(type)
    setFormData(prev => ({
      ...prev,
      role: type === 'employee' ? 'EMPLOYEE' : 'DEPARTMENT_USER',
      isHead: type === 'department-head',
      approvalStatus: 'APPROVED',
      department: type === 'employee' ? '' : prev.department,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.role === 'DEPARTMENT_USER' && !formData.department) {
      toast.error("Please select a department")
      return
    }

    try {
      setIsCreating(true)
      const result = await createUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.role === 'DEPARTMENT_USER' ? formData.department : undefined,
        isHead: formData.role === 'DEPARTMENT_USER' ? formData.isHead : undefined,
        approvalStatus: formData.role === 'DEPARTMENT_USER' ? formData.approvalStatus : undefined,
      })

      if (result.success) {
        toast.success("User created successfully")
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'DEPARTMENT_USER',
          department: '',
          isHead: true,
          approvalStatus: 'APPROVED',
        })
        setUserType('department-head')
        handleClose(false)
        onUserCreated?.()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create user")
    } finally {
      setIsCreating(false)
    }
  }

  // Reset form when dialog closes
  const handleClose = (open: boolean) => {
    if (!open) {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'DEPARTMENT_USER',
        department: '',
        isHead: true,
        approvalStatus: 'APPROVED',
      })
      setUserType('department-head')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account. The user will be able to login immediately.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={userType} onValueChange={(value) => handleUserTypeChange(value as 'department-head' | 'department-staff')} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="department-head">
              <UserCog className="h-4 w-4 mr-2" />
              Head
            </TabsTrigger>
            <TabsTrigger value="department-staff">
              <Users className="h-4 w-4 mr-2" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="employee">
              <Building2 className="h-4 w-4 mr-2" />
              Employee
            </TabsTrigger>
          </TabsList>

          <TabsContent value={userType} className="space-y-4 mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select 
                    disabled={formData.role === 'EMPLOYEE'}
                    value={formData.department} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  >
                    <SelectTrigger id="department">
                      <SelectValue placeholder={formData.role === 'EMPLOYEE' ? "N/A (No Department)" : "Select department"} />
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
                </div>
              </div>

               <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  {userType === 'employee' ? <Building2 className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-primary" />}
                  <span className="text-sm font-semibold">
                    {userType === 'department-head' && 'Department Head'}
                    {userType === 'department-staff' && 'Department Staff'}
                    {userType === 'employee' && 'General Employee'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {userType === 'department-head' && 'Department heads can manage tickets, assign staff, and view department analytics.'}
                  {userType === 'department-staff' && 'Department staff can be assigned tickets and work on resolving them.'}
                  {userType === 'employee' && 'General employees are internal users not bound to a specific department. They have higher privileges than guest users.'}
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {userType === 'department-head' && 'Create Department Head'}
                      {userType === 'department-staff' && 'Create Department Staff'}
                      {userType === 'employee' && 'Create Internal Employee'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
