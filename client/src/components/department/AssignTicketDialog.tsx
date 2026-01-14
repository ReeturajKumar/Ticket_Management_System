import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus } from "lucide-react"
import { getTeamMembers, assignTicket } from "@/services/departmentHeadService"

interface AssignTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  ticketSubject: string
  onSuccess: () => void
}

export function AssignTicketDialog({ open, onOpenChange, ticketId, ticketSubject, onSuccess }: AssignTicketDialogProps) {
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      fetchTeamMembers()
    }
  }, [open])

  const fetchTeamMembers = async () => {
    setIsLoading(true)
    try {
      const response = await getTeamMembers()
      // API returns { success: true, data: { teamMembers: [...], count: N } }
      setTeamMembers(response.data?.teamMembers || response.data || [])
    } catch (error) {
      console.error("Failed to fetch team members", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedMember) return

    setIsSubmitting(true)
    try {
      await assignTicket(ticketId, selectedMember)
      onSuccess()
      onOpenChange(false)
      setSelectedMember("")
    } catch (error) {
      console.error("Failed to assign ticket", error)
      alert("Failed to assign ticket. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Ticket
          </DialogTitle>
          <DialogDescription>
            Assign this ticket to a team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ticket</Label>
            <p className="text-sm text-muted-foreground">{ticketSubject}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-member">Assign to</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger id="team-member">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.length > 0 ? (
                    teamMembers.map((member) => (
                      <SelectItem key={member.id || member._id} value={member.id || member._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-members" disabled>
                      No team members available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
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
            onClick={handleAssign}
            disabled={!selectedMember || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Ticket"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
