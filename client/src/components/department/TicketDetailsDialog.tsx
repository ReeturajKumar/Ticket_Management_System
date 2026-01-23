
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Loader2, Tag, MessageSquare } from "lucide-react"
import { getMyTicketDetails } from "@/services/departmentStaffService"
import { getTicketDetails } from "@/services/departmentHeadService"

interface TicketDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  isHead?: boolean
}

export function TicketDetailsDialog({ open, onOpenChange, ticketId, isHead }: TicketDetailsDialogProps) {
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && ticketId) {
      const fetchDetails = async () => {
        setLoading(true)
        try {
          const res = isHead ? await getTicketDetails(ticketId) : await getMyTicketDetails(ticketId)
          setTicket(res.data)
        } catch (error) {
          console.error("Failed to fetch ticket details", error)
        } finally {
          setLoading(false)
        }
      }
      fetchDetails()
    } else {
      setTicket(null)
    }
  }, [open, ticketId, isHead])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : ticket ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={ticket.status === 'OPEN' ? 'destructive' : 'secondary'}>
                  {ticket.status}
                </Badge>
                <Badge variant="outline">{ticket.priority}</Badge>
                <span className="text-xs text-muted-foreground font-mono">#{ticket.ticketId || ticket._id.slice(-6)}</span>
              </div>
              <DialogTitle className="text-xl font-bold">{ticket.subject}</DialogTitle>
              <DialogDescription>
                Details of your internal ticket request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Target Department</p>
                  <p className="text-sm font-semibold">{ticket.department}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Created On</p>
                  <p className="text-sm">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-500" />
                  Description
                </p>
                <div className="p-3 bg-muted/30 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>

              {ticket.comments && ticket.comments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    Updates & Comments
                  </p>
                  <div className="space-y-3">
                    {ticket.comments.map((comment: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border bg-card/50 text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-xs">{comment.userName}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Ticket details not found.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
