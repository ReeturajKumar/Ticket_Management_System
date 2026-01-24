import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Keyboard } from 'lucide-react'
import { globalShortcuts, type ShortcutInfo } from '@/lib/accessibility'
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts'

// ============================================================================
// KEYBOARD SHORTCUTS HELP DIALOG
// Shows available keyboard shortcuts to users
// ============================================================================

interface KeyboardShortcutsHelpProps {
  /** Additional shortcuts specific to the current page */
  pageShortcuts?: ShortcutInfo[]
  /** Show trigger button (default: true) */
  showTrigger?: boolean
  /** External control for dialog open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
}

/**
 * KeyboardShortcutsHelp - Dialog showing keyboard shortcuts
 * 
 * @example
 * <KeyboardShortcutsHelp />
 * 
 * // Or with custom shortcuts
 * <KeyboardShortcutsHelp 
 *   pageShortcuts={[
 *     { keys: 'D', description: 'Toggle details', category: 'View' }
 *   ]} 
 * />
 */
export function KeyboardShortcutsHelp({
  pageShortcuts = [],
  showTrigger = true,
  open: controlledOpen,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isOpen = controlledOpen ?? internalOpen
  const setIsOpen = onOpenChange ?? setInternalOpen

  // Close on Escape
  useEscapeKey(() => {
    if (isOpen) setIsOpen(false)
  }, isOpen)

  // Group shortcuts by category
  const allShortcuts = [...globalShortcuts, ...pageShortcuts]
  const groupedShortcuts = allShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, ShortcutInfo[]>)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            aria-label="Show keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
            <span className="hidden sm:inline">Shortcuts</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="max-w-md"
        aria-describedby="shortcuts-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <p id="shortcuts-description" className="sr-only">
          A list of keyboard shortcuts available on this page
        </p>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t text-xs text-muted-foreground">
          Press <kbd className="px-1 bg-muted rounded">?</kbd> to toggle this help dialog
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyboardShortcutsHelp
