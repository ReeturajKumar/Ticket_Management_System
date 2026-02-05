import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2, Ticket, Search, ChevronLeft, ChevronRight, Eye
} from "lucide-react"
import { getAllTickets, type AdminTicket } from "@/services/adminService"
import { toast } from "react-toastify"
import { TicketDetailsDialog } from "@/components/admin/TicketDetailsDialog"
import { useAdminSocketEvents } from "@/hooks/useAdminSocket"
import { cn } from "@/lib/utils"

export default function AdminTicketsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  })
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    department: '',
    assignedTo: '',
    search: '',
  })
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Debounced search - only search after user stops typing for 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters(prev => ({ ...prev, search: searchInput }))
        setCurrentPage(1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    fetchTickets()
  }, [currentPage, filters])

  // Listen for real-time ticket updates
  useAdminSocketEvents({
    onTicketCreated: () => {
      fetchTickets()
    },
    onTicketUpdated: () => {
      fetchTickets()
    },
  })

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      const result = await getAllTickets({
        ...filters,
        page: currentPage,
        limit: 20,
      })
      if (result.success) {
        setTickets(result.data.tickets)
        setPagination(result.data.pagination)
      }
    } catch (error: any) {
      console.error("Failed to fetch tickets:", error)
      toast.error("Failed to load tickets")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setIsDialogOpen(true)
  }

  const getPriorityStyle = (priority: string) => {
    const styles: Record<string, string> = {
      LOW: 'bg-slate-100 text-slate-700 border-slate-200',
      MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      CRITICAL: 'bg-red-100 text-red-700 border-red-200'
    }
    return styles[priority] || styles.MEDIUM
  }

  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-700',
      ASSIGNED: 'bg-purple-100 text-purple-700',
      IN_PROGRESS: 'bg-amber-100 text-amber-700',
      WAITING_FOR_USER: 'bg-orange-100 text-orange-700',
      RESOLVED: 'bg-emerald-100 text-emerald-700',
      CLOSED: 'bg-slate-100 text-slate-600'
    }
    return styles[status] || styles.OPEN
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading && tickets.length === 0) {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00A38C]" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex-1 p-2 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">All Tickets</h2>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              View and manage tickets across all departments
            </p>
          </div>
          <Badge className="bg-[#032313] text-[#ACDF33] border-none text-xs font-bold px-3 py-1 uppercase">
            {pagination.total} Total Tickets
          </Badge>
        </div>

        {/* Filters - Inline */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-100">
          <div className="relative flex-1 min-w-[180px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tickets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 bg-slate-50 border-slate-200 rounded-lg text-sm"
            />
          </div>
          <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
            <SelectTrigger className="h-9 w-[130px] bg-slate-50 border-slate-200 rounded-lg text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING_FOR_USER">Waiting</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority || 'all'} onValueChange={(value) => handleFilterChange('priority', value === 'all' ? '' : value)}>
            <SelectTrigger className="h-9 w-[130px] bg-slate-50 border-slate-200 rounded-lg text-sm">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.department || 'all'} onValueChange={(value) => handleFilterChange('department', value === 'all' ? '' : value)}>
            <SelectTrigger className="h-9 w-[150px] bg-slate-50 border-slate-200 rounded-lg text-sm">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="PLACEMENT">Placement</SelectItem>
              <SelectItem value="OPERATIONS">Operations</SelectItem>
              <SelectItem value="TRAINING">Training</SelectItem>
              <SelectItem value="FINANCE">Finance</SelectItem>
              <SelectItem value="TECHNICAL_SUPPORT">Tech Support</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.assignedTo || 'all'} onValueChange={(value) => handleFilterChange('assignedTo', value === 'all' ? '' : value)}>
            <SelectTrigger className="h-9 w-[140px] bg-slate-50 border-slate-200 rounded-lg text-sm">
              <SelectValue placeholder="Assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assigned</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Ticket className="size-10 text-slate-200 mb-3" />
              <p className="text-sm text-slate-500">No tickets found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase pl-4">Ticket ID</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Subject</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Department</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Priority</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Assigned To</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase">Created</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase pr-4 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow 
                        key={ticket.id} 
                        className="cursor-pointer hover:bg-slate-50/50"
                        onClick={() => handleTicketClick(ticket.id)}
                      >
                        <TableCell className="pl-4 py-3">
                          <span className="text-sm font-mono text-slate-400">#{ticket.id.slice(0, 8)}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[250px]">{ticket.subject}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[250px]">{ticket.description}</p>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-slate-600">{ticket.department?.replace(/_/g, ' ')}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-semibold uppercase",
                            getPriorityStyle(ticket.priority)
                          )}>
                            {ticket.priority}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-semibold uppercase",
                            getStatusStyle(ticket.status)
                          )}>
                            {ticket.status.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          {ticket.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-slate-600">{ticket.assignedTo.name[0]}</span>
                              </div>
                              <span className="text-sm text-slate-700">{ticket.assignedTo.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-slate-500">{formatDate(ticket.createdAt)}</span>
                        </TableCell>
                        <TableCell className="pr-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-sm text-slate-600 hover:bg-slate-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTicketClick(ticket.id)
                            }}
                          >
                            <Eye className="size-4 mr-1.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleTicketClick(ticket.id)}
                    className="p-3 hover:bg-slate-50/50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">#{ticket.id.slice(0, 8)}</span>
                          <span className={cn("px-1.5 py-0.5 rounded text-xs font-semibold uppercase", getPriorityStyle(ticket.priority))}>
                            {ticket.priority}
                          </span>
                          <span className={cn("px-1.5 py-0.5 rounded text-xs font-semibold uppercase", getStatusStyle(ticket.status))}>
                            {ticket.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h3 className="text-sm font-medium text-slate-900 truncate">{ticket.subject}</h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>{ticket.department?.replace(/_/g, ' ')}</span>
                        <span>{formatDate(ticket.createdAt)}</span>
                      </div>
                      {ticket.assignedTo ? (
                        <span className="text-slate-600">{ticket.assignedTo.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Prev
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "size-8 p-0 text-sm font-medium",
                          currentPage === pageNum 
                            ? "bg-[#032313] text-[#ACDF33]" 
                            : "hover:bg-slate-100"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage === pagination.pages}
                  className="h-8 px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Ticket Details Dialog */}
        <TicketDetailsDialog
          ticketId={selectedTicketId}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </div>
    </AdminLayout>
  )
}
