import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTicketStatus as updateHeadStatus, changeTicketPriority } from "@/services/departmentHeadService"
import { updateMyTicketStatus as updateStaffStatus } from "@/services/departmentStaffService"
import { getCurrentDepartmentUser } from "@/services/departmentAuthService"
import { Loader2 } from "lucide-react"

interface TicketQuickActionsProps {
  ticketId: string
  currentStatus: string
  currentPriority: string
  onUpdate: () => void
  compact?: boolean
}

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open", color: "text-blue-600" },
  { value: "IN_PROGRESS", label: "In Progress", color: "text-yellow-600" },
  { value: "WAITING_FOR_USER", label: "Waiting", color: "text-orange-600" },
  { value: "RESOLVED", label: "Resolved", color: "text-green-600" },
  { value: "CLOSED", label: "Closed", color: "text-gray-600" },
]

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "text-gray-600" },
  { value: "MEDIUM", label: "Medium", color: "text-blue-600" },
  { value: "HIGH", label: "High", color: "text-orange-600" },
  { value: "CRITICAL", label: "Critical", color: "text-red-600" },
]

export function TicketQuickActions({ 
  ticketId, 
  currentStatus, 
  currentPriority, 
  onUpdate,
  compact = false 
}: TicketQuickActionsProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return
    
    setIsUpdatingStatus(true)
    const user = getCurrentDepartmentUser()
    try {
      if (user?.isHead) {
        await updateHeadStatus(ticketId, newStatus)
      } else {
        await updateStaffStatus(ticketId, newStatus)
      }
      onUpdate()
    } catch (error) {
      console.error("Failed to update status:", error)
      alert("Failed to update ticket status. Please try again.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    if (newPriority === currentPriority) return
    
    setIsUpdatingPriority(true)
    try {
      await changeTicketPriority(ticketId, newPriority)
      onUpdate()
    } catch (error) {
      console.error("Failed to update priority:", error)
      alert("Failed to update ticket priority. Please try again.")
    } finally {
      setIsUpdatingPriority(false)
    }
  }

  if (compact) {
    const currentStatusLabel = STATUS_OPTIONS.find(s => s.value === currentStatus)?.label || currentStatus
    const currentPriorityLabel = PRIORITY_OPTIONS.find(p => p.value === currentPriority)?.label || currentPriority
    
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
          <SelectTrigger className="h-7 w-[120px] text-[10px]">
            {isUpdatingStatus ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className="truncate">{currentStatusLabel}</span>
            )}
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value} className="text-xs">
                <span className={status.color}>{status.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentPriority} onValueChange={handlePriorityChange} disabled={isUpdatingPriority}>
          <SelectTrigger className="h-7 w-[100px] text-[10px]">
            {isUpdatingPriority ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className="truncate">{currentPriorityLabel}</span>
            )}
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((priority) => (
              <SelectItem key={priority.value} value={priority.value} className="text-xs">
                <span className={priority.color}>{priority.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
          <SelectTrigger>
            {isUpdatingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                <span className={status.color}>{status.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Priority</label>
        <Select value={currentPriority} onValueChange={handlePriorityChange} disabled={isUpdatingPriority}>
          <SelectTrigger>
            {isUpdatingPriority ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SelectValue />
            )}
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                <span className={priority.color}>{priority.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
