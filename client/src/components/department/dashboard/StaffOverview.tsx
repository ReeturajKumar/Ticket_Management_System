import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Ticket, CheckCircle, Clock, AlertCircle, TrendingUp, Calendar
} from "lucide-react"

import { StatCard } from "./shared/StatCards"

interface StaffOverviewProps {
  data: any
  onViewTicket: (id: string) => void
}

export function StaffOverview({
  data,
  onViewTicket
}: StaffOverviewProps) {
  // Handle undefined/null data
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          variant="dark"
          title="My Workload"
          value={`${data.summary?.totalAssigned || 0} Assigned`}
          subValue={`${(data.summary?.inProgress || 0) + (data.summary?.open || 0)} Active`}
          icon={Ticket}
          onClick={() => {}}
        />

        <StatCard
          title="Active Workload"
          value={(data.summary?.inProgress || 0) + (data.summary?.open || 0)}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          trend={{
            label: "Open / In Progress",
            isPositive: false,
            value: 0,
            color: "text-amber-600"
          }}
        />

        <StatCard
          title="Resolved"
          value={data.summary?.resolved || 0}
          icon={CheckCircle}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={{
            label: "Successfully closed",
            isPositive: true,
            value: 0,
            color: "text-emerald-600"
          }}
        />

        <StatCard
          title="Avg Resolution"
          value={data.summary?.avgResolutionTime || 'N/A'}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          trend={{
            label: "Per ticket",
            isPositive: true,
            value: 0,
            color: "text-blue-600"
          }}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden h-full">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Priority Backlog</CardTitle>
            <CardDescription className="text-xs mt-0.5">Latest high-priority assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentTickets && data.recentTickets.length > 0 ? (
              <div className="space-y-3 mt-4">
                {data.recentTickets.slice(0, 5).map((ticket: any) => (
                  <div 
                    key={ticket._id} 
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-[#ACDF33]/50 hover:shadow-md cursor-pointer transition-all duration-300 group relative overflow-hidden" 
                    onClick={() => onViewTicket(ticket._id)}
                  >
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1",
                      ticket.priority === 'CRITICAL' ? 'bg-red-500' : 
                      ticket.priority === 'HIGH' ? 'bg-orange-500' : 
                      ticket.priority === 'MEDIUM' ? 'bg-[#ACDF33]' : 'bg-slate-300'
                    )} />
                    <div className="flex-1 min-w-0 pl-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{ticket.ticketId || ticket._id.slice(-6)}</span>
                        <h4 className="text-sm font-bold text-[#032313] truncate group-hover:text-[#ACDF33] transition-colors">{ticket.subject}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border-2 transition-colors ${ticket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ticket.status === 'WAITING_FOR_USER' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase",
                          ticket.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-100' : 
                          ticket.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 
                          ticket.priority === 'MEDIUM' ? 'bg-[#ACDF33]/10 text-[#032313] border border-[#ACDF33]/20' : 
                          'bg-slate-50 text-slate-500 border border-slate-100'
                        )}>
                          <AlertCircle className="size-3" />{ticket.priority}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-100 p-8 text-center bg-slate-50/50 mt-4">
                <Ticket className="size-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">No active backlog items</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-3">
              {[
                { label: 'Open', value: data.summary?.open || 0, color: '#ef4444', bg: 'bg-red-50', icon: AlertCircle },
                { label: 'In Progress', value: data.summary?.inProgress || 0, color: '#ACDF33', bg: 'bg-[#ACDF33]/5', icon: Clock },
                { label: 'Resolved', value: data.summary?.resolved || 0, color: '#10b981', bg: 'bg-emerald-50', icon: CheckCircle },
                { label: 'Waiting', value: data.summary?.waiting || 0, color: '#f59e0b', bg: 'bg-amber-50', icon: Clock }
              ].map((item, idx) => (
                <div key={idx} className={`p-3 rounded-2xl ${item.bg} border border-black/5 flex items-center justify-between group`}>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-black/5">
                      <item.icon className="size-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                      <p className="text-xl font-black text-slate-900 leading-none">{item.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-lg transition-all border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">My Internal Requests</CardTitle>
        </CardHeader>
        <CardContent>
            {data.myInternalRequests && data.myInternalRequests.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-4">
                {data.myInternalRequests.map((ticket: any) => (
                  <div 
                    key={ticket._id} 
                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer group" 
                    onClick={() => onViewTicket(ticket._id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="outline" className={cn(
                        ticket.status === 'OPEN' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                        ticket.status === 'RESOLVED' ? 'bg-green-50 text-green-600 border-green-200' : 
                        ticket.status === 'CLOSED' ? 'bg-gray-50 text-gray-600 border-gray-200' : ''
                      )}>{ticket.status}</Badge>
                      <Badge variant="secondary" className="text-[10px] font-mono">{ticket.department}</Badge>
                    </div>
                    <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">{ticket.subject}</h4>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed mt-4">
                <p className="text-sm">You haven't created any internal requests yet.</p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
