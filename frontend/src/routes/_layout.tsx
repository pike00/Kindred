import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { CommandPalette } from "@/components/CommandPalette/CommandPalette"
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "@/components/CommandPalette/CommandPaletteContext"
import { Footer } from "@/components/Common/Footer"
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
import { Search } from "@/lib/icons"

export const Route = createFileRoute("/_layout")({
  component: Layout,
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
      <CommandPalette />
    </CommandPaletteProvider>
  )
}

export default Layout
