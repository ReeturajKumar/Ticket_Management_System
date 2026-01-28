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
    <div className="fixed bottom-3 sm:bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 w-[calc(100%-1.5rem)] sm:w-auto max-w-[calc(100vw-2rem)]">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 md:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="bg-primary-foreground/20 rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center font-semibold text-xs sm:text-sm">
            {selectedCount}
          </div>
          <span className="font-medium text-xs sm:text-sm">
            <span className="hidden sm:inline">{selectedCount} ticket{selectedCount !== 1 ? 's' : ''} selected</span>
            <span className="sm:hidden">{selectedCount} selected</span>
          </span>
        </div>

        <div className="hidden sm:block h-6 w-px bg-primary-foreground/30" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAssign}
            className="gap-1.5 sm:gap-2 h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
          >
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Assign</span>
            <span className="sm:hidden">Assign</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="gap-1.5 sm:gap-2 h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
          >
            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Close</span>
            <span className="sm:hidden">Close</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-1.5 sm:gap-2 h-7 sm:h-9 text-xs sm:text-sm px-2 sm:px-3 hover:bg-primary-foreground/20"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Clear</span>
            <span className="sm:hidden">Clear</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
