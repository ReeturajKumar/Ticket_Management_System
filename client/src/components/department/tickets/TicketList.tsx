import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Calendar, Search } from "lucide-react"
import { getStatusColor, getPriorityColor } from "./TicketCard"

// ============================================================================
// TICKET LIST COMPONENT
// ============================================================================

interface TicketListProps {
  tickets: any[]
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
    )
  }

  return (
    <div className={`grid gap-4 ${activeTab === 'unassigned' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
      {tickets.map((ticket) => {
        const ticketId = ticket._id || ticket.id
        
        return (
          <Card 
            key={ticketId} 
            className="cursor-pointer hover:shadow-md transition-all border-l-4"
            style={{ borderLeftColor: `var(--${getStatusColor(ticket.status).replace('bg-', '')})` }}
            onClick={() => onOpenDetails(ticketId)}
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
      })}
    </div>
  )
}

export default TicketList
