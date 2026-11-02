import { useEffect } from "react"
import { cfEnabled } from "@/auth/cf"
import { ApiError } from "@/client"
import { leaveSession } from "@/lib/session"
import ErrorComponent from "./ErrorComponent"

export function AuthGuardError({ error }: { error: unknown }) {
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      leaveSession(cfEnabled() ? "/" : "/login")
    }
  }, [error])

  if (error instanceof ApiError && error.status === 401) {
    return null
  }

  return <ErrorComponent />
}
