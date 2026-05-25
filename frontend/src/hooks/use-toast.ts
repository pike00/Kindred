import { toast as sonnerToast } from "sonner"

interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

function toast(options: ToastOptions) {
  const message = options.title ?? ""
  const description = options.description

  if (options.variant === "destructive") {
    sonnerToast.error(message, { description })
  } else {
    sonnerToast.success(message, { description })
  }
}

export function useToast() {
  return { toast }
}
