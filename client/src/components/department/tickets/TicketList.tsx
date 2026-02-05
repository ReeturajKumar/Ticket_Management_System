import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Calendar, Search } from "lucide-react"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/config/themeConfig"
import type { Ticket } from "@/types/ticket"

// ============================================================================
// TICKET LIST COMPONENT
// ============================================================================

interface TicketListProps {
  tickets: Ticket[]
  activeTab: string
  searchTerm: string
  priorityFilter: string
  onOpenDetails: (ticketId: string) => void
}

export function TicketList({
  tickets,
  activeTab,
  searchTerm,
  priorityFilter,
  onOpenDetails,
}: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10 md:py-12 text-center">
          <div className="rounded-full bg-muted p-2.5 sm:p-3 mb-3 sm:mb-4">
            <Search className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-base sm:text-lg mb-1">No tickets found</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm px-4">
            {searchTerm || priorityFilter !== "ALL"
              ? "Try adjusting your filters or search term"
              : "No tickets available in this category"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`grid gap-3 sm:gap-4 ${activeTab === 'unassigned' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
      {tickets.map((ticket) => {
        const ticketId = ticket._id || ticket.id || ""
        const statusInfo = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.OPEN
        const priorityInfo = PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.LOW
        const createdByName = typeof ticket.createdBy === 'object' ? ticket.createdBy.name : (ticket.userName || 'User')
        
        return (
          <Card 
            key={ticketId} 
            className="cursor-pointer hover:shadow-md transition-all border-l-4"
            style={{ borderLeftColor: statusInfo.color.includes('bg-[') ? statusInfo.color.match(/\[(.*?)\]/)?.[1] : undefined }}
            onClick={() => onOpenDetails(ticketId)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <Badge className={`text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2 text-white ${statusInfo.color}`}>
                      {statusInfo.label}
                    </Badge>
                    <Badge variant={priorityInfo.variant as any} className="text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2 font-bold">
                      {priorityInfo.label}
                    </Badge>
                    <h3 className="font-bold text-sm sm:text-base truncate flex-1 min-w-0 text-slate-900">{ticket.subject}</h3>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap font-medium">
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <UserIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="truncate max-w-[120px] sm:max-w-none">{createdByName}</span>
                    </span>
                    <span className="flex items-center gap-1 sm:gap-1.5">
                      <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      {new Date(ticket.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    <span className="text-[10px] bg-slate-100 px-1.5 rounded font-mono">#{ticketId.slice(-6).toUpperCase()}</span>
                  </div>

                  {ticket.description && (
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 italic">
                      {ticket.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default TicketList
