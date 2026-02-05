import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { employeeService } from "@/services/employeeService"
import { useSocketConnection, useRealTimeTickets } from "@/hooks/useSocket"

export function useEmployeeDashboard() {
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [activeTrendTab, setActiveTrendTab] = useState<'weekly' | 'monthly'>('weekly')


  const { isConnected } = useSocketConnection({ autoConnect: true })
  const fillMissingDates = (data: any[], days: number) => {
    const result = [];
    const dateMap = new Map();
    data.forEach(item => dateMap.set(item._id, item));

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      if (dateMap.has(dateStr)) {
        result.push(dateMap.get(dateStr));
      } else {
        result.push({ _id: dateStr, total: 0, resolved: 0 });
      }
    }
    return result;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['employee', 'dashboard'],
    queryFn: async () => {
      const res = await employeeService.getDashboardStats()
      if (!res.success) throw new Error(res.message || "Failed to fetch stats")
      
      const dashboardData = res.data
      const weeklyStats = dashboardData.weeklyTrends ? fillMissingDates(dashboardData.weeklyTrends, 7) : []
      const monthlyStats = dashboardData.monthlyTrends ? fillMissingDates(dashboardData.monthlyTrends, 30) : []
      
      return {
        ...dashboardData,
        weeklyTrends: weeklyStats,
        monthlyTrends: monthlyStats,
        stats: dashboardData.stats || { total: 0, resolved: 0, inProgress: 0, pending: 0 }
      }
    }
  })


  useRealTimeTickets({
    showNotifications: true,
    onRefresh: () => queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] }),
    onTicketStatusChanged: () => queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] }),
    onTicketCreated: () => queryClient.invalidateQueries({ queryKey: ['employee', 'dashboard'] }),
  })

  return {
    isLoading,
    isConnected,
    data,
    weeklyStats: data?.weeklyTrends || [],
    monthlyStats: data?.monthlyTrends || [],
    activeTrendTab,
    setActiveTrendTab,
    createDialogOpen,
    setCreateDialogOpen,
    detailsDialogOpen,
    setDetailsDialogOpen,
    selectedTicketId,
    setSelectedTicketId,
    stats: data?.stats || { total: 0, resolved: 0, inProgress: 0, pending: 0 },
    recentTickets: data?.recentTickets || []
  }
}
