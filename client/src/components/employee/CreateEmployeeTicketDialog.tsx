import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Paperclip, X } from "lucide-react"
import { employeeService } from "@/services/employeeService"
import { toast } from "react-toastify"

interface CreateEmployeeTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateEmployeeTicketDialog({ open, onOpenChange, onSuccess }: CreateEmployeeTicketDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    department: "",
    priority: "MEDIUM"
  })
  const [files, setFiles] = useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const departments = [
    { value: 'TECHNICAL_SUPPORT', label: 'Technical Support' },
    { value: 'HR', label: 'HR Department' },
    { value: 'FINANCE', label: 'Finance Department' },
    { value: 'OPERATIONS', label: 'Operations Department' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject || !formData.description || !formData.department) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setLoading(true)
      
      const payload = new FormData()
      payload.append('subject', formData.subject)
      payload.append('description', formData.description)
      payload.append('department', formData.department)
      payload.append('priority', formData.priority)
      files.forEach(file => payload.append('attachments', file))

      await employeeService.createTicket(payload)
      toast.success("Ticket created successfully")
      onSuccess?.()
      onOpenChange(false)
      // Reset form
      setFormData({
        subject: "",
        description: "",
        department: "",
        priority: "MEDIUM"
      })
      setFiles([])
    } catch (error) {
      console.error("Failed to create ticket", error)
      toast.error("Failed to create ticket")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] rounded-3xl border-none shadow-2xl p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 font-garnett">Create New Ticket</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Describe your issue or request and we'll route it to the right department.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</Label>
            <Input 
              id="subject" 
              placeholder="Brief summary of your request" 
              className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="department" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Department</Label>
               <Select 
                 value={formData.department} 
                 onValueChange={(value) => setFormData({...formData, department: value})}
               >
                 <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Select" />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl border-slate-100">
                   {departments.map((dept) => (
                     <SelectItem key={dept.value} value={dept.value} className="rounded-lg">
                       {dept.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             <div className="space-y-2">
               <Label htmlFor="priority" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</Label>
               <Select 
                 value={formData.priority} 
                 onValueChange={(value) => setFormData({...formData, priority: value})}
               >
                 <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue placeholder="Select" />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl border-slate-100">
                   <SelectItem value="LOW" className="rounded-lg">Low</SelectItem>
                   <SelectItem value="MEDIUM" className="rounded-lg">Medium</SelectItem>
                   <SelectItem value="HIGH" className="rounded-lg">High</SelectItem>
                   <SelectItem value="CRITICAL" className="rounded-lg text-rose-600 font-bold">Critical</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Tell us more about what you need help with..." 
              className="resize-none min-h-[120px] rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <div className="space-y-3">
             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attachments</Label>
             <div className="flex flex-wrap gap-2">
                {files.map((file, i) => (
                   <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-600 border border-slate-200">
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-500">
                         <X className="size-3" />
                      </button>
                   </div>
                ))}
                <label className="flex items-center gap-2 bg-white border border-dashed border-slate-300 px-4 py-1.5 rounded-full text-[10px] font-bold text-slate-400 hover:border-[#ACDF33] hover:text-[#ACDF33] transition-all cursor-pointer">
                   <Paperclip className="size-3" />
                   Add Files
                   <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </label>
             </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0 pt-2">
            <Button 
               type="button" 
               variant="ghost" 
               onClick={() => onOpenChange(false)}
               className="rounded-full font-bold text-slate-500"
            >
              Discard
            </Button>
            <Button 
               type="submit" 
               disabled={loading}
               className="rounded-full bg-[#032313] hover:bg-[#032313]/90 text-[#ACDF33] font-bold px-8"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
