import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from 'react-toastify'
import { useAuth } from "@/contexts/AuthContext"
import { getDepartmentOverview, getAnalytics, getTeamPerformance, exportReport } from "@/services/departmentHeadService"
import { getStaffDashboardStats, getStaffPerformance } from "@/services/departmentStaffService"
import { useSocketConnection, useRealTimeTickets } from "@/hooks/useSocket"
import { DASHBOARD_CONFIG } from "@/config/dashboardConfig"
import type { DashboardData } from "@/types/ticket"

export function useDepartmentDashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [viewingTicketId, setViewingTicketId] = useState<string>("")

  // Initialize socket connection for real-time updates
  useSocketConnection({ autoConnect: true })

  const { data, isLoading } = useQuery({
    queryKey: ['department', 'dashboard', user?.id, user?.isHead],
    queryFn: async () => {
      if (user?.isHead) {
        const [overview, analytics, teamPerf] = await Promise.all([
          getDepartmentOverview(),
          getAnalytics(DASHBOARD_CONFIG.display.defaultAnalyticsPeriod),
          getTeamPerformance()
        ])
        
        // Transform analytics trends data
        let transformedAnalytics = analytics.data
        if (analytics.data?.trends?.ticketsCreated && analytics.data?.trends?.ticketsResolved) {
          const mergedTrends = analytics.data.trends.ticketsCreated.map((item: any, index: number) => ({
            date: item.date,
            created: item.count,
            resolved: analytics.data.trends.ticketsResolved[index]?.count || 0
          }))
          transformedAnalytics = {
            ...analytics.data,
            trends: mergedTrends
          }
        }
        
        return {
          ...overview.data,
          analytics: transformedAnalytics,
          teamPerformance: teamPerf.data?.teamMembers
            ?.filter((member: any) => !member.isHead)
            .map((member: any) => ({
              ...member,
              id: member.userId,
              activeTickets: member.inProgressTickets || 0,
              performance: parseInt(member.performance) || 0,
              joinedAt: member.joinedAt || new Date().toISOString()
            })) || []
        } as DashboardData & { teamPerformance: any[] }
      } else {
        const [stats, performance] = await Promise.all([
          getStaffDashboardStats(),
          getStaffPerformance()
        ])
        return {
          ...stats.data,
          staffPerformance: performance.data
        }
      }
    },
    enabled: !!user,
  })


  useRealTimeTickets({
    showNotifications: false,
    onTicketCreated: () => {
      console.log('[Dashboard] Invalidating and refetching dashboard queries');
      queryClient.invalidateQueries({ queryKey: ['department', 'dashboard'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['department', 'dashboard'] });
    },
    onTicketAssigned: () => {
      queryClient.invalidateQueries({ queryKey: ['department', 'dashboard'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['department', 'dashboard'] });
    },
    onTicketStatusChanged: () => {
      queryClient.invalidateQueries({ queryKey: ['department', 'dashboard'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['department', 'dashboard'] });
    },
    onTicketPriorityChanged: () => {
      queryClient.invalidateQueries({ queryKey: ['department', 'dashboard'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['department', 'dashboard'] });
    },
    onRefresh: () => {
      queryClient.invalidateQueries({ queryKey: ['department', 'dashboard'], refetchType: 'active' });
      queryClient.refetchQueries({ queryKey: ['department', 'dashboard'] });
    },
  })

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const blob = await exportReport('pdf', 'summary')
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `department-report-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Report exported successfully")
    } catch (error) {
      toast.error("Failed to export report")
    } finally {
      setIsExporting(false)
    }
  }

  return {
    user,
    isLoading,
    data,
    teamPerformance: data?.teamPerformance,
    staffPerformance: data?.staffPerformance,
    isExporting,
    detailsDialogOpen,
    setDetailsDialogOpen,
    viewingTicketId,
    setViewingTicketId,
    handleExport,
  }
}
