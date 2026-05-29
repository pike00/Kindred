import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { tinykeys } from "tinykeys"

export type ShortcutGroup =
  | "Navigation"
  | "Actions"
  | "Search"
  | "Help"
  | string

export interface ShortcutDefinition {
  /** Key combination or chord sequence, e.g. "Meta+/" or "g c" */
  keys: string
  /** Human-readable description of what the shortcut does */
  description: string
  /** Group for organizing shortcuts in the overlay */
  group: ShortcutGroup
  /** Optional callback to execute when the shortcut is triggered */
  callback?: () => void
  /** Whether this shortcut is currently enabled */
  enabled?: boolean
}

interface ShortcutRegistryContextValue {
  /** All currently registered shortcuts */
  shortcuts: ShortcutDefinition[]
  /** Register a shortcut (called by useRegisterShortcuts) */
  register: (shortcut: ShortcutDefinition) => void
  /** Unregister a shortcut by keys + description */
  unregister: (keys: string, description: string) => void
  /** Whether the overlay is open */
  overlayOpen: boolean
  /** Set overlay open state */
  setOverlayOpen: (open: boolean) => void
  /** Toggle the overlay */
  toggleOverlay: () => void
}

const ShortcutRegistryContext =
  createContext<ShortcutRegistryContextValue | null>(null)

export function ShortcutRegistryProvider({
  children,
}: {
  children: ReactNode
}) {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([])
  const [overlayOpen, setOverlayOpen] = useState(false)

  const register = useCallback((shortcut: ShortcutDefinition) => {
    setShortcuts((prev) => {
      // Avoid duplicates based on keys + description
      const exists = prev.some(
        (s) =>
          s.keys === shortcut.keys && s.description === shortcut.description,
      )
      if (exists) return prev
      return [...prev, shortcut]
    })
  }, [])

  // Register the overlay toggle shortcuts so they appear in the overlay
  useEffect(() => {
    // Register Help group shortcuts for the overlay itself
    const helpShortcuts: ShortcutDefinition[] = [
      {
        keys: "?",
        description: "Open keyboard shortcut help",
        group: "Help",
        enabled: true,
      },
      {
        keys: "Meta+/",
        description: "Open keyboard shortcut help",
        group: "Help",
        enabled: true,
      },
      {
        keys: "Control+/",
        description: "Open keyboard shortcut help",
        group: "Help",
        enabled: true,
      },
    ]

    for (const shortcut of helpShortcuts) {
      register(shortcut)
    }
  }, [register])

  const unregister = useCallback((keys: string, description: string) => {
    setShortcuts((prev) =>
      prev.filter((s) => !(s.keys === keys && s.description === description)),
    )
  }, [])

  const toggleOverlay = useCallback(() => {
    setOverlayOpen((v) => !v)
  }, [])

  // Global keybinding for Cmd+/ or ? to open overlay
  useEffect(() => {
    const unsubscribe = tinykeys(
      window,
      {
        "?": (event: KeyboardEvent) => {
          // Only trigger if not in input/textarea/contenteditable
          if (shouldSuppress(event)) return
          event.preventDefault()
          toggleOverlay()
        },
        "Meta+/": (event: KeyboardEvent) => {
          if (shouldSuppress(event)) return
          event.preventDefault()
          toggleOverlay()
        },
        "Control+/": (event: KeyboardEvent) => {
          if (shouldSuppress(event)) return
          event.preventDefault()
          toggleOverlay()
        },
        // Escape always closes overlay regardless of focus
        Escape: () => {
          if (overlayOpen) {
            setOverlayOpen(false)
          }
        },
      },
      { timeout: 1500 },
    )

    return unsubscribe
  }, [toggleOverlay, overlayOpen])

  // Register global shortcuts (like Cmd+K for command palette)
  useEffect(() => {
    const activeShortcuts = shortcuts.filter((s) => s.enabled !== false)

    if (activeShortcuts.length === 0) return

    const keyMap: Record<string, (e: KeyboardEvent) => void> = {}

    for (const shortcut of activeShortcuts) {
      if (shortcut.callback) {
        keyMap[shortcut.keys] = (event: globalThis.KeyboardEvent) => {
          if (shouldSuppress(event) && shortcut.keys !== "Escape") return
          event.preventDefault()
          shortcut.callback?.()
        }
      }
    }

    if (Object.keys(keyMap).length === 0) return

    const unsubscribe = tinykeys(window, keyMap, { timeout: 1500 })
    return unsubscribe
  }, [shortcuts])

  const value = useMemo(
    () => ({
      shortcuts,
      register,
      unregister,
      overlayOpen,
      setOverlayOpen,
      toggleOverlay,
    }),
    [shortcuts, register, unregister, overlayOpen, toggleOverlay],
  )

  return (
    <ShortcutRegistryContext.Provider value={value}>
      {children}
    </ShortcutRegistryContext.Provider>
  )
}

