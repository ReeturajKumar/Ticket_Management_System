import { useEffect, useState, useCallback, useMemo } from "react"
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
import type { DragEndEvent } from '@dnd-kit/core'
import { Loader2, Search, Tag, LayoutGrid, List, Plus } from "lucide-react"
import { useLocation } from "react-router-dom"
import { AssignTicketDialog } from "@/components/department/AssignTicketDialog"
import { BulkActionsToolbar } from "@/components/department/BulkActionsToolbar"
import { BulkAssignDialog } from "@/components/department/BulkAssignDialog"
import { BulkCloseDialog } from "@/components/department/BulkCloseDialog"
import { toast } from 'react-toastify'
import { useDebounce, useRealTimeTickets, useSocketConnection } from "@/hooks"
import { useTicketSelection } from "@/stores/ticketStore"
import { CreateInternalTicketDialog } from "@/components/department/CreateInternalTicketDialog"
import { TicketDetailsDialog } from "@/components/department/TicketDetailsDialog"
import { 
  TicketCard, 
  TicketBoard, 
  TicketList,
  STATUS_COLUMNS_DEFAULT,
  STATUS_COLUMNS_UNASSIGNED,
  STATUS_COLUMNS_MY_REQUESTS,
} from "@/components/department/tickets"

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
  
  // Debounce search term for performance (waits 300ms after typing stops)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // Real-time socket connection status
  const { isConnected } = useSocketConnection({ autoConnect: true })
  
  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)

  // Internal Ticket Dialog State
  const [createInternalDialogOpen, setCreateInternalDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [viewingTicketId, setViewingTicketId] = useState<string>("")

  // Bulk operations state - using global store to avoid duplicate state
  const { 
    selectedTicketIds, 
    toggleTicketSelection, 
    clearSelection: clearSelectedTickets
  } = useTicketSelection()
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false)
  const [bulkCloseDialogOpen, setBulkCloseDialogOpen] = useState(false)

  // Memoized fetch function to prevent recreation
  const fetchData = useCallback(async () => {
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
  }, [activeTab, user?.isHead])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listen for real-time ticket events and refresh data
  useRealTimeTickets({
    showNotifications: false, // Notifications handled by DepartmentLayout's useNotificationSocket
    onTicketCreated: () => {
      fetchData()
    },
    onTicketAssigned: () => {
      fetchData()
    },
    onTicketStatusChanged: () => {
      fetchData()
    },
    onTicketPriorityChanged: () => {
      fetchData()
    },
  })

  // ============================================================================
  // MEMOIZED HANDLERS (using useCallback to prevent unnecessary re-renders)
  // ============================================================================

  // Bulk operations handlers - using global store
  const handleToggleTicket = useCallback((ticketId: string) => {
    toggleTicketSelection(ticketId)
  }, [toggleTicketSelection])

  const handleBulkAssignSuccess = useCallback(() => {
    clearSelectedTickets()
    fetchData()
  }, [fetchData, clearSelectedTickets])

  const handleBulkCloseSuccess = useCallback(() => {
    clearSelectedTickets()
    fetchData()
  }, [fetchData, clearSelectedTickets])

  // Drag and drop handler for status changes
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
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

    // Store previous status for rollback
    const previousStatus = ticket.status

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
      setTickets(prev => prev.map(t => 
        (t._id || t.id) === ticketId ? { ...t, status: previousStatus } : t
      ))
    }
  }, [tickets, user?.isHead, fetchData])

  // Dialog handlers - memoized
  const handleOpenAssignDialog = useCallback((ticket: any) => {
    setSelectedTicket(ticket)
    setAssignDialogOpen(true)
  }, [])

  const handleOpenTicketDetails = useCallback((ticketId: string) => {
    setViewingTicketId(ticketId)
    setDetailsDialogOpen(true)
  }, [])

  // ============================================================================
  // MEMOIZED COMPUTED VALUES (using useMemo to prevent recalculation)
  // ============================================================================

  // Memoized filtered tickets (only recalculates when dependencies change)
  const filteredTickets = useMemo(() => {
    const searchLower = debouncedSearchTerm.toLowerCase()
    return tickets.filter(ticket => {
      const matchesSearch = !debouncedSearchTerm || 
        ticket.subject?.toLowerCase().includes(searchLower) || 
        (ticket.ticketId && ticket.ticketId.includes(debouncedSearchTerm)) ||
        (ticket.userName && ticket.userName.toLowerCase().includes(searchLower))
      const matchesPriority = priorityFilter === "ALL" || ticket.priority === priorityFilter
      return matchesSearch && matchesPriority
    })
  }, [tickets, debouncedSearchTerm, priorityFilter])

  // Memoized status columns based on active tab
  const statusColumns = useMemo(() => {
    if (activeTab === 'unassigned') return STATUS_COLUMNS_UNASSIGNED
    if (activeTab === 'my-requests') return STATUS_COLUMNS_MY_REQUESTS
    return STATUS_COLUMNS_DEFAULT
  }, [activeTab])

  return (
    <DepartmentLayout>
      <div className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 space-y-4 sm:space-y-5 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
              {user?.department} Department
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage your department's support queue
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Real-time connection indicator */}
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted text-xs sm:text-sm">
              <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-muted-foreground text-xs">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <Button
              onClick={() => setCreateInternalDialogOpen(true)}
              size="sm"
              className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Create Internal Ticket</span>
              <span className="sm:hidden">Create</span>
            </Button>
            {activeTab !== 'my-requests' && (
              <>
                <Button
                  variant={viewMode === "board" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("board")}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Board</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <List className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">List</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs 
          value={activeTab} 
          className="space-y-3 sm:space-y-4" 
          onValueChange={setActiveTab}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <TabsList className="grid w-full sm:w-auto sm:max-w-lg grid-cols-3">
              {user?.isHead ? (
                <>
                  <TabsTrigger value="all-tickets" className="text-xs sm:text-sm px-2 sm:px-3">
                    Queue
                  </TabsTrigger>
                  <TabsTrigger value="unassigned" className="text-xs sm:text-sm px-2 sm:px-3">
                    Unassigned
                    {unassignedCount > 0 && (
                      <Badge variant="destructive" className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">{unassignedCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="my-requests" className="text-xs sm:text-sm px-2 sm:px-3">
                    <span className="hidden sm:inline">My Requests</span>
                    <span className="sm:hidden">Requests</span>
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="my-tickets" className="text-xs sm:text-sm px-2 sm:px-3">
                    <span className="hidden sm:inline">My Tickets</span>
                    <span className="sm:hidden">Tickets</span>
                  </TabsTrigger>
                  <TabsTrigger value="unassigned" className="text-xs sm:text-sm px-2 sm:px-3">
                    Unassigned
                    {unassignedCount > 0 && (
                      <Badge variant="destructive" className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">{unassignedCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="my-requests" className="text-xs sm:text-sm px-2 sm:px-3">
                    <span className="hidden sm:inline">My Requests</span>
                    <span className="sm:hidden">Requests</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 sm:left-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tickets..." 
                  className="pl-8 sm:pl-9 h-8 sm:h-9 text-xs sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Priority</span>
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

          <TabsContent value={activeTab} className="mt-4 sm:mt-5 md:mt-6">
            {isLoading ? (
              <div className="flex justify-center p-8 sm:p-10 md:p-12">
                <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 animate-spin text-primary" />
              </div>
            ) : activeTab === 'my-requests' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => {
                    const ticketId = ticket._id || ticket.id
                    const isMyRequest = ticket.createdBy === user?.id || ticket.createdBy?._id === user?.id
                    return (
                      <TicketCard 
                        key={ticketId} 
                        ticket={ticket}
                        isSelected={selectedTicketIds.includes(ticketId)}
                        isMyRequest={isMyRequest}
                        isHead={user?.isHead || false}
                        userId={user?.id}
                        onToggleSelect={handleToggleTicket}
                        onOpenDetails={handleOpenTicketDetails}
                        onAssign={handleOpenAssignDialog}
                        onRefresh={fetchData}
                      />
                    )
                  })
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
              <TicketBoard
                tickets={filteredTickets}
                statusColumns={statusColumns}
                selectedTicketIds={selectedTicketIds}
                activeTab={activeTab}
                isHead={user?.isHead || false}
                userId={user?.id}
                onDragEnd={handleDragEnd}
                onToggleSelect={handleToggleTicket}
                onOpenDetails={handleOpenTicketDetails}
                onAssign={handleOpenAssignDialog}
                onRefresh={fetchData}
              />
            ) : (
              <TicketList
                tickets={filteredTickets}
                activeTab={activeTab}
                searchTerm={searchTerm}
                priorityFilter={priorityFilter}
                onOpenDetails={handleOpenTicketDetails}
              />
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
            onClear={clearSelectedTickets}
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
