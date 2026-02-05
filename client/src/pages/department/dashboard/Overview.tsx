import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { useNavigate } from "react-router-dom"
import { TicketDetailsDialog } from "@/components/department/TicketDetailsDialog"
import { useDepartmentDashboard } from "@/hooks/useDepartmentDashboard"
import { calculateTrendsFromAnalytics } from "@/utils/calculateTrends"
import { DashboardHeader, DashboardLoading } from "@/components/department/dashboard/shared/DashboardHeader"
import { HeadOverview } from "@/components/department/dashboard/HeadOverview"
import { StaffOverview } from "@/components/department/dashboard/StaffOverview"

export default function DepartmentDashboard() {
  const {
    user,
    isLoading,
    data,
    teamPerformance,
    detailsDialogOpen,
    setDetailsDialogOpen,
    viewingTicketId,
    setViewingTicketId,
  } = useDepartmentDashboard()
  
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <DepartmentLayout>
        <DashboardLoading />
      </DepartmentLayout>
    )
  }

  const getTimeGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Morning"
    if (hour < 17) return "Afternoon"
    return "Evening"
  }

  const statusChartData = data?.summary ? [
    { name: 'Open', value: data.summary.openTickets || 0, color: '#f59e0b' },
    { name: 'In Progress', value: data.summary.inProgressTickets || 0, color: '#ACDF33' },
    { name: 'Resolved', value: data.summary.resolvedTickets || 0, color: '#10b981' },
    { name: 'Closed', value: data.summary.closedTickets || 0, color: '#64748b' },
  ].filter(item => item.value > 0) : []

  const analyticsTrends = data?.analytics?.trends ? calculateTrendsFromAnalytics(data.analytics.trends) : null
  const ticketVolumeTrend = analyticsTrends?.createdTrend?.percentage || 0
  const isVolumeIncreasing = analyticsTrends?.createdTrend?.isPositive || false

  return (
    <DepartmentLayout>
      <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
        <DashboardHeader
          title={`${user?.department?.replace(/_/g, ' ')} • Management Portal`}
          greeting={`Good ${getTimeGreeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
          showViewTickets={true}
          onViewTickets={() => navigate('/department/tickets')}
        />

        {user?.isHead && data ? (
          <HeadOverview
            data={data}
            teamPerformance={teamPerformance}
            onViewTicket={(id) => { setViewingTicketId(id); setDetailsDialogOpen(true); }}
            ticketVolumeTrend={ticketVolumeTrend}
            isVolumeIncreasing={isVolumeIncreasing}
            statusChartData={statusChartData}
          />
        ) : (
          <StaffOverview
            data={data}
            onViewTicket={(id) => { setViewingTicketId(id); setDetailsDialogOpen(true); }}
          />
        )}
      </div>

      <TicketDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        ticketId={viewingTicketId}
        isHead={user?.isHead}
      />
    </DepartmentLayout>
  )
}