/**
 * Hook to register shortcuts from any component.
 * Shortcuts are automatically unregistered on unmount.
 *
 * @example
 * useRegisterShortcuts({
 *   keys: "g c",
 *   description: "Go to Contacts",
 *   group: "Navigation",
 *   callback: () => navigate({ to: "/contacts" }),
 * })
 */
export function useRegisterShortcuts(shortcut: ShortcutDefinition): void
export function useRegisterShortcuts(shortcuts: ShortcutDefinition[]): void
export function useRegisterShortcuts(
  arg: ShortcutDefinition | ShortcutDefinition[],
): void {
  const ctx = useContext(ShortcutRegistryContext)
  if (!ctx) {
    throw new Error(
      "useRegisterShortcuts must be used inside <ShortcutRegistryProvider>",
    )
  }

  const shortcuts = Array.isArray(arg) ? arg : [arg]

  // Depend on the stable register/unregister callbacks, NOT the whole ctx
  // object: ctx gets a new identity whenever the registry list changes, so
  // depending on it would re-run this effect on every registration and churn
  // unregister/re-register forever ("Maximum update depth exceeded").
  const { register, unregister } = ctx

  useEffect(() => {
    for (const shortcut of shortcuts) {
      register(shortcut)
    }

    return () => {
      for (const shortcut of shortcuts) {
        unregister(shortcut.keys, shortcut.description)
      }
    }
  }, [shortcuts, register, unregister])
}

/**
 * Hook to access the shortcut registry and overlay state.
 */
export function useShortcutRegistry(): ShortcutRegistryContextValue {
  const ctx = useContext(ShortcutRegistryContext)
  if (!ctx) {
    throw new Error(
      "useShortcutRegistry must be used inside <ShortcutRegistryProvider>",
    )
  }
  return ctx
}

/**
 * Check if a keyboard event should be suppressed (i.e., don't fire hotkey)
 * because the user is focused on an input element.
 * Escape is explicitly NOT suppressed by this function.
 */
function shouldSuppress(event: globalThis.KeyboardEvent): boolean {
  const target = event.target as HTMLElement
  const tag = target.tagName.toLowerCase()
  if (tag === "input" || tag === "textarea") return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Format a key combination for display, converting to Mac-friendly symbols
 * when on macOS, with Windows/Linux fallback.
 */
export function formatKeys(keys: string, isMac: boolean = detectMac()): string {
  if (!keys.includes(" ")) {
    // Single key or simple combo like "Meta+/"
    return formatKeyCombo(keys, isMac)
  }
  // Chord sequence like "g c"
  return keys
    .split(" ")
    .map((k) => formatKey(k, isMac))
    .join(" then ")
}

function formatKeyCombo(combo: string, isMac: boolean): string {
  return combo
    .split("+")
    .map((k) => formatKey(k, isMac))
    .join(isMac ? "" : " + ")
}

function formatKey(key: string, isMac: boolean): string {
  const lower = key.toLowerCase()
  switch (lower) {
    case "meta":
    case "cmd":
      return isMac ? "⌘" : "Ctrl"
    case "shift":
      return isMac ? "⇧" : "Shift"
    case "alt":
    case "option":
      return isMac ? "⌥" : "Alt"
    case "control":
    case "ctrl":
      return isMac ? "⌃" : "Ctrl"
    case "enter":
      return "Enter"
    case "escape":
      return "Esc"
    case " ":
      return "Space"
    case "arrowup":
      return "↑"
    case "arrowdown":
      return "↓"
    case "arrowleft":
      return "←"
    case "arrowright":
      return "→"
    case "/":
      return "/"
    case "?":
      return "?"
    default:
      return key.toUpperCase()
  }
}

function detectMac(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}
