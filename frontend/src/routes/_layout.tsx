import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { CommandPalette } from "@/components/CommandPalette/CommandPalette"
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "@/components/CommandPalette/CommandPaletteContext"
import ErrorComponent from "@/components/Common/ErrorComponent"
import { Footer } from "@/components/Common/Footer"
import { QuickLogFAB } from "@/components/Common/QuickLogFAB"
import { ReminderBell } from "@/components/Reminders/ReminderBell"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { VoiceRecordButton } from "@/components/VoiceRecorder/VoiceRecordButton"
import { isLoggedIn } from "@/hooks/useAuth"
import { useRegisterShortcuts } from "@/hooks/useKeyboardShortcuts"
import { Search } from "@/lib/icons"

function AuthGuardError({ error }: { error: unknown }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      localStorage.removeItem("access_token")
      navigate({ to: "/login", replace: true })
    }
  }, [error, navigate])

  if (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403)
  ) {
    return null
  }

  return <ErrorComponent />
}

export const Route = createFileRoute("/_layout")({
  component: Layout,
  errorComponent: AuthGuardError,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }
  },
})

function CommandPaletteTrigger() {
  const { setOpen } = useCommandPalette()
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setOpen(true)}
      className="ml-auto h-8 gap-2 text-muted-foreground"
      aria-label="Open command palette"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
        {isMac ? "⌘" : "Ctrl"} K
      </kbd>
    </Button>
  )
}

function Layout() {
  const queryClient = useQueryClient()

  return (
    <CommandPaletteProvider>
      <LayoutShortcuts />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
            <CommandPaletteTrigger />
            <ReminderBell />
          </header>
          <main className="flex-1 p-6 md:p-8">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
          <Footer />
        </SidebarInset>
        <VoiceRecordButton
          onInteractionCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["interactions"] })
          }}
        />
      </SidebarProvider>
      <QuickLogFAB />
      <CommandPalette />
    </CommandPaletteProvider>
  )
}

function LayoutShortcuts() {
  const navigate = useNavigate()

  useRegisterShortcuts([
    {
      keys: "g c",
      description: "Go to Contacts",
      group: "Navigation",
      callback: () => navigate({ to: "/contacts" }),
    },
    {
      keys: "g i",
      description: "Go to Interactions",
      group: "Navigation",
      callback: () => navigate({ to: "/interactions" }),
    },
    {
      keys: "g j",
      description: "Go to Journal",
      group: "Navigation",
      callback: () => navigate({ to: "/journal" }),
    },
    {
      keys: "g t",
      description: "Go to Tags",
      group: "Navigation",
      callback: () => navigate({ to: "/tags" }),
    },
    {
      keys: "g r",
      description: "Go to Reminders",
      group: "Navigation",
      callback: () => navigate({ to: "/reminders" }),
    },
    {
      keys: "g s",
      description: "Go to Settings",
      group: "Navigation",
      callback: () => navigate({ to: "/settings" }),
    },
    {
      keys: "Meta+Shift+n",
      description: "New Contact",
      group: "Actions",
      callback: () => navigate({ to: "/contacts" }),
    },
    {
      keys: "Meta+Shift+i",
      description: "New Interaction",
      group: "Actions",
      callback: () => navigate({ to: "/interactions" }),
    },
  ])

  return null
}

export default Layout
