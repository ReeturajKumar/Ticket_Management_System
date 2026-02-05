import { memo, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, User as UserIcon, Tag, UserPlus } from "lucide-react"
import { TicketQuickActions } from "@/components/department/TicketQuickActions"
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/config/themeConfig"
import type { Ticket, UserReference } from "@/types/ticket"

// ============================================================================
// TICKET CARD COMPONENT
// ============================================================================

export interface TicketCardProps {
  ticket: Ticket
  isSelected: boolean
  isMyRequest: boolean
  isHead: boolean
  userId: string | undefined
  onToggleSelect: (ticketId: string) => void
  onOpenDetails: (ticketId: string) => void
  onAssign: (ticket: Ticket) => void
  onRefresh: () => void
}

export const TicketCard = memo(function TicketCard({
  ticket,
  isSelected,
  isMyRequest,
  isHead,
  userId,
  onToggleSelect,
  onOpenDetails,
  onAssign,
  onRefresh,
}: TicketCardProps) {
  const ticketId = ticket._id || ticket.id || ""

  const handleTicketClick = useCallback(() => {
    onOpenDetails(ticketId)
  }, [ticketId, onOpenDetails])

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleCheckboxChange = useCallback(() => {
    onToggleSelect(ticketId)
  }, [ticketId, onToggleSelect])

  const handleAssignClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAssign(ticket)
  }, [ticket, onAssign])

  // Memoize date formatting
  const formattedDate = useMemo(() => {
    return new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [ticket.createdAt])

  // Helper for names
  const createdByName = typeof ticket.createdBy === 'object' 
    ? (ticket.createdBy as UserReference)?.name 
    : (ticket.userName || 'User')

  const assignedToName = typeof ticket.assignedTo === 'object'
    ? (ticket.assignedTo as UserReference)?.name
    : 'Unassigned'

  const assignedToId = typeof ticket.assignedTo === 'object'
    ? (ticket.assignedTo as UserReference)?._id
    : ticket.assignedTo

  const priorityInfo = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.LOW

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all mb-2.5 
        ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''} 
        ${isMyRequest ? 'border-r-4 border-r-primary bg-primary/5' : ''}`}
      onClick={handleTicketClick}
    >
      <CardContent className="p-2.5">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            {/* Checkbox for Department Heads with visual indicator */}
            {isHead && (
              <div 
                className="pt-0.5 group" 
                onClick={handleCheckboxClick}
                title="Select for bulk actions"
              >
                <div className={`p-0.5 rounded transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={handleCheckboxChange}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] text-muted-foreground font-mono">
                  #{ticket.ticketId || ticketId.slice(-6)}
                </span>
                <Badge variant={priorityInfo.variant as any} className="text-[9px] h-3.5 px-1.5">
                  {priorityInfo.label}
                </Badge>
                {isMyRequest && (
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1.5 bg-primary/10 text-primary border-primary/20 uppercase">
                    My Request
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-xs line-clamp-1 mb-1">{ticket.subject}</h4>
            </div>
          </div>
        
        {ticket.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            {ticket.description}
          </p>
        )}

        <div className="space-y-1.5 pt-1.5 border-t mt-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {formattedDate}
          </div>
          
          <div className="space-y-1">
            {/* Creator or Target Department */}
            <div className="flex items-center gap-1 text-[10px]">
              {isMyRequest ? (
                <>
                  <span className="text-muted-foreground font-medium text-[9px]">To:</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30">
                    <Tag className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[100px]">
                      {ticket.department}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground font-medium text-[9px]">From:</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30">
                    <UserIcon className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[100px]" title={createdByName}>
                      {createdByName}
                    </span>
                  </div>
                </>
              )}
            </div>
            
            {/* Assigned Staff */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-muted-foreground font-medium text-[9px]">Staff:</span>
              {assignedToId ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950/30">
                  <UserPlus className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium truncate max-w-[100px]" title={assignedToName}>
                    {assignedToName}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/30">
                  <UserPlus className="h-2.5 w-2.5 text-orange-600 dark:text-orange-400" />
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    Unassigned
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions for Department Heads & Assigned Staff */}
        {((isHead && assignedToId) || (!isHead && assignedToId === userId)) && !isMyRequest && (
          <div className="mt-2 pt-2 border-t">
            <TicketQuickActions
              ticketId={ticketId}
              currentStatus={ticket.status}
              currentPriority={ticket.priority}
              onUpdate={onRefresh}
              compact
            />
          </div>
        )}

        {/* Assign Button for Unassigned Tickets */}
        {isHead && !assignedToId && !isMyRequest && (
          <div className="mt-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline"
              className="w-full h-7 text-[10px] hover:bg-primary/5 hover:text-primary hover:border-primary/30"
              onClick={handleAssignClick}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Assign Staff
            </Button>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  )
})

export default TicketCard

// ============================================================================
// COMPATIBILITY EXPORTS
// These are deprecated and will be removed in favor of themeConfig.ts
// ============================================================================

export const getPriorityColor = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.LOW
  return config.variant as any
}

export const getStatusColor = (status: string): string => {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.OPEN
  return config.color
}
