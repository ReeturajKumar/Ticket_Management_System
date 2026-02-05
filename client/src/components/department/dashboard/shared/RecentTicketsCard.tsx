import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ticket as TicketIcon, ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"
import { DASHBOARD_CONFIG } from "@/config/dashboardConfig"
import { STATUS_CONFIG } from "@/config/themeConfig"
import type { Ticket } from "@/types/ticket"

interface RecentTicketsCardProps {
  tickets: Ticket[]
  onViewTicket: (id: string) => void
}

export function RecentTicketsCard({ tickets, onViewTicket }: RecentTicketsCardProps) {
  return (
    <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-fit">
      <CardHeader className="py-2 px-5 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">Recent Tickets</CardTitle>
          <CardDescription className="text-xs mt-0.5">Latest tickets submitted to your department.</CardDescription>
        </div>
        <Link to="/department/tickets" className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 hover:underline">See All <ArrowUpRight className="size-3" /></Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {tickets?.length > 0 ? (
            tickets.slice(0, DASHBOARD_CONFIG.display.maxRecentTickets).map((ticket: Ticket) => {
              const ticketId = ticket._id || ticket.id || ""
              const statusInfo = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.OPEN
              const createdByName = typeof ticket.createdBy === 'object' ? ticket.createdBy.name : (ticket.userName || 'User')
              
              return (
                <div 
                  key={ticketId} 
                  className="flex items-center gap-2.5 p-2.5 hover:bg-slate-50 cursor-pointer transition-colors" 
                  onClick={() => onViewTicket(ticketId)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{ticket.subject}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{createdByName} • {new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge className={`text-[10px] px-1.5 py-0.5 text-white ${statusInfo.color}`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <TicketIcon className="size-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No recent tickets</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
