import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, X } from "@/lib/icons"

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // For iOS, show A2HS hint if not already installed
    if (
      isIOSDevice &&
      !window.matchMedia("(display-mode: standalone)").matches
    ) {
      // Delay showing the prompt to not overwhelm the user
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // For Android/Chrome - handle beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowPrompt(false)
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      )
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("User accepted the install prompt")
    } else {
      console.log("User dismissed the install prompt")
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
    // Don't show again for this session
    sessionStorage.setItem("pwa-prompt-dismissed", "true")
  }

  // Don't show if dismissed this session or already in standalone mode
  if (
    !showPrompt ||
    sessionStorage.getItem("pwa-prompt-dismissed") ||
    window.matchMedia("(display-mode: standalone)").matches
  ) {
    return null
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md shadow-lg md:left-auto md:right-4 md:max-w-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex-1">
          <p className="text-sm font-medium">Install Kindred</p>
          <p className="text-xs text-muted-foreground">
            {isIOS
              ? "Tap the share button and select 'Add to Home Screen'"
              : "Install this app for offline access and a better experience"}
          </p>
        </div>
        {!isIOS && (
          <Button size="sm" onClick={handleInstall}>
            <Download className="size-4 mr-1" />
            Install
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          <X className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
