import { Button } from "@/components/ui/button"
import { X, UserPlus, XCircle } from "lucide-react"

interface BulkActionsToolbarProps {
  selectedCount: number
  onAssign: () => void
  onClose: () => void
  onClear: () => void
}

export function BulkActionsToolbar({ selectedCount, onAssign, onClose, onClear }: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary-foreground/20 rounded-full h-8 w-8 flex items-center justify-center font-semibold">
            {selectedCount}
          </div>
          <span className="font-medium">
            {selectedCount} ticket{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="h-6 w-px bg-primary-foreground/30" />

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAssign}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Assign
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Close
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-2 hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
