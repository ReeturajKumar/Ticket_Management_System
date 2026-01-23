import { useEffect, useState } from "react"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { getCurrentDepartmentUser } from "@/services/departmentAuthService"
import { getMyTickets, getUnassignedTickets, updateMyTicketStatus, getMyInternalRequests } from "@/services/departmentStaffService"
import { getAllTickets, updateTicketStatus } from "@/services/departmentHeadService"
import { DndContext,  PointerSensor, useSensor, useSensors, useDroppable, useDraggable, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Loader2, Search,  Clock, User as UserIcon, Calendar, Tag, LayoutGrid, List, UserPlus } from "lucide-react"
import { useLocation } from "react-router-dom"
import { AssignTicketDialog } from "@/components/department/AssignTicketDialog"
import { TicketQuickActions } from "@/components/department/TicketQuickActions"
import { BulkActionsToolbar } from "@/components/department/BulkActionsToolbar"
import { BulkAssignDialog } from "@/components/department/BulkAssignDialog"
import { BulkCloseDialog } from "@/components/department/BulkCloseDialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'react-toastify'

import { CreateInternalTicketDialog } from "@/components/department/CreateInternalTicketDialog"
import { TicketDetailsDialog } from "@/components/department/TicketDetailsDialog"
import { Plus } from "lucide-react"

