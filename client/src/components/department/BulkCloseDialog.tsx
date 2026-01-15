import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useState } from "react"
import { bulkUpdateStatus } from "@/services/departmentHeadService"
import { toast } from 'react-toastify'

interface BulkCloseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketIds: string[]
  onSuccess: () => void
}

export function BulkCloseDialog({ open, onOpenChange, ticketIds, onSuccess }: BulkCloseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = async () => {
    setIsSubmitting(true)
    try {
      await bulkUpdateStatus(ticketIds, 'CLOSED')
      toast.success(`Successfully closed ${ticketIds.length} ticket${ticketIds.length !== 1 ? 's' : ''}`)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to close tickets", error)
      toast.error("Failed to close tickets. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Close Tickets
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to close {ticketIds.length} ticket{ticketIds.length !== 1 ? 's' : ''}?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-muted-foreground">
              This action will mark {ticketIds.length} ticket{ticketIds.length !== 1 ? 's' : ''} as closed. 
              Closed tickets cannot be updated through bulk operations.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Closing...
              </>
            ) : (
              `Close ${ticketIds.length} Ticket${ticketIds.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
