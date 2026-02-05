import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getTeamMemberTickets, getMemberPerformance } from "@/services/departmentHeadService"
import { ArrowLeft, Ticket, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { DashboardHeader, DashboardLoading } from "@/components/department/dashboard/shared/DashboardHeader"
import { StatCard } from "@/components/department/dashboard/shared/StatCards"
import { TicketList } from "@/components/department/tickets"

interface TeamMemberPerformance {
  name: string
  email: string
  assignedTickets: number
  resolvedTickets: number
  inProgressTickets: number
  performance: string
  avgResolutionTime: string
}

interface TeamMemberTicket {
  _id: string
  ticketId?: string
  subject: string
  description: string
  status: string
  priority: string
  createdAt: string
  userName?: string
}

export default function TeamMemberDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [performance, setPerformance] = useState<TeamMemberPerformance | null>(null)
  const [tickets, setTickets] = useState<TeamMemberTicket[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  const fetchData = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      const [perfData, ticketsData] = await Promise.all([
        getMemberPerformance(userId),
        getTeamMemberTickets(userId)
      ])
      
      // Map API response to component state
      const stats = perfData.data?.stats || {}
      const memberInfo = perfData.data?.teamMember || {}
      
      setPerformance({
        ...stats,
        name: memberInfo.name,
        email: memberInfo.email,
        assignedTickets: stats.totalAssigned || 0,
        resolvedTickets: stats.resolved || 0,
        inProgressTickets: stats.inProgress || 0,
        performance: stats.performance || "0%",
        avgResolutionTime: stats.avgResolutionTime || "N/A"
      })
      
      setTickets(ticketsData.data?.tickets || [])
    } catch (error) {
      console.error("Failed to fetch team member data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <DepartmentLayout>
        <DashboardLoading />
      </DepartmentLayout>
    )
  }

  return (
    <DepartmentLayout>
      <div className="flex-1 p-8 pt-6 space-y-8 max-w-[1600px] mx-auto">
        <div className="mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/department/dashboard")} className="-ml-3 text-muted-foreground hover:text-slate-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
            </Button>
        </div>

        <DashboardHeader
            title={performance?.name || "Team Member"}
            subtitle={performance?.email}
            showLiveBadge={false}
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Assigned"
                value={performance?.assignedTickets || 0}
                icon={Ticket}
                iconBg="bg-slate-100"
                iconColor="text-slate-600"
            />
            <StatCard
                title="Resolved"
                value={performance?.resolvedTickets || 0}
                icon={CheckCircle}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                trend={{
                    label: "Completed",
                    isPositive: true,
                    value: 0
                }}
            />
            <StatCard
                title="Active"
                value={performance?.inProgressTickets || 0}
                icon={Clock}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
            />
            <StatCard
                title="Score"
                value={performance?.performance || "0%"}
                subValue={`Avg ${performance?.avgResolutionTime || "0h"}`}
                icon={TrendingUp}
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
            />
        </div>

        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0 pt-4 pb-4">
            <CardTitle className="text-lg font-bold">Assigned Tickets</CardTitle>
            <CardDescription>Recent workload managed by this agent</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {tickets.length > 0 ? (
                <div className="space-y-4">
                    <TicketList 
                        tickets={tickets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) as any} 
                        activeTab="all-tickets"
                        searchTerm=""
                        priorityFilter="ALL"
                        onOpenDetails={(id) => navigate(`/department/tickets/${id}`)}
                    />
                    
                    {tickets.length > ITEMS_PER_PAGE && (
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="h-8"
                            >
                                Previous
                            </Button>
                            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-center">
                                Page {currentPage} of {Math.ceil(tickets.length / ITEMS_PER_PAGE)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(tickets.length / ITEMS_PER_PAGE), prev + 1))}
                                disabled={currentPage >= Math.ceil(tickets.length / ITEMS_PER_PAGE)}
                                className="h-8"
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <Card className="border-dashed bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-slate-100 p-3 mb-4">
                            <Ticket className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">No tickets assigned</h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            This team member currently has no active or historical tickets.
                        </p>
                    </CardContent>
                </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </DepartmentLayout>
  )
}
