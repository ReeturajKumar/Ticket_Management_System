
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { createInternalTicket } from "@/services/departmentStaffService"
import { toast } from "react-toastify"


interface CreateInternalTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateInternalTicketDialog({ open, onOpenChange, onSuccess }: CreateInternalTicketDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    department: "",
    priority: "MEDIUM"
  })

  // Internal departments list
  const departments = [
    { value: 'TECHNICAL_SUPPORT', label: 'Technical Support' },
    { value: 'HR', label: 'HR Department' },
    { value: 'FINANCE', label: 'Finance Department' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject || !formData.description || !formData.department) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)
      await createInternalTicket(formData)
      toast.success("Internal ticket created successfully")
      onSuccess()
      onOpenChange(false)
      // Reset form
      setFormData({
        subject: "",
        description: "",
        department: "",
        priority: "MEDIUM"
      })
    } catch (error) {
      console.error("Failed to create ticket", error)
      toast.error("Failed to create ticket")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Internal Ticket</DialogTitle>
          <DialogDescription>
            Create a new ticket for another department.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject" 
              placeholder="e.g. Need access to analytics dashboard" 
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Target Department</Label>
            <Select 
              value={formData.department} 
              onValueChange={(value) => setFormData({...formData, department: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData({...formData, priority: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Describe your request in detail..." 
              className="resize-none min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
