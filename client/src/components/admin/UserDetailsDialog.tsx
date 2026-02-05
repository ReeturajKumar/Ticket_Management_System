import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Loader2, 
  UserCircle2, Mail, ShieldCheck, Calendar,
  Edit3, Save, X, Activity, History, Fingerprint,
  UserX, Info, CheckCircle
} from "lucide-react"
import { getUserDetails, updateUser, getAdminConstants, type AdminUserDetails } from "@/services/adminService"
import { toast } from "react-toastify"
import { cn } from "@/lib/utils"

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
  const [constants, setConstants] = useState({ roles: [] as string[], departments: [] as string[] })
  
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
    if (open) {
      fetchConstants()
    }
  }, [open])

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails()
    } else {
      setUser(null)
      setTicketStats(null)
      setIsEditing(false)
    }
  }, [open, userId])

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
      
      // Clean up internal state to match API expectations
      const payload: any = { ...editData }
      if (payload.role !== 'DEPARTMENT_USER') {
        payload.department = null
        payload.isHead = false
      } else if (payload.department === '') {
        delete payload.department
      }

      const result = await updateUser(userId, payload)
      if (result.success) {
        toast.success("User successfully updated")
        setIsEditing(false)
        fetchUserDetails()
        onUserUpdated?.()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-4xl lg:max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
        {isLoading ? (
          <div className="h-[400px] flex flex-col items-center justify-center gap-4 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-[#00A38C]" />
            <p className="text-xs font-bold text-slate-400">Loading profile...</p>
          </div>
        ) : !user ? (
          <div className="h-[200px] flex items-center justify-center bg-white">
            <p className="text-sm font-bold text-slate-400">User not found</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row max-h-[85vh]">
            
            {/* Left Section: Identity Snapshot */}
            <div className="w-full md:w-[280px] bg-[#032313] p-6 text-white flex flex-col items-center shrink-0 border-r border-white/5">
               <div className="relative mb-4">
                  <div className="size-16 rounded-full bg-[#ACDF33]/20 border border-[#ACDF33]/30 flex items-center justify-center shadow-md">
                     <UserCircle2 className="size-10 text-[#ACDF33] stroke-[1]" />
                  </div>
                  {user.isHead && (
                    <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#ACDF33] text-[#032313] border-none text-[7px] font-black px-1.5 py-0 rounded-full uppercase">
                       Head
                    </Badge>
                  )}
               </div>

               <div className="space-y-0.5 mb-6 w-full text-center">
                  <h2 className="text-xl font-bold truncate px-1">{user.name}</h2>
                  <p className="text-[#ACDF33] font-bold text-[9px] tracking-wider uppercase opacity-70">{user.role.replace(/_/g, ' ')}</p>
               </div>

               <div className="w-full space-y-3">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                     <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5">Email Address</p>
                     <div className="flex items-center gap-2">
                        <Mail className="size-3 text-[#ACDF33]" />
                        <p className="text-[11px] font-medium truncate opacity-90">{user.email}</p>
                     </div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                     <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5">Internal ID</p>
                     <div className="flex items-center gap-2">
                        <Fingerprint className="size-3 text-[#ACDF33]" />
                        <p className="text-[10px] font-mono opacity-80 uppercase leading-none">{user.id.slice(-8)}</p>
                     </div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-lg border border-white/11">
                     <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1.5">Verification Status</p>
                     <div className="flex items-center gap-2">
                        {user.approvalStatus === 'APPROVED' ? (
                           <CheckCircle className="size-3 text-emerald-400" />
                        ) : user.approvalStatus === 'PENDING' ? (
                           <Activity className="size-3 text-amber-400" />
                        ) : (
                           <UserX className="size-3 text-rose-400" />
                        )}
                        <p className={cn(
                           "text-[9px] font-black uppercase tracking-wider",
                           user.approvalStatus === 'APPROVED' ? "text-emerald-400" : 
                           user.approvalStatus === 'PENDING' ? "text-amber-400" : "text-rose-400"
                        )}>
                           {user.approvalStatus}
                        </p>
                     </div>
                  </div>
               </div>

               {ticketStats && (
                  <div className="mt-auto w-full grid grid-cols-2 gap-2 pt-4 border-t border-white/10">
                     <div className="text-center">
                        <p className="text-lg font-black text-[#ACDF33] leading-none mb-0.5">{ticketStats.resolvedTickets}</p>
                        <p className="text-[7px] font-black text-white/30 uppercase tracking-widest">Resolved</p>
                     </div>
                     <div className="text-center">
                        <p className="text-lg font-black text-white leading-none mb-0.5">{ticketStats.activeTickets}</p>
                        <p className="text-[7px] font-black text-white/30 uppercase tracking-widest">Active</p>
                     </div>
                  </div>
               )}
            </div>

            {/* Right Section: Compact Hub */}
            <div className="flex-1 flex flex-col bg-slate-50/20 overflow-hidden">
               {/* Minimal Toolbar */}
               <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
                  <div className="flex items-center gap-1.5">
                     <div className="size-1.5 rounded-full bg-[#00A38C]" />
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">User Profile</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                     {!isEditing ? (
                        <Button 
                           onClick={() => setIsEditing(true)} 
                           variant="ghost"
                           className="h-8 px-3 rounded-lg text-slate-600 font-bold text-[11px] gap-1.5 hover:bg-slate-50 transition-none"
                        >
                           <Edit3 className="size-3" />
                           Edit Profile
                        </Button>
                     ) : (
                        <div className="flex items-center gap-1.5">
                           <Button 
                              variant="ghost" 
                              onClick={() => {
                                 setIsEditing(false)
                                 fetchUserDetails()
                              }}
                              className="h-8 px-2.5 rounded-lg text-slate-400 font-bold text-[11px] hover:text-slate-600 transition-none"
                           >
                              Cancel
                           </Button>
                           <Button 
                              onClick={handleSave} 
                              disabled={isSaving}
                              className="h-8 px-3 rounded-lg bg-[#032313] text-[#ACDF33] font-black text-[11px] shadow-sm gap-1.5 hover:bg-[#032313] transition-none"
                           >
                              {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                              Save
                           </Button>
                        </div>
                     )}
                     <div className="w-[1px] h-3 bg-slate-200 mx-1" />
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onOpenChange(false)}
                        className="rounded-full size-7 text-slate-400 hover:text-slate-900 transition-none"
                     >
                        <X className="size-4" />
                     </Button>
                  </div>
               </div>

               {/* Scrolling Content */}
               <div className="flex-1 overflow-y-auto p-6 md:p-8 shrink-0 scrollbar-hide">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
                     
                     {/* Column 1: Core Records */}
                     <div className="space-y-5">
                        <div className="flex items-center gap-2">
                           <ShieldCheck className="size-3.5 text-[#00A38C]" />
                           <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Core Information</h3>
                        </div>

                        <div className="space-y-3.5">
                           <div className="space-y-1">
                              <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Full Name</Label>
                              {isEditing ? (
                                 <input
                                    value={editData.name}
                                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-[#032313]/10 focus:border-[#032313]"
                                 />
                              ) : (
                                 <p className="text-[13px] font-bold text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">{user.name}</p>
                              )}
                           </div>

                           <div className="space-y-1">
                              <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-0.5">System Role</Label>
                              {isEditing ? (
                                 <Select value={editData.role} onValueChange={(value) => setEditData(prev => ({ ...prev, role: value }))}>
                                    <SelectTrigger className="h-9 rounded-lg border-slate-200 font-bold text-slate-900 text-sm focus:ring-0">
                                       <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                       {constants.roles.map(role => (
                                         <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              ) : (
                                 <div className="flex items-center h-9 gap-2 bg-white px-3 rounded-lg border border-slate-100 shadow-sm">
                                    <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-bold px-1.5 py-0 rounded shadow-none uppercase">
                                       {user.role}
                                    </Badge>
                                 </div>
                              )}
                           </div>

                           {(editData.role === 'DEPARTMENT_USER' || (!isEditing && user.role === 'DEPARTMENT_USER')) && (
                              <div className="space-y-3.5 pt-1.5 border-t border-slate-100">
                                 <div className="space-y-1">
                                    <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Department</Label>
                                    {isEditing ? (
                                       <Select value={editData.department} onValueChange={(value) => setEditData(prev => ({ ...prev, department: value }))}>
                                          <SelectTrigger className="h-9 rounded-lg border-slate-200 font-bold text-slate-900 text-sm focus:ring-0">
                                             <SelectValue placeholder="Select Department" />
                                          </SelectTrigger>
                                          <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                             {constants.departments.map(dept => (
                                               <SelectItem key={dept} value={dept}>{dept.replace(/_/g, ' ')}</SelectItem>
                                             ))}
                                          </SelectContent>
                                       </Select>
                                    ) : (
                                       <p className="text-[12px] font-bold text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                                          {user.department?.replace(/_/g, ' ') || 'Not Assigned'}
                                       </p>
                                    )}
                                 </div>

                                 {isEditing && (
                                   <div className="space-y-1">
                                      <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Executive Status</Label>
                                      <Select 
                                         value={editData.isHead ? 'true' : 'false'} 
                                         onValueChange={(value) => setEditData(prev => ({ ...prev, isHead: value === 'true' }))}
                                      >
                                         <SelectTrigger className="h-9 rounded-lg border-slate-200 font-bold text-slate-900 text-sm focus:ring-0">
                                            <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                            <SelectItem value="false">Operational Staff</SelectItem>
                                            <SelectItem value="true">Departmental Head</SelectItem>
                                         </SelectContent>
                                      </Select>
                                   </div>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Column 2: Compact History */}
                     <div className="space-y-5">
                        <div className="flex items-center gap-2">
                           <Activity className="size-3.5 text-[#00A38C]" />
                           <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Status Tracking</h3>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2.5">
                           <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                              <div className="flex items-center gap-1.5">
                                 <Calendar className="size-3 text-slate-400" />
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Joined</p>
                              </div>
                              <p className="text-[11px] font-black text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</p>
                           </div>

                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                 <History className="size-3 text-slate-400" />
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Updated</p>
                              </div>
                              <p className="text-[11px] font-black text-slate-900">{new Date(user.updatedAt).toLocaleDateString()}</p>
                           </div>
                        </div>

                        {(user.approvedBy || user.approvalStatus !== 'PENDING') && (
                           <div className="bg-[#032313] text-white p-5 rounded-xl shadow relative overflow-hidden">
                              <Info className="absolute -right-2 -bottom-2 size-12 text-white/5" />
                              <div className="relative z-10">
                                 <p className="text-[8px] font-black text-[#ACDF33] uppercase tracking-widest mb-2.5">Approval Meta</p>
                                 <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                       <span className="text-[10px] text-white/50">Verified By</span>
                                       <span className="text-[10px] font-bold truncate max-w-[120px]">{user.approvedBy || 'System'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                       <span className="text-[10px] text-white/50">Timestamp</span>
                                       <span className="text-[10px] font-bold">{user.approvedAt ? new Date(user.approvedAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        )}

                        {user.rejectionReason && (
                           <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                              <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">Reason</p>
                              <p className="text-[11px] font-bold text-rose-700 italic leading-snug">"{user.rejectionReason}"</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
