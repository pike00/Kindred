import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatKeys, useShortcutRegistry } from "@/hooks/useKeyboardShortcuts"

// Group order for display
const GROUP_ORDER: string[] = ["Navigation", "Actions", "Search", "Help"]

// Group labels (for potential customization)
const GROUP_LABELS: Record<string, string> = {
  Navigation: "Navigation",
  Actions: "Actions",
  Search: "Search",
  Help: "Help",
}

export default function KeyboardShortcutOverlay() {
  const { shortcuts, overlayOpen, setOverlayOpen } = useShortcutRegistry()
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  // Group shortcuts by group
  const grouped = shortcuts.reduce<Record<string, typeof shortcuts>>(
    (acc, shortcut) => {
      const group = shortcut.group || "Other"
      if (!acc[group]) acc[group] = []
      acc[group].push(shortcut)
      return acc
    },
    {},
  )

  // Sort groups by predefined order, then alphabetically
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const aIdx = GROUP_ORDER.indexOf(a)
    const bIdx = GROUP_ORDER.indexOf(b)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.localeCompare(b)
  })

  return (
    <Dialog open={overlayOpen} onOpenChange={setOverlayOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            All available keyboard shortcuts. Press{" "}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              ?
            </kbd>{" "}
            or{" "}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              {isMac ? "⌘" : "Ctrl"}/
            </kbd>{" "}
            to open this dialog. Press{" "}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              Esc
            </kbd>{" "}
            to close.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          {sortedGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No keyboard shortcuts registered.
            </p>
          ) : (
            sortedGroups.map((group) => (
              <div key={group} className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {GROUP_LABELS[group] || group}
                </h3>
                <div className="space-y-1">
                  {grouped[group]
                    .filter((s) => s.enabled !== false)
                    .map((shortcut, idx) => (
                      <div
                        key={`${shortcut.keys}-${idx}`}
                        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50 transition-colors"
                      >
                        <span className="text-sm text-foreground">
                          {shortcut.description}
                        </span>
                        <ShortcutKeys keys={shortcut.keys} isMac={isMac} />
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutKeys({ keys, isMac }: { keys: string; isMac: boolean }) {
  const formatted = formatKeys(keys, isMac)

  // Handle chord sequences (containing "then")
  if (formatted.includes(" then ")) {
    const parts = formatted.split(" then ")
    return (
      <span className="inline-flex items-center gap-1">
        {parts.map((part, i) => (
          <span key={i} className="inline-flex items-center">
            {i > 0 && (
              <span className="text-xs text-muted-foreground mx-0.5">then</span>
            )}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              {part}
            </kbd>
          </span>
        ))}
      </span>
    )
  }

  // Handle key combos (containing "+" on non-Mac, or just combined on Mac)
  if (formatted.includes("+")) {
    const parts = formatted.split("+")
    return (
      <span className="inline-flex items-center gap-0.5">
        {parts.map((part, i) => (
          <span key={i} className="inline-flex items-center">
            {i > 0 && (
              <span className="text-xs text-muted-foreground mx-0.5">+</span>
            )}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              {part}
            </kbd>
          </span>
        ))}
      </span>
    )
  }

  // Single key
  return (
    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
      {formatted}
    </kbd>
  )
}
