import type { AxiosRequestConfig, AxiosResponse } from "axios"
import { cfEnabled } from "@/auth/cf"
import type { ApiRequestOptions } from "@/client/core/ApiRequestOptions"
import { OpenAPI, type OpenAPIConfig } from "@/client/core/OpenAPI"
import {
  acceptIdentity,
  assertSession,
  captureSession,
  leaveSession,
  onSessionReset,
  reloadSession,
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
    if (
      (headers.Authorization || "") !==
      (session.token ? `Bearer ${session.token}` : "")
    ) {
      reloadSession()
      throw new SessionChangedError()
    }
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
  credentialSource: OpenAPIConfig["TOKEN"] = OpenAPI.TOKEN,
): Promise<Response> {
  const session = captureSession()
  // Capture before resolving any asynchronous credential provider.
  const token =
    (typeof credentialSource === "function"
      ? await credentialSource({
          method: (init?.method || "GET") as ApiRequestOptions["method"],
          url: String(input),
        })
      : credentialSource) ??
    session.token ??
    ""
  assertSession(session)
  const headers = new Headers(
    input instanceof Request ? input.headers : undefined,
  )
  new Headers(init?.headers).forEach((value, key) => {
    headers.set(key, value)
  })
  const authorization = session.token ? `Bearer ${session.token}` : null
  if (
    token !== (session.token ?? "") ||
    (headers.has("Authorization") &&
      headers.get("Authorization") !== authorization)
  ) {
    reloadSession()
    throw new SessionChangedError()
  }
  if (authorization) headers.set("Authorization", authorization)
  const response = await fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
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
