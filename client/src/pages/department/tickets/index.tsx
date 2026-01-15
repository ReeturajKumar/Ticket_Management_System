import { useEffect, useState } from "react"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCurrentDepartmentUser } from "@/services/departmentAuthService"
import { getMyTickets, getUnassignedTickets, pickupTicket, updateMyTicketStatus } from "@/services/departmentStaffService"
import { getAllTickets, updateTicketStatus } from "@/services/departmentHeadService"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Loader2, Search, Filter, Clock, User as UserIcon, Calendar, Tag, LayoutGrid, List, UserPlus } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { AssignTicketDialog } from "@/components/department/AssignTicketDialog"
import { TicketQuickActions } from "@/components/department/TicketQuickActions"
import { BulkActionsToolbar } from "@/components/department/BulkActionsToolbar"
import { BulkAssignDialog } from "@/components/department/BulkAssignDialog"
import { BulkCloseDialog } from "@/components/department/BulkCloseDialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'react-toastify'

export default function DepartmentTicketsPage() {
  const user = getCurrentDepartmentUser()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/unassigned')) return 'unassigned'
    return user?.isHead ? "all-tickets" : "my-tickets"
  })
  const [tickets, setTickets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [viewMode, setViewMode] = useState<"list" | "board">("board")
  
  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)

  // Bulk operations state (Department Head only)
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([])
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false)
  const [bulkCloseDialogOpen, setBulkCloseDialogOpen] = useState(false)

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  )


  const fetchData = async () => {
    setIsLoading(true)
    try {
      let data = []
      
      // Department Head: Show all tickets by default
      if (user?.isHead) {
        if (activeTab === "all-tickets" || activeTab === "my-tickets") {
          const res = await getAllTickets()
          data = res.data?.tickets || []
        } else if (activeTab === "unassigned") {
          const res = await getUnassignedTickets()
          data = res.data?.tickets || res.data || []
        }
      } 
      // Department Staff: Show only assigned tickets
      else {
        if (activeTab === "my-tickets") {
          const res = await getMyTickets()
          data = res.data?.tickets || []
        } else if (activeTab === "unassigned") {
          const res = await getUnassignedTickets()
          data = res.data?.tickets || res.data || []
        }
      }
      
      setTickets(data)
    } catch (error) {
      console.error("Failed to fetch tickets", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab, user?.isHead])

  const handlePickup = async (ticketId: string) => {
    try {
      await pickupTicket(ticketId)
      toast.success("Ticket picked up successfully")
      fetchData()
    } catch (error) {
      toast.error("Failed to pick up ticket")
    }
  }

  // Bulk operations handlers
  const handleToggleTicket = (ticketId: string) => {
    setSelectedTicketIds(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTicketIds.length === filteredTickets.length) {
      setSelectedTicketIds([])
    } else {
      setSelectedTicketIds(filteredTickets.map(t => t._id || t.id))
    }
  }

  const handleBulkAssignSuccess = () => {
    setSelectedTicketIds([])
    fetchData()
  }

  const handleBulkCloseSuccess = () => {
    setSelectedTicketIds([])
    fetchData()
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    // Extract ticket ID and new status
    const ticketId = active.id as string
    const newStatus = over.id as string

    // Find the ticket being dragged
    const ticket = tickets.find(t => (t._id || t.id) === ticketId)
    if (!ticket) return

    // Don't allow status change if ticket is already in that status
    if (ticket.status === newStatus) return

    try {
      // Optimistically update UI
      setTickets(prev => prev.map(t => 
        (t._id || t.id) === ticketId ? { ...t, status: newStatus } : t
      ))

      // Call appropriate API based on user role
      if (user?.isHead) {
        await updateTicketStatus(ticketId, newStatus)
      } else {
        await updateMyTicketStatus(ticketId, newStatus)
      }
      toast.success(`Ticket Status Updated Successfully`)
      
      // Refresh data to ensure consistency
      fetchData()
    } catch (error) {
      console.error("Failed to update ticket status", error)
      toast.error("Failed to update ticket status")
      // Revert optimistic update
      fetchData()
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ticket.ticketId && ticket.ticketId.includes(searchTerm)) ||
                          (ticket.studentName && ticket.studentName.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesPriority = priorityFilter === "ALL" || ticket.priority === priorityFilter
    return matchesSearch && matchesPriority
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'default'
      case 'MEDIUM': return 'secondary'
      case 'LOW': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-500'
      case 'ASSIGNED': return 'bg-yellow-500'
      case 'IN_PROGRESS': return 'bg-orange-500'
      case 'WAITING_FOR_STUDENT': return 'bg-purple-500'
      case 'RESOLVED': return 'bg-green-500'
      case 'CLOSED': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  // Dynamic status columns based on active tab
  const statusColumns = activeTab === 'unassigned' 
    ? [
        { key: 'OPEN', label: 'Open', color: 'blue' },
      ]
    : [
        { key: 'ASSIGNED', label: 'Assigned', color: 'yellow' },
        { key: 'IN_PROGRESS', label: 'In Progress', color: 'orange' },
        { key: 'WAITING_FOR_STUDENT', label: 'Waiting', color: 'purple' },
        { key: 'RESOLVED', label: 'Resolved', color: 'green' },
        { key: 'CLOSED', label: 'Closed', color: 'gray' },
      ]

  const groupedTickets = statusColumns.reduce((acc, column) => {
    acc[column.key] = filteredTickets.filter(ticket => ticket.status === column.key)
    return acc
  }, {} as Record<string, any[]>)

  // Droppable column wrapper
  const DroppableColumn = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id })
    
    return (
      <div 
        ref={setNodeRef}
        className={`flex-1 space-y-0 min-h-[200px] rounded-lg p-3 transition-colors ${
          isOver ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/30'
        }`}
      >
        {children}
      </div>
    )
  }

  // Draggable ticket card wrapper
  const DraggableTicketCard = ({ ticket }: { ticket: any }) => {
    const ticketId = ticket._id || ticket.id
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: ticketId,
    })

    const style = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <TicketCard ticket={ticket} />
      </div>
    )
  }

  const TicketCard = ({ ticket }: { ticket: any }) => {
    const ticketId = ticket._id || ticket.id
    const isSelected = selectedTicketIds.includes(ticketId)

    return (
      <Card 
        className={`cursor-pointer hover:shadow-md transition-all mb-2.5 ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
        onClick={() => navigate(`/department/tickets/${ticketId}`)}
      >
        <CardContent className="p-2.5">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              {/* Checkbox for Department Heads with visual indicator */}
              {user?.isHead && (
                <div 
                  className="pt-0.5 group" 
                  onClick={(e) => e.stopPropagation()}
                  title="Select for bulk actions"
                >
                  <div className={`p-0.5 rounded transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleTicket(ticketId)}
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    #{ticket.ticketId || ticket._id?.slice(-6)}
                  </span>
                  <Badge variant={getPriorityColor(ticket.priority) as any} className="text-[9px] h-3.5 px-1.5">
                    {ticket.priority}
                  </Badge>
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
              {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            
            <div className="space-y-1">
              {/* Creator (Student) */}
              {ticket.studentName && (
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-muted-foreground font-medium">Creator:</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30">
                    <UserIcon className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[100px]" title={ticket.studentName}>
                      {ticket.studentName}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Assigned Staff */}
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-muted-foreground font-medium">Assigned:</span>
                {ticket.assignedToName ? (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950/30">
                    <UserPlus className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                    <span className="text-green-600 dark:text-green-400 font-medium truncate max-w-[100px]" title={ticket.assignedToName}>
                      {ticket.assignedToName}
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

          {/* Quick Actions for Department Heads */}
          {user?.isHead && ticket.assignedTo && (
            <div className="mt-2 pt-2 border-t">
              <TicketQuickActions
                ticketId={ticket._id || ticket.id}
                currentStatus={ticket.status}
                currentPriority={ticket.priority}
                onUpdate={fetchData}
                compact
              />
            </div>
          )}

          {/* Assign Button for Unassigned Tickets */}
          {user?.isHead && !ticket.assignedTo && (
            <div className="mt-2 pt-2 border-t">
              <Button 
                size="sm" 
                variant="outline"
                className="w-full h-7 text-[10px]"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedTicket(ticket);
                  setAssignDialogOpen(true);
                }}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Assign to Staff
              </Button>
            </div>
          )}
          </div>
        </CardContent>
      </Card>
    )
  }


  return (
    <DepartmentLayout>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {user?.department} Department
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your department's support queue
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "board" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("board")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Board
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        </div>

        <Tabs 
          value={activeTab} 
          className="space-y-4" 
          onValueChange={setActiveTab}
        >
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              {user?.isHead ? (
                <>
                  <TabsTrigger value="all-tickets">
                    Ticket Queue
                  </TabsTrigger>
                  <TabsTrigger value="unassigned">
                    Unassigned
                    {activeTab === "unassigned" && tickets.length > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{tickets.length}</Badge>
                    )}
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="my-tickets">
                    My Tickets
                  </TabsTrigger>
                  <TabsTrigger value="unassigned">
                    Unassigned
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tickets..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span className="text-sm">Priority</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priority</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : viewMode === "board" ? (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className={`grid gap-3 ${activeTab === 'unassigned' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5'}`}>
                  {statusColumns.map((column) => (
                    <div key={column.key} className="flex flex-col">
                      <div className="mb-3 flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full bg-${column.color}-500`} />
                        <h3 className="font-semibold text-sm">{column.label}</h3>
                        <Badge variant="secondary" className="ml-auto h-5 px-2 text-xs">
                          {groupedTickets[column.key]?.length || 0}
                        </Badge>
                      </div>
                      <DroppableColumn id={column.key}>
                        {groupedTickets[column.key]?.length > 0 ? (
                          groupedTickets[column.key].map((ticket) => (
                            <DraggableTicketCard key={ticket._id || ticket.id} ticket={ticket} />
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                            No tickets
                          </div>
                        )}
                      </DroppableColumn>
                    </div>
                  ))}
                </div>
              </DndContext>
            ) : (
              <div className="grid gap-3">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <Card 
                      key={ticket._id || ticket.id} 
                      className="cursor-pointer hover:shadow-md transition-all border-l-4"
                      style={{ borderLeftColor: `var(--${getStatusColor(ticket.status).replace('bg-', '')})` }}
                      onClick={() => navigate(`/department/tickets/${ticket._id || ticket.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {ticket.status.replace(/_/g, ' ')}
                              </Badge>
                              <Badge variant={getPriorityColor(ticket.priority) as any} className="text-xs">
                                {ticket.priority}
                              </Badge>
                              <h3 className="font-semibold text-base">{ticket.subject}</h3>
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              {ticket.studentName && (
                                <span className="flex items-center gap-1.5">
                                  <UserIcon className="h-3.5 w-3.5" />
                                  {ticket.studentName}
                                </span>
                              )}
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(ticket.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                            </div>

                            {ticket.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {ticket.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-muted p-3 mb-4">
                        <Search className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">No tickets found</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        {searchTerm || priorityFilter !== "ALL"
                          ? "Try adjusting your filters or search term"
                          : "No tickets available in this category"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Assignment Dialog */}
      {selectedTicket && (
        <AssignTicketDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          ticketId={selectedTicket._id || selectedTicket.id}
          ticketSubject={selectedTicket.subject}
          onSuccess={() => {
            fetchData()
            setSelectedTicket(null)
          }}
        />
      )}

      {/* Bulk Operations (Department Head only) */}
      {user?.isHead && (
        <>
          <BulkActionsToolbar
            selectedCount={selectedTicketIds.length}
            onAssign={() => setBulkAssignDialogOpen(true)}
            onClose={() => setBulkCloseDialogOpen(true)}
            onClear={() => setSelectedTicketIds([])}
          />

          <BulkAssignDialog
            open={bulkAssignDialogOpen}
            onOpenChange={setBulkAssignDialogOpen}
            ticketIds={selectedTicketIds}
            onSuccess={handleBulkAssignSuccess}
          />

          <BulkCloseDialog
            open={bulkCloseDialogOpen}
            onOpenChange={setBulkCloseDialogOpen}
            ticketIds={selectedTicketIds}
            onSuccess={handleBulkCloseSuccess}
          />
        </>
      )}
    </DepartmentLayout>
  )
}
