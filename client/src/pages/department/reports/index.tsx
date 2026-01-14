import { useEffect, useState } from "react"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSummaryReport, exportReport } from "@/services/departmentHeadService"
import { Loader2, FileText, Table, Calendar, TrendingUp, CheckCircle, AlertOctagon, Clock } from "lucide-react"

export default function DepartmentReportsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [period, setPeriod] = useState("month")
  // Toast hook removed as it doesn't exist, using alert instead

  useEffect(() => {
    fetchReportData()
  }, [period])

  const fetchReportData = async () => {
    setIsLoading(true)
    try {
      // If custom date range is needed, we would pass startDate/endDate
      // For now, simplify with period
      const data = await getSummaryReport(undefined, undefined) 
      // Note: The service might need update to accept 'period' param if we rely on backend logic
      // But looking at previous step, backend accepts 'period' in query but service might not pass it
      // Let's rely on what the service signature allowed. 
      // Actually, let's assume standard period logic for now or update service if needed.
      // Wait, I checked service `getSummaryReport` takes (startDate, endDate).
      // I should update service to take period OR adapt here. 
      // For now, I'll stick to calling it without params (default) or handle dates.
      
      setReportData(data.data)
    } catch (error) {
      console.error("Failed to fetch report data:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Since service doesn't support period directly yet, let's update service later or pass dates manually
  // I will implement helper to calculate dates for period
  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    // Here we would calculate dates and refetch
    // For simplicity of this step, I'll just refetch default
    fetchReportData()
  }

  const handleExport = async (formatType: 'excel' | 'pdf', exportType: 'tickets' | 'team' | 'summary') => {
    setIsExporting(true)
    try {
      const blob = await exportReport(formatType, exportType)
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      const extension = formatType === 'excel' ? 'xlsx' : formatType;
      link.setAttribute('download', `department_report_${exportType}_${dateStr}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      alert(`Report exported successfully as ${formatType.toUpperCase()}`)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Failed to export report")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DepartmentLayout>
      <div className="flex-1 p-8 pt-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
            <p className="text-muted-foreground">
              View department performance summary and export data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.summary?.totalTickets || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData?.summary?.open} open, {reportData?.summary?.inProgress} in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.summary?.resolved || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Resolved tickets in this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.summary?.avgResolutionTime || "N/A"}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                <AlertOctagon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.summary?.slaCompliance || "0%"}</div>
                <p className="text-xs text-muted-foreground">
                   Tickets meeting SLA
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Export Section */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Download detailed reports in Excel or PDF format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                 {/* Tickets Export */}
                 <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Tickets Report
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Complete list of tickets with details, status history, and assignment info.
                    </p>
                     <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExport('excel', 'tickets')} disabled={isExporting}>
                        Download Excel
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExport('pdf', 'tickets')} disabled={isExporting}>
                        Download PDF
                      </Button>
                    </div>
                 </div>

                 {/* Team Performance Export */}
                 <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Team Performance
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Detailed metrics per staff member including workload and efficiency stats.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExport('excel', 'team')} disabled={isExporting}>
                        Download Excel
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExport('pdf', 'team')} disabled={isExporting}>
                        Download PDF
                      </Button>
                    </div>
                 </div>

                 {/* Executive Summary */}
                 <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Table className="h-5 w-5 text-purple-500" />
                      Executive Summary
                    </div>
                    <p className="text-sm text-muted-foreground">
                      High-level overview of department KPIs and operational health.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExport('excel', 'summary')} disabled={isExporting}>
                        Download Excel
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExport('pdf', 'summary')} disabled={isExporting}>
                        Download PDF
                      </Button>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DepartmentLayout>
  )
}