export default function DepartmentTicketsPage() {
  const user = getCurrentDepartmentUser()
  const location = useLocation()
  
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/unassigned')) return 'unassigned'
    return user?.isHead ? "all-tickets" : "my-tickets"
  })
  const [tickets, setTickets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [viewMode, setViewMode] = useState<"list" | "board">("board")
  
  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)

  // Internal Ticket Dialog State
  const [createInternalDialogOpen, setCreateInternalDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [viewingTicketId, setViewingTicketId] = useState<string>("")

  // Bulk operations state (Department Head only)
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([])
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false)
  const [bulkCloseDialogOpen, setBulkCloseDialogOpen] = useState(false)

  // Drag and drop state

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
      // Independently fetch unassigned count for the badge
      const unassignedRes = await getUnassignedTickets()
      const unassignedTickets = unassignedRes.data?.tickets || unassignedRes.data || []
      setUnassignedCount(unassignedTickets.length)

      let data = []
      
      // Department Head: Show all tickets by default
      if (user?.isHead) {
        if (activeTab === "all-tickets" || activeTab === "my-tickets") {
          const res = await getAllTickets()
          data = res.data?.tickets || []
        } else if (activeTab === "unassigned") {
          data = unassignedTickets
        } else if (activeTab === "my-requests") {
          const res = await getMyInternalRequests()
          data = res.data?.tickets || []
        }
      } 
      // Department Staff: Show only assigned tickets
      else {
        if (activeTab === "my-tickets") {
          const res = await getMyTickets()
          data = res.data?.tickets || []
        } else if (activeTab === "unassigned") {
          data = unassignedTickets
        } else if (activeTab === "my-requests") {
          const res = await getMyInternalRequests()
          data = res.data?.tickets || []
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


  // Bulk operations handlers
  const handleToggleTicket = (ticketId: string) => {
    setSelectedTicketIds(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    )
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
  const handleDragStart = (_event: DragStartEvent) => {
    // Drag start logic
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

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
                          (ticket.userName && ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()))
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
      case 'WAITING_FOR_USER': return 'bg-purple-500'
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
    : activeTab === 'my-requests'
    ? [
        { key: 'OPEN', label: 'Open', color: 'blue' },
        { key: 'ASSIGNED', label: 'Assigned', color: 'yellow' },
        { key: 'IN_PROGRESS', label: 'In Progress', color: 'orange' },
        { key: 'RESOLVED', label: 'Resolved', color: 'green' },
        { key: 'CLOSED', label: 'Closed', color: 'gray' },
      ]
    : [
        { key: 'ASSIGNED', label: 'Assigned', color: 'yellow' },
        { key: 'IN_PROGRESS', label: 'In Progress', color: 'orange' },
        { key: 'WAITING_FOR_USER', label: 'Waiting', color: 'purple' },
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
    // Identify if this is a ticket created by me (internal request)
    const isMyRequest = ticket.createdBy === user?.id || ticket.createdBy?._id === user?.id

    const handleTicketClick = () => {
      setViewingTicketId(ticketId)
      setDetailsDialogOpen(true)
    }

    return (
      <Card 
        className={`cursor-pointer hover:shadow-md transition-all mb-2.5 ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''} ${isMyRequest ? 'border-r-4 border-r-indigo-500 bg-indigo-50/10' : ''}`}
        onClick={handleTicketClick}
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
                  {isMyRequest && (
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1.5 bg-indigo-100 text-indigo-700 border-indigo-200 uppercase">
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
              {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            
            <div className="space-y-1">
              {/* Creator or Target Department */}
              <div className="flex items-center gap-1 text-[10px]">
                {isMyRequest ? (
                  <>
                    <span className="text-muted-foreground font-medium">To:</span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30">
                      <Tag className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[100px]">
                        {ticket.department}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground font-medium">Creator:</span>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30">
                      <UserIcon className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[100px]" title={ticket.userName || ticket.createdByName}>
                        {ticket.userName || ticket.createdByName || 'User'}
                      </span>
                    </div>
                  </>
                )}
              </div>
              
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

          {/* Quick Actions for Department Heads & Assigned Staff */}
          {((user?.isHead && ticket.assignedTo) || (!user?.isHead && ticket.assignedTo === user?.id)) && !isMyRequest && (
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
          {user?.isHead && !ticket.assignedTo && !isMyRequest && (
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
              onClick={() => setCreateInternalDialogOpen(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create Internal Ticket
            </Button>
            {activeTab !== 'my-requests' && (
              <>
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
              </>
            )}
          </div>
        </div>

        <Tabs 
          value={activeTab} 
          className="space-y-4" 
          onValueChange={setActiveTab}
        >
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              {user?.isHead ? (
                <>
                  <TabsTrigger value="all-tickets">
                    Queue
                  </TabsTrigger>
                  <TabsTrigger value="unassigned">
                    Unassigned
                    {unassignedCount > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{unassignedCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="my-requests">
                    My Requests
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="my-tickets">
                    My Tickets
                  </TabsTrigger>
                  <TabsTrigger value="unassigned">
                    Unassigned
                    {unassignedCount > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{unassignedCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="my-requests">
                    My Requests
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
            ) : activeTab === 'my-requests' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <TicketCard key={ticket._id || ticket.id} ticket={ticket} />
                  ))
                ) : (
                  <Card className="border-dashed col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-muted p-3 mb-4">
                        <Search className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-1">No requests found</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        You haven't created any internal requests yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : viewMode === "board" ? (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className={`grid gap-6 ${activeTab === 'unassigned' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5'}`}>
                  {statusColumns.map((column) => (
                    <div key={column.key} className="flex flex-col">
                      <div className="mb-4 flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${column.color === 'blue' ? 'bg-blue-500' : column.color === 'yellow' ? 'bg-yellow-500' : column.color === 'orange' ? 'bg-orange-500' : column.color === 'purple' ? 'bg-purple-500' : column.color === 'green' ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <h3 className="font-bold text-sm tracking-tight">{column.label}</h3>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
                            {groupedTickets[column.key]?.length || 0}
                          </Badge>
                        </div>
                      </div>
                      <DroppableColumn id={column.key}>
                        {groupedTickets[column.key]?.length > 0 ? (
                          <div className={activeTab === 'unassigned' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
                            {groupedTickets[column.key].map((ticket) => (
                              <DraggableTicketCard key={ticket._id || ticket.id} ticket={ticket} />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 bg-muted/20 border-2 border-dashed rounded-xl text-center p-4">
                            <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-xs font-medium text-muted-foreground">No {column.label.toLowerCase()} tickets</p>
                          </div>
                        )}
                      </DroppableColumn>
                    </div>
                  ))}
                </div>
              </DndContext>
            ) : (
              <div className={`grid gap-4 ${activeTab === 'unassigned' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => {
                    const ticketId = ticket._id || ticket.id
                    
                    return (
                        <Card 
                        key={ticketId} 
                        className="cursor-pointer hover:shadow-md transition-all border-l-4"
                        style={{ borderLeftColor: `var(--${getStatusColor(ticket.status).replace('bg-', '')})` }}
                        onClick={() => {
                          setViewingTicketId(ticketId)
                          setDetailsDialogOpen(true)
                        }}
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
                                {ticket.userName && (
                                    <span className="flex items-center gap-1.5">
                                    <UserIcon className="h-3.5 w-3.5" />
                                    {ticket.userName}
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
                    )
                  })
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
      
      {/* Create Internal Ticket Dialog */}
      <CreateInternalTicketDialog
        open={createInternalDialogOpen}
        onOpenChange={setCreateInternalDialogOpen}
        onSuccess={fetchData}
      />

      {/* Ticket Details Dialog for My Requests */}
      <TicketDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        ticketId={viewingTicketId}
        isHead={user?.isHead}
      />

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
