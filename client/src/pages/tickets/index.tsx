import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { StudentLayout } from "@/components/layout/StudentLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getMyTickets, type Ticket } from "@/services/ticketService"
import { Plus, Loader2, Search, Filter, X, TicketIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"

export default function TicketListPage() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [departmentFilter, setDepartmentFilter] = useState("ALL")

  useEffect(() => {
    async function fetchTickets() {
      try {
        const result = await getMyTickets()
        if (result.success) {
          setTickets(result.data.tickets)
        }
      } catch (error) {
        console.error("Failed to fetch tickets:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTickets()
  }, [])

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketId?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter
    const matchesPriority = priorityFilter === "ALL" || ticket.priority === priorityFilter
    const matchesDepartment = departmentFilter === "ALL" || ticket.department === departmentFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesDepartment
  })

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("ALL")
    setPriorityFilter("ALL")
    setDepartmentFilter("ALL")
  }

  const isFiltered = searchTerm !== "" || statusFilter !== "ALL" || priorityFilter !== "ALL" || departmentFilter !== "ALL"

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "IN_PROGRESS": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case "RESOLVED": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "CLOSED": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "REOPENED": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW": return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
      case "MEDIUM": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "HIGH": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "CRITICAL": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <StudentLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TicketIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Support Requests</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl pl-[3.25rem]">
              Track the status of your inquiries, view historical requests, and stay updated on resolutions. 
              Manage all your support needs in one centralized dashboard.
            </p>
          </div>
          <Link to="/tickets/new">
            <Button className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Create Ticket
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>All Tickets</CardTitle>
                  <CardDescription>
                    List of all tickets you created.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by subject or ID..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                   <Filter className="h-4 w-4" />
                   <span>Filters:</span>
                 </div>
                 
                 {/* Status Filter */}
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                   <SelectTrigger className="h-8 w-[130px]">
                     <SelectValue placeholder="Status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ALL">All Statuses</SelectItem>
                     <SelectItem value="OPEN">Open</SelectItem>
                     <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                     <SelectItem value="RESOLVED">Resolved</SelectItem>
                     <SelectItem value="CLOSED">Closed</SelectItem>
                     <SelectItem value="REOPENED">Reopened</SelectItem>
                   </SelectContent>
                 </Select>

                 {/* Priority Filter */}
                 <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                   <SelectTrigger className="h-8 w-[130px]">
                     <SelectValue placeholder="Priority" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ALL">All Priorities</SelectItem>
                     <SelectItem value="LOW">Low</SelectItem>
                     <SelectItem value="MEDIUM">Medium</SelectItem>
                     <SelectItem value="HIGH">High</SelectItem>
                     <SelectItem value="CRITICAL">Critical</SelectItem>
                   </SelectContent>
                 </Select>

                 {/* Department Filter */}
                 <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                   <SelectTrigger className="h-8 w-[140px]">
                     <SelectValue placeholder="Department" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ALL">All Departments</SelectItem>
                     <SelectItem value="PLACEMENT">Placement</SelectItem>
                     <SelectItem value="OPERATIONS">Operations</SelectItem>
                     <SelectItem value="TRAINING">Training</SelectItem>
                     <SelectItem value="FINANCE">Finance</SelectItem>
                   </SelectContent>
                 </Select>

                 {/* Reset Button */}
                 {isFiltered && (
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     onClick={clearFilters}
                     className="h-8 px-2 lg:px-3 text-muted-foreground hover:text-foreground"
                   >
                     <X className="mr-2 h-4 w-4" />
                     Reset
                   </Button>
                 )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTickets.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow 
                        key={ticket.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        <TableCell className="font-medium">
                          {ticket.subject}
                          <div className="text-xs text-muted-foreground md:hidden capitalize">
                             {/* Mobile only sub-info */}
                             {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{ticket.department}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(ticket.status)}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <div className="rounded-full bg-muted p-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No tickets found</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't created any tickets yet or none match your search.
                </p>
                {searchTerm && (
                  <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2">
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  )
}
