import type { AxiosRequestConfig, AxiosResponse } from "axios"
import { cfEnabled } from "@/auth/cf"
import { OpenAPI } from "@/client/core/OpenAPI"
import {
  acceptIdentity,
  assertSession,
  captureSession,
  leaveSession,
  onSessionReset,
  type Session,
  SessionChangedError,
} from "./session"

type SessionConfig = AxiosRequestConfig & { kindredSession?: Session }
const snapshots = new Map<string, Session>()
let requestId = 0

function authFailure(status: number, url = "") {
  if (
    (status === 401 || status === 403) &&
    !url.includes("/login/access-token")
  ) {
    leaveSession(cfEnabled() ? "/" : "/login")
    throw new SessionChangedError()
  }
}

// Use the supported SDK hooks so regeneration cannot remove this boundary.
// HEADERS runs before the SDK's first await, before credentials can change.
export function installSessionApi() {
  onSessionReset(() => snapshots.clear())
  OpenAPI.HEADERS = async () => {
    const id = String(++requestId)
    snapshots.set(id, captureSession())
    return { "X-Kindred-Request-Session": id }
  }
  OpenAPI.interceptors.request.use((config: SessionConfig) => {
    const headers = config.headers as Record<string, string>
    const id = headers["X-Kindred-Request-Session"]
    const session = snapshots.get(id)
    snapshots.delete(id)
    delete headers["X-Kindred-Request-Session"]
    if (!session) throw new SessionChangedError()
    assertSession(session)
    config.kindredSession = session
    config.signal = config.signal
      ? AbortSignal.any([config.signal as AbortSignal, session.signal])
      : session.signal
    return config
  })
  OpenAPI.interceptors.response.use((response: AxiosResponse) => {
    const session = (response.config as SessionConfig).kindredSession
    if (!session) throw new SessionChangedError()
    assertSession(session)
    authFailure(response.status, response.config.url)
    // Access may redirect an API request to an HTML login page with status 200.
    if (String(response.headers["content-type"]).includes("text/html")) {
      leaveSession(cfEnabled() ? "/" : "/login")
      throw new SessionChangedError()
    }
    if (response.config.url?.match(/\/users\/me\/?$/) && response.data?.id) {
      acceptIdentity(response.data.id)
    }
    return response
  })
}

// Direct fetch users need the same boundary, including response body reads.
export async function sessionFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const session = captureSession()
  assertSession(session)
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    signal: init?.signal
      ? AbortSignal.any([init.signal, session.signal])
      : session.signal,
  })
  assertSession(session)
  authFailure(response.status, String(input))
  if (
    response.redirected &&
    response.headers.get("content-type")?.includes("text/html")
  ) {
    leaveSession(cfEnabled() ? "/" : "/login")
    throw new SessionChangedError()
  }
  for (const method of [
    "json",
    "text",
    "blob",
    "arrayBuffer",
    "formData",
  ] as const) {
    if (typeof response[method] !== "function") continue
    const read = response[method].bind(response)
    Object.defineProperty(response, method, {
      value: async () => {
        assertSession(session)
        const value = await read()
        assertSession(session)
        return value
      },
    })
  }
  return response
}
