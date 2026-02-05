import { useState, useEffect } from "react"
import { EmployeeLayout } from "@/components/layout/EmployeeLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Ticket, 
  Search, 
  AlertCircle,
} from "lucide-react"
import { employeeService } from "@/services/employeeService"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { toast } from "react-toastify"
import { EmployeeTicketDetailsDialog } from "@/components/employee/EmployeeTicketDetailsDialog"
import { useSocketConnection, useRealTimeTickets } from "@/hooks/useSocket"
import { useDebouncedCallback } from "@/hooks/useDebounce"

export default function EmployeeTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const navigate = useNavigate()

  // Initialize socket connection
  useSocketConnection({ autoConnect: true })

  const fetchTickets = async () => {
    try {
      setIsLoading(true)
      const response = await employeeService.listMyTickets()
      if (response.success) {
        setTickets(response.data.tickets)
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error)
      toast.error("Failed to load your tickets")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  // Create debounced version to prevent multiple rapid API calls
  const { debouncedCallback: debouncedRefetch } = useDebouncedCallback(fetchTickets, 1000)

  // Listen for real-time ticket events
  useRealTimeTickets({
    showNotifications: false,
    onTicketCreated: () => debouncedRefetch(),
    onTicketAssigned: () => debouncedRefetch(),
    onTicketStatusChanged: () => debouncedRefetch(),
    onTicketPriorityChanged: () => debouncedRefetch(),
    onRefresh: () => debouncedRefetch(),
  })

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         ticket._id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <EmployeeLayout>
      <div className="p-4 lg:p-6 space-y-6 max-w-[1500px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-garnett tracking-tight">My Tickets</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage and track your support requests in real-time</p>
          </div>
          <div className="flex items-center gap-2">
             <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold h-9 px-4"
                onClick={fetchTickets}
             >
                <Ticket className="size-4 mr-2" /> Refresh
             </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-center">
           <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                 placeholder="Search by ID or subject..." 
                 className="pl-10 h-11 rounded-xl border-slate-100 bg-white shadow-sm focus:ring-2 focus:ring-[#ACDF33]/20 transition-all"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <div className="flex gap-2 w-full overflow-x-auto pb-1 no-scrollbar lg:justify-end">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => (
                 <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                       "px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap h-11 flex items-center shadow-sm border",
                       statusFilter === status 
                          ? "bg-[#032313] text-[#ACDF33] border-[#032313]" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                    )}
                 >
                    {status.replace('_', ' ')}
                 </button>
              ))}
           </div>
        </div>

        {/* Tickets Grid */}
        <div className="min-h-[400px]">
          {isLoading ? (
             <div className="py-24 text-center">
                <div className="size-10 border-4 border-[#ACDF33] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Records...</p>
             </div>
          ) : filteredTickets.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredTickets.map((ticket) => (
                   <div 
                      key={ticket._id} 
                      onClick={() => {
                         setSelectedTicketId(ticket._id)
                         setDetailsDialogOpen(true)
                      }}
                      className="flex flex-col justify-between gap-3 p-3.5 border border-slate-100 rounded-2xl hover:shadow-xl hover:border-[#ACDF33]/30 transition-all duration-300 bg-white group h-full shadow-sm relative overflow-hidden cursor-pointer"
                   >
                      <div className="flex items-start justify-between gap-2">
                         <div className={cn(
                            "size-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3",
                            ticket.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                            ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'
                         )}>
                            {ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH' ? <AlertCircle className="size-4" /> : <Ticket className="size-4" />}
                         </div>
                         <Badge variant="outline" className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-full border-none uppercase tracking-wider",
                            ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 
                            ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 
                            ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                         )}>
                            {ticket.status.replace('_', ' ')}
                         </Badge>
                      </div>
                      
                      <div className="space-y-3">
                         <div>
                            <p className="text-[13px] font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-[#032313] transition-colors" title={ticket.subject}>
                                {ticket.subject}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                               <Badge variant="secondary" className="bg-slate-50 text-slate-400 text-[8px] font-black border-none uppercase px-1 py-0">
                                  {ticket.department.replace('_', ' ')}
                               </Badge>
                            </div>
                         </div>
                         
                         <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold pt-3 border-t border-slate-50">
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 tracking-wider">#{ticket._id.slice(-6).toUpperCase()}</span>
                            <span>{new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          ) : (
             <div className="bg-white border border-dashed border-slate-200 rounded-[32px] p-20 text-center space-y-5">
                <div className="size-24 bg-slate-50 rounded-[48px] flex items-center justify-center mx-auto border border-slate-100 shadow-inner">
                   <Ticket className="size-10 text-slate-200" />
                </div>
                <div className="max-w-xs mx-auto space-y-2">
                   <p className="text-xl font-bold text-slate-900">No signals found</p>
                   <p className="text-sm text-slate-400 font-medium leading-relaxed">We couldn't find any tickets matching your current search or status filters.</p>
                </div>
                <Button 
                  className="bg-[#032313] text-[#ACDF33] hover:bg-[#032313]/90 rounded-full font-black px-8 h-12 shadow-lg shadow-[#032313]/10"
                  onClick={() => navigate('/employee/dashboard')}
                >
                  Return to Dashboard
                </Button>
             </div>
          )}
        </div>
      </div>
      <EmployeeTicketDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        ticketId={selectedTicketId}
      />
    </EmployeeLayout>
  )
}
