import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, Building2
} from "lucide-react"
import { getAdminAnalytics, type AdminAnalytics } from "@/services/adminService"
import { toast } from "react-toastify"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartErrorBoundary } from "@/components/ChartErrorBoundary"

export default function AdminAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const result = await getAdminAnalytics(period)
      if (result.success) {
        setData(result.data)
      }
    } catch (error: any) {
      console.error("Failed to fetch analytics:", error)
      toast.error("Failed to load analytics")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">System Analytics</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              System-wide performance metrics and trends
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={period === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('7d')}
              className="flex-1 sm:flex-none"
            >
              7 Days
            </Button>
            <Button
              variant={period === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('30d')}
              className="flex-1 sm:flex-none"
            >
              30 Days
            </Button>
            <Button
              variant={period === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('90d')}
              className="flex-1 sm:flex-none"
            >
              90 Days
            </Button>
          </div>
        </div>

        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Trends</CardTitle>
            <CardDescription>Created vs Resolved tickets over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
              <ChartErrorBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="created" 
                      stroke="#6366f1" 
                      fillOpacity={1} 
                      fill="url(#colorCreated)"
                      name="Created"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorResolved)"
                      name="Resolved"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          </CardContent>
        </Card>

        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
            <CardDescription>Resolution rates and average resolution time by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.departmentPerformance.map((dept) => (
                <div key={dept.department} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">{dept.department}</h3>
                    </div>
                    <Badge variant="secondary">{dept.resolutionRate}% resolved</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="text-xl sm:text-2xl font-bold">{dept.total}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolved</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{dept.resolved}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Time</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {dept.avgResolutionHours ? `${dept.avgResolutionHours}h` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
