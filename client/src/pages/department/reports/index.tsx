import { useEffect, useState } from "react"
import { DepartmentLayout } from "@/components/layout/DepartmentLayout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSummaryReport, exportReport } from "@/services/departmentHeadService"
import { FileText, Calendar, CheckCircle, AlertOctagon, Clock } from "lucide-react"
import { toast } from 'react-toastify'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DashboardHeader, DashboardLoading } from "@/components/department/dashboard/shared/DashboardHeader"
import { ReportStatCard } from "@/components/department/dashboard/shared/StatCards"

export default function DepartmentReportsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [period, setPeriod] = useState("month")

  useEffect(() => {
    fetchReportData()
  }, [period])

  const fetchReportData = async () => {
    setIsLoading(true)
    try {
      const data = await getSummaryReport(undefined, undefined) 
      setReportData(data.data)
    } catch (error) {
      console.error("Failed to fetch report data:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    fetchReportData()
  }

  const handleExport = async (formatType: 'excel' | 'pdf', exportType: 'tickets' | 'team' | 'summary') => {
    setIsExporting(true)
    try {
      const blob = await exportReport(formatType, exportType)
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
      <div className="flex-1 p-8 pt-6 space-y-8 max-w-[1600px] mx-auto">
        <DashboardHeader
          title="Reports & Analytics"
          subtitle="View department performance summary and export data"
          showLiveBadge={false}
        >
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
        </DashboardHeader>

        {isLoading ? (
          <DashboardLoading />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <ReportStatCard
               variant="dark"
               title="Total Inflow"
               value={reportData?.summary?.totalTickets || 0}
               subText={`${reportData?.summary?.open || 0} Open • ${reportData?.summary?.inProgress || 0} Ongoing`}
               icon={FileText}
             />
             <ReportStatCard
               title="Resolution"
               value={reportData?.summary?.resolved || 0}
               subText="Total Completed"
               icon={CheckCircle}
             />
             <ReportStatCard
               title="Velocity"
               value={reportData?.summary?.avgResolutionTime || "N/A"}
               subText="Avg Duration"
               icon={Clock}
             />
             <ReportStatCard
               title="SLA Score"
               value={reportData?.summary?.slaCompliance || "0%"}
               subText="Compliance Rate"
               icon={AlertOctagon}
             />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Export Data</h3>
            <p className="text-xs font-medium text-slate-500">Download reports in Excel or PDF format</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
             <ExportCard 
               title="Tickets Report" 
               description="Complete list of tickets with details, status history, and assignment info."
               tag="Historical"
               tagColor="blue"
               exportType="tickets"
               isExporting={isExporting}
               onExport={handleExport}
             />
             <ExportCard 
               title="Team Performance" 
               description="Detailed metrics per staff member including workload and efficiency stats."
               tag="Operational"
               tagColor="emerald"
               exportType="team"
               isExporting={isExporting}
               onExport={handleExport}
             />
             <ExportCard 
               title="Executive Summary" 
               description="High-level overview of department KPIs and operational health."
               tag="Leadership"
               tagColor="purple"
               exportType="summary"
               isExporting={isExporting}
               onExport={handleExport}
             />
          </div>
        </div>
      </div>
    </DepartmentLayout>
  )
}

function ExportCard({ title, description, tag, tagColor, exportType, isExporting, onExport }: any) {
  const tagStyles: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100/50",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100/50",
    purple: "bg-purple-50 text-purple-600 border-purple-100/50"
  };

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-[2.25rem] bg-slate-50/50 group overflow-hidden border border-slate-200/50">
      <CardHeader className="pb-2 pt-5 px-6">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg font-bold text-slate-900">{title}</CardTitle>
          <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${tagStyles[tagColor]}`}>
            {tag}
          </div>
        </div>
        <CardDescription className="text-xs font-medium leading-tight">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        <div className="flex flex-row gap-2.5">
          <Button 
            onClick={() => onExport('excel', exportType)} 
            disabled={isExporting}
            className="flex-1 bg-[#032313] hover:bg-[#032313]/90 text-[#ACDF33] font-bold rounded-xl h-10.5 flex items-center justify-center group/btn px-3"
          >
            <span className="text-[11px] uppercase tracking-wider">Excel</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => onExport('pdf', exportType)} 
            disabled={isExporting}
            className="flex-1 border-slate-200 hover:border-[#ACDF33] hover:bg-[#ACDF33]/5 font-bold rounded-xl h-10.5 text-slate-600 text-[11px] uppercase tracking-wider px-3"
          >
            <span className="text-[11px] uppercase tracking-wider">PDF docs</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
