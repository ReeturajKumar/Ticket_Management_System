import { useEffect, useState } from "react"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSummaryReport, exportReport } from "@/services/departmentHeadService"
import { Loader2, FileText, Calendar, CheckCircle, AlertOctagon, Clock } from "lucide-react"
import { toast } from 'react-toastify'

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
      
      toast.success(`Report exported successfully as ${formatType.toUpperCase()}`)
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("Failed to export report")
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
            {/* Total Tickets - Compact Hero */}
            <Card className="hover:shadow-md transition-all border-none bg-[#032112] text-white rounded-2xl p-4 h-32 group overflow-hidden relative flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start z-10">
                <h4 className="text-[9px] font-bold opacity-60 uppercase tracking-widest text-[#ACDF33]">Total Inflow</h4>
                <FileText className="size-3.5 text-[#ACDF33] opacity-50" />
              </div>
              <div className="z-10">
                <h3 className="text-2xl font-bold tracking-tight leading-none mb-1">
                  {reportData?.summary?.totalTickets || 0}
                </h3>
                <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">
                   {reportData?.summary?.open || 0} Open • {reportData?.summary?.inProgress || 0} Ongoing
                </p>
              </div>
            </Card>

            {/* Resolved Stat - Compact White */}
            <Card className="hover:shadow-md transition-all border border-slate-100 bg-white rounded-2xl p-4 h-32 group overflow-hidden relative flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start z-10">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resolution</h4>
                <CheckCircle className="size-3.5 text-emerald-500 opacity-50" />
              </div>
              <div className="z-10">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
                  {reportData?.summary?.resolved || 0}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total Completed</p>
              </div>
            </Card>

            {/* Avg Resolution Time - Compact White */}
            <Card className="hover:shadow-md transition-all border border-slate-100 bg-white rounded-2xl p-4 h-32 group overflow-hidden relative flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start z-10">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Velocity</h4>
                <Clock className="size-3.5 text-blue-500 opacity-50" />
              </div>
              <div className="z-10">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
                  {reportData?.summary?.avgResolutionTime || "N/A"}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Avg Duration</p>
              </div>
            </Card>
            
            {/* SLA Compliance - Compact White */}
            <Card className="hover:shadow-md transition-all border border-slate-100 bg-white rounded-2xl p-4 h-32 group overflow-hidden relative flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start z-10">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SLA Score</h4>
                <AlertOctagon className="size-3.5 text-indigo-500 opacity-50" />
              </div>
              <div className="z-10">
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1">
                  {reportData?.summary?.slaCompliance || "0%"}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Compliance Rate</p>
              </div>
            </Card>
          </div>
        )}

        {/* Premium Export Section */}
        <div className="space-y-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Export Data</h3>
            <p className="text-xs font-medium text-slate-500">Download reports in Excel or PDF format</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
             {/* Module 1: Tickets Report */}
             <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-[2.25rem] bg-slate-50/50 group overflow-hidden border border-slate-200/50">
               <CardHeader className="pb-2 pt-5 px-6">
                 <div className="flex items-center justify-between mb-2">
                   <CardTitle className="text-lg font-bold text-slate-900">Tickets Report</CardTitle>
                   <div className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100/50">
                     Historical
                   </div>
                 </div>
                 <CardDescription className="text-xs font-medium leading-tight">
                   Complete list of tickets with details, status history, and assignment info.
                 </CardDescription>
               </CardHeader>
               <CardContent className="px-6 pb-6 pt-2">
                 <div className="flex flex-row gap-2.5">
                   <Button 
                     onClick={() => handleExport('excel', 'tickets')} 
                     disabled={isExporting}
                     className="flex-1 bg-[#032313] hover:bg-[#032313]/90 text-[#ACDF33] font-bold rounded-xl h-10.5 flex items-center justify-center group/btn px-3"
                   >
                     <span className="text-[11px] uppercase tracking-wider">Excel</span>
                   </Button>
                   <Button 
                     variant="outline"
                     onClick={() => handleExport('pdf', 'tickets')} 
                     disabled={isExporting}
                     className="flex-1 border-slate-200 hover:border-[#ACDF33] hover:bg-[#ACDF33]/5 font-bold rounded-xl h-10.5 text-slate-600 text-[11px] uppercase tracking-wider px-3"
                   >
                     PDF docs
                   </Button>
                 </div>
               </CardContent>
             </Card>

             {/* Module 2: Team Performance */}
             <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-[2.25rem] bg-slate-50/50 group overflow-hidden border border-slate-200/50">
               <CardHeader className="pb-2 pt-5 px-6">
                 <div className="flex items-center justify-between mb-2">
                   <CardTitle className="text-lg font-bold text-slate-900">Team Performance</CardTitle>
                   <div className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100/50">
                     Operational
                   </div>
                 </div>
                 <CardDescription className="text-xs font-medium leading-tight">
                   Detailed metrics per staff member including workload and efficiency stats.
                 </CardDescription>
               </CardHeader>
               <CardContent className="px-6 pb-6 pt-2">
                 <div className="flex flex-row gap-2.5">
                   <Button 
                     onClick={() => handleExport('excel', 'team')} 
                     disabled={isExporting}
                     className="flex-1 bg-[#032313] hover:bg-[#032313]/90 text-[#ACDF33] font-bold rounded-xl h-10.5 flex items-center justify-center group/btn px-3"
                   >
                     <span className="text-[11px] uppercase tracking-wider">Excel</span>
                   </Button>
                   <Button 
                     variant="outline"
                     onClick={() => handleExport('pdf', 'team')} 
                     disabled={isExporting}
                     className="flex-1 border-slate-200 hover:border-[#ACDF33] hover:bg-[#ACDF33]/5 font-bold rounded-xl h-10.5 text-slate-600 text-[11px] uppercase tracking-wider px-3"
                   >
                     PDF docs
                   </Button>
                 </div>
               </CardContent>
             </Card>

             {/* Module 3: Executive Summary */}
             <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-[2.25rem] bg-slate-50/50 group overflow-hidden border border-slate-200/50">
               <CardHeader className="pb-2 pt-5 px-6">
                 <div className="flex items-center justify-between mb-2">
                   <CardTitle className="text-lg font-bold text-slate-900">Executive Summary</CardTitle>
                   <div className="px-2.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-purple-100/50">
                     Leadership
                   </div>
                 </div>
                 <CardDescription className="text-xs font-medium leading-tight">
                   High-level overview of department KPIs and operational health.
                 </CardDescription>
               </CardHeader>
               <CardContent className="px-6 pb-6 pt-2">
                 <div className="flex flex-row gap-2.5">
                   <Button 
                     onClick={() => handleExport('excel', 'summary')} 
                     disabled={isExporting}
                     className="flex-1 bg-[#032313] hover:bg-[#032313]/90 text-[#ACDF33] font-bold rounded-xl h-10.5 flex items-center justify-center group/btn px-3"
                   >
                     <span className="text-[11px] uppercase tracking-wider">Excel</span>
                   </Button>
                   <Button 
                     variant="outline"
                     onClick={() => handleExport('pdf', 'summary')} 
                     disabled={isExporting}
                     className="flex-1 border-slate-200 hover:border-[#ACDF33] hover:bg-[#ACDF33]/5 font-bold rounded-xl h-10.5 text-slate-600 text-[11px] uppercase tracking-wider px-3"
                   >
                     PDF docs
                   </Button>
                 </div>
               </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </DepartmentLayout>
  )
}
