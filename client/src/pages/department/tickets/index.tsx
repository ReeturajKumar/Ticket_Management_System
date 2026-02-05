import { useState, useCallback, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import type { Ticket, UserReference } from "@/types/ticket"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  getMyTickets, 
  getUnassignedTickets, 
  updateMyTicketStatus, 
  getMyInternalRequests 
} from "@/services/departmentStaffService"
import { getAllTickets, updateTicketStatus } from "@/services/departmentHeadService"
import type { DragEndEvent } from '@dnd-kit/core'
import { Plus, Search, Tag, LayoutGrid, List } from "lucide-react"
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
import { DashboardHeader, DashboardLoading } from "@/components/department/dashboard/shared/DashboardHeader"
import { 
  TicketCard, 
  TicketBoard, 
  TicketList,
  STATUS_COLUMNS_DEFAULT,
  STATUS_COLUMNS_UNASSIGNED,
  STATUS_COLUMNS_MY_REQUESTS,
} from "@/components/department/tickets"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export default function DepartmentTicketsPage() {
  const user = useAuth().user
  const location = useLocation()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/unassigned')) return 'unassigned'
    return user?.isHead ? "all-tickets" : "my-tickets"
  })
  
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [viewMode, setViewMode] = useState<"list" | "board">("board")
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  useSocketConnection({ autoConnect: true })
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [createInternalDialogOpen, setCreateInternalDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [viewingTicketId, setViewingTicketId] = useState<string>("")

  const { 
    selectedTicketIds, 
    toggleTicketSelection, 
    clearSelection: clearSelectedTickets
  } = useTicketSelection()
  
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false)
  const [bulkCloseDialogOpen, setBulkCloseDialogOpen] = useState(false)

  // Global query for unassigned count (needed for badge)
  const { data: unassignedData } = useQuery({
    queryKey: ['tickets', 'unassigned'],
    queryFn: async () => {
      const res = await getUnassignedTickets()
      return (res.data?.tickets || res.data || []) as Ticket[]
    },
  })
  const unassignedCount = unassignedData?.length || 0

  // Main tickets query
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', activeTab, user?.id],
    queryFn: async () => {
      let res: any
      if (user?.isHead) {
        if (activeTab === "all-tickets" || activeTab === "my-tickets") {
          res = await getAllTickets()
        } else if (activeTab === "unassigned") {
          res = await getUnassignedTickets()
        } else if (activeTab === "my-requests") {
          res = await getMyInternalRequests()
        }
      } else {
        if (activeTab === "my-tickets") {
          res = await getMyTickets()
        } else if (activeTab === "unassigned") {
          res = await getUnassignedTickets()
        } else if (activeTab === "my-requests") {
          res = await getMyInternalRequests()
        }
      }
      return (res?.data?.tickets || res?.data || []) as Ticket[]
    },
    enabled: !!user,
  })

  useRealTimeTickets({
    showNotifications: false,
    onTicketCreated: () => {
      console.log('[Tickets Page] Invalidating and refetching tickets queries');
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['tickets'] });
    },
    onTicketAssigned: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['tickets'] });
    },
    onTicketStatusChanged: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['tickets'] });
    },
    onTicketPriorityChanged: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['tickets'] });
    },
    onCommentAdded: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['tickets'] });
    },
  })

  const handleToggleTicket = useCallback((ticketId: string) => {
    toggleTicketSelection(ticketId)
  }, [toggleTicketSelection])

  const handleBulkAssignSuccess = useCallback(() => {
    clearSelectedTickets()
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
  }, [queryClient, clearSelectedTickets])

  const handleBulkCloseSuccess = useCallback(() => {
    clearSelectedTickets()
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
  }, [queryClient, clearSelectedTickets])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ticketId = active.id as string
    const newStatus = over.id as string
    const ticket = tickets.find(t => (t._id || t.id) === ticketId)
    if (!ticket) return
    if (ticket.status === newStatus) return

    try {
      if (user?.isHead) {
        await updateTicketStatus(ticketId, newStatus)
      } else {
        await updateMyTicketStatus(ticketId, newStatus)
      }
      toast.success(`Ticket Status Updated Successfully`)
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    } catch (error) {
      console.error("Failed to update ticket status", error)
      toast.error("Failed to update ticket status")
    }
  }, [tickets, user, queryClient])

  const handleOpenAssignDialog = useCallback((ticket: any) => {
    setSelectedTicket(ticket)
    setAssignDialogOpen(true)
  }, [])

  const handleOpenTicketDetails = useCallback((ticketId: string) => {
    setViewingTicketId(ticketId)
    setDetailsDialogOpen(true)
  }, [])

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

  const statusColumns = useMemo(() => {
    if (activeTab === 'unassigned') return STATUS_COLUMNS_UNASSIGNED
    if (activeTab === 'my-requests') return STATUS_COLUMNS_MY_REQUESTS
    return STATUS_COLUMNS_DEFAULT
  }, [activeTab])

  return (
    <DepartmentLayout>
      <div className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 space-y-4 sm:space-y-5 md:space-y-6 max-w-[1600px] mx-auto">
        <DashboardHeader
            title={`${user?.department} Department`}
            subtitle="Manage your department's support queue"
            showLiveBadge={true}
        >
            <Button
              onClick={() => setCreateInternalDialogOpen(true)}
              size="sm"
              className="gap-1.5 h-8 sm:h-9 px-2 sm:px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create Internal Ticket</span>
              <span className="sm:hidden">Create</span>
            </Button>
            {activeTab !== 'my-requests' && (
              <>
                <Button
                  variant={viewMode === "board" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("board")}
                  className="h-8 sm:h-9 px-2 sm:px-3"
                >
                  <LayoutGrid className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Board</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 sm:h-9 px-2 sm:px-3"
                >
                  <List className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">List</span>
                </Button>
              </>
            )}
        </DashboardHeader>

        <Tabs 
          value={activeTab} 
          className="space-y-3 sm:space-y-4" 
          onValueChange={setActiveTab}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <TabsList className="grid w-full sm:w-auto sm:max-w-lg grid-cols-3">
              {/* Tabs are now hardcoded below for clarity */}
              
              {user?.isHead ? (
                <>
                  <TabsTrigger value="all-tickets" className="text-xs sm:text-sm px-2 sm:px-3">Queue</TabsTrigger>
                  <TabsTrigger value="unassigned" className="text-xs sm:text-sm px-2 sm:px-3">
                    Unassigned {unassignedCount > 0 && (<Badge variant="destructive" className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">{unassignedCount}</Badge>)}
                  </TabsTrigger>
                  <TabsTrigger value="my-requests" className="text-xs sm:text-sm px-2 sm:px-3">My Requests</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="my-tickets" className="text-xs sm:text-sm px-2 sm:px-3">My Tickets</TabsTrigger>
                  <TabsTrigger value="unassigned" className="text-xs sm:text-sm px-2 sm:px-3">
                    Unassigned {unassignedCount > 0 && (<Badge variant="destructive" className="ml-1 sm:ml-2 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">{unassignedCount}</Badge>)}
                  </TabsTrigger>
                  <TabsTrigger value="my-requests" className="text-xs sm:text-sm px-2 sm:px-3">My Requests</TabsTrigger>
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
              <DashboardLoading />
            ) : activeTab === 'my-requests' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => {
                    const ticketId = ticket._id || ticket.id || ""
                    const createdById = typeof ticket.createdBy === 'string' 
                      ? ticket.createdBy 
                      : (ticket.createdBy as UserReference)?._id
                    const isMyRequest = createdById === user?.id
                    
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
                        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })}
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
                onRefresh={() => { queryClient.invalidateQueries({ queryKey: ['tickets'] }) }}
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
      
      {selectedTicket && (
        <AssignTicketDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          ticketId={selectedTicket._id || selectedTicket.id || ""}
          ticketSubject={selectedTicket.subject}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            setSelectedTicket(null)
          }}
        />
      )}
      
      <CreateInternalTicketDialog
        open={createInternalDialogOpen}
        onOpenChange={setCreateInternalDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })}
      />

      <TicketDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        ticketId={viewingTicketId}
        isHead={user?.isHead}
      />

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
