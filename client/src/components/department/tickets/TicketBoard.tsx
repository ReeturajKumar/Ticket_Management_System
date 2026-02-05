import { memo, useMemo, useCallback } from "react"
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { TicketCard, type TicketCardProps } from "./TicketCard"
import type { Ticket, UserReference } from "@/types/ticket"
import { STATUS_CONFIG, type StatusColumn } from "@/config/themeConfig"

// ============================================================================
// DROPPABLE COLUMN COMPONENT
// ============================================================================

interface DroppableColumnProps {
  id: string
  children: React.ReactNode
}

export function DroppableColumn({ id, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  
  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 space-y-0 min-h-[150px] sm:min-h-[180px] md:min-h-[200px] rounded-lg p-2 sm:p-3 transition-colors ${
        isOver ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/30'
      }`}
    >
      {children}
    </div>
  )
}

// ============================================================================
// DRAGGABLE TICKET CARD WRAPPER
// ============================================================================

interface DraggableTicketCardProps extends Omit<TicketCardProps, 'onToggleSelect' | 'onOpenDetails' | 'onAssign' | 'onRefresh'> {
  onToggleSelect: (ticketId: string) => void
  onOpenDetails: (ticketId: string) => void
  onAssign: (ticket: Ticket) => void
  onRefresh: () => void
}

export const DraggableTicketCard = memo(function DraggableTicketCard({ 
  ticket,
  isSelected,
  isMyRequest,
  isHead,
  userId,
  onToggleSelect,
  onOpenDetails,
  onAssign,
  onRefresh,
}: DraggableTicketCardProps) {
  const ticketId = ticket._id || ticket.id || ""
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticketId,
  })

  const style = useMemo(() => ({
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }), [transform, isDragging])

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard 
        ticket={ticket}
        isSelected={isSelected}
        isMyRequest={isMyRequest}
        isHead={isHead}
        userId={userId}
        onToggleSelect={onToggleSelect}
        onOpenDetails={onOpenDetails}
        onAssign={onAssign}
        onRefresh={onRefresh}
      />
    </div>
  )
})

// ============================================================================
// TICKET BOARD COMPONENT
// ============================================================================

interface TicketBoardProps {
  tickets: Ticket[]
  statusColumns: readonly StatusColumn[]
  selectedTicketIds: string[]
  activeTab: string
  isHead: boolean
  userId: string | undefined
  onDragEnd: (event: DragEndEvent) => void
  onToggleSelect: (ticketId: string) => void
  onOpenDetails: (ticketId: string) => void
  onAssign: (ticket: Ticket) => void
  onRefresh: () => void
}

export function TicketBoard({
  tickets,
  statusColumns,
  selectedTicketIds,
  activeTab,
  isHead,
  userId,
  onDragEnd,
  onToggleSelect,
  onOpenDetails,
  onAssign,
  onRefresh,
}: TicketBoardProps) {
  // Memoized sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Drag start handler
  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // Drag start logic
  }, [])

  // Memoized grouped tickets by status
  const groupedTickets = useMemo(() => {
    return statusColumns.reduce((acc, column) => {
      acc[column.key] = tickets.filter(ticket => ticket.status === column.key)
      return acc
    }, {} as Record<string, Ticket[]>)
  }, [statusColumns, tickets])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={`grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 ${activeTab === 'unassigned' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
        {statusColumns.map((column) => {
          const statusInfo = STATUS_CONFIG[column.key as keyof typeof STATUS_CONFIG]
          
          return (
            <div key={column.key} className="flex flex-col">
              <div className="mb-2 sm:mb-3 md:mb-4 flex items-center justify-between border-b pb-1.5 sm:pb-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${statusInfo?.color || 'bg-slate-500'}`} />
                  <h3 className="font-bold text-xs sm:text-sm tracking-tight">{column.label}</h3>
                  <Badge variant="secondary" className="h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-semibold">
                    {groupedTickets[column.key]?.length || 0}
                  </Badge>
                </div>
              </div>
              <DroppableColumn id={column.key}>
                {groupedTickets[column.key]?.length > 0 ? (
                  <div className={activeTab === 'unassigned' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4" : "space-y-2 sm:space-y-3"}>
                    {groupedTickets[column.key].map((ticket) => {
                      const ticketId = ticket._id || ticket.id || ""
                      
                      const createdBy = ticket.createdBy
                      const createdById = typeof createdBy === 'string' 
                        ? createdBy 
                        : (createdBy as UserReference)?._id
                      
                      const isMyRequest = createdById === userId
                      
                      return (
                        <DraggableTicketCard 
                          key={ticketId} 
                          ticket={ticket}
                          isSelected={selectedTicketIds.includes(ticketId)}
                          isMyRequest={isMyRequest}
                          isHead={isHead}
                          userId={userId}
                          onToggleSelect={onToggleSelect}
                          onOpenDetails={onOpenDetails}
                          onAssign={onAssign}
                          onRefresh={onRefresh}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 sm:h-36 md:h-40 bg-muted/20 border-2 border-dashed rounded-lg sm:rounded-xl text-center p-3 sm:p-4">
                    <Clock className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-muted-foreground/30 mb-1.5 sm:mb-2" />
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">No {column.label.toLowerCase()} tickets</p>
                  </div>
                )}
              </DroppableColumn>
            </div>
          )
        })}
      </div>
    </DndContext>
  )
}

export default TicketBoard
