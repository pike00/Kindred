import { QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { lazy, StrictMode, Suspense, useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import { OpenAPI } from "./client"
import { ThemeProvider } from "./components/theme-provider"
import { ShortcutRegistryProvider } from "./hooks/useKeyboardShortcuts"
import "./index.css"
import PagePending from "./components/Common/PagePending"
import { queryClient } from "./lib/queryClient"
import { routeTree } from "./routeTree.gen"

// Deferred off the critical path — neither is needed for first paint, and keeping
// them out of the entry chunk drops sonner (~50 KB) and the PWA-prompt deps from
// the initial download/parse.
const Toaster = lazy(() =>
  import("./components/ui/sonner").then((m) => ({ default: m.Toaster })),
)
const PwaInstallPrompt = lazy(() =>
  import("./components/PwaInstallPrompt").then((m) => ({
    default: m.PwaInstallPrompt,
  })),
)
const isE2E = import.meta.env.VITE_E2E === "true"

OpenAPI.BASE = import.meta.env.VITE_API_URL || ""
OpenAPI.WITH_CREDENTIALS = true
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

const router = createRouter({
  routeTree,
  // Preload a route's loader on link hover/focus so its data is warm before the
  // click commits — the old page stays visible until the new page's data is
  // ready, then swaps fully-formed.
  defaultPreload: "intent",
  // Let React Query own staleness; don't let the router short-circuit loaders
  // with its own separate preload cache.
  defaultPreloadStaleTime: 0,
  // Trigger pending transitions after 50ms so clicks don't feel frozen waiting on loaders
  defaultPendingMs: 50,
  // Ensure pending UI stays visible for at least 200ms to avoid flashing layout
  defaultPendingMinMs: 200,
  // Default loading screen component during route transitions
  defaultPendingComponent: PagePending,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

function ServiceWorkerUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)

  useEffect(() => {
    if (isE2E) return
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setNeedRefresh(true)
              }
            })
          }
        })
      })

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload()
      })
    }
  }, [])

  if (isE2E || !needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg bg-primary p-4 text-primary-foreground shadow-lg md:left-auto md:right-4 md:max-w-sm">
      <p className="text-sm font-medium">New version available!</p>
      <p className="text-xs opacity-90">Refresh to update the app.</p>
      <button
        type="button"
        className="mt-2 rounded bg-white px-3 py-1 text-xs font-medium text-primary"
        onClick={() => window.location.reload()}
      >
        Refresh Now
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <ShortcutRegistryProvider>
          <RouterProvider router={router} />
          <Suspense fallback={null}>
            <Toaster richColors closeButton />
            {!isE2E && <PwaInstallPrompt />}
          </Suspense>
          <ServiceWorkerUpdatePrompt />
        </ShortcutRegistryProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
