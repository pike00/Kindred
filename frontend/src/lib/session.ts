// A generation belongs to one page's authenticated session. Never transfer work
// (including callbacks which ignore AbortSignal) across an authentication change.
let generation = 0
let controller = new AbortController()
let ownerId: string | null = null
let leaving = false
// Bound once before the generation first accepts work or a verified identity.
// Reading storage again must never silently adopt a sibling tab's credentials.
let credential: string | null | undefined
const listeners = new Set<() => void>()
const exitListeners = new Set<() => void>()
const identityListeners = new Set<() => void>()
const SESSION_EVENT = "kindred-session-change"

export class SessionChangedError extends Error {
  constructor() {
    super("The authenticated session changed. Please try again.")
    this.name = "SessionChangedError"
  }
}

export interface Session {
  generation: number
  token: string | null
  signal: AbortSignal
}

function assertCredential(): void {
  if (leaving) throw new SessionChangedError()
  const stored = localStorage.getItem("access_token")
  if (credential === undefined) credential = stored
  if (stored !== credential) {
    // Preserve the sibling's token while discarding this page's old identity.
    reloadSession()
    throw new SessionChangedError()
  }
}

export function captureSession(): Session {
  assertCredential()
  return {
    generation,
    token: credential ?? null,
    signal: controller.signal,
  }
}

export function assertSession(session: Session): void {
  assertCredential()
  if (
    leaving ||
    session.signal.aborted ||
    session.generation !== generation ||
    session.token !== credential
  )
    throw new SessionChangedError()
}

export function onSessionReset(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function onSessionExit(listener: () => void) {
  exitListeners.add(listener)
  return () => {
    exitListeners.delete(listener)
  }
}

function exitPage() {
  leaving = true
  for (const listener of exitListeners) listener()
}

export function resetSession(): void {
  leaving = false
  generation++
  controller.abort()
  controller = new AbortController()
  ownerId = null
  credential = undefined
  for (const listener of identityListeners) listener()
  for (const listener of listeners) listener()
}

export function currentAccountId(): string {
  assertCredential()
  if (leaving || !ownerId) throw new SessionChangedError()
  return ownerId
}

export const getVerifiedAccountId = () => ownerId
export function onIdentityChange(listener: () => void) {
  identityListeners.add(listener)
  return () => {
    identityListeners.delete(listener)
  }
}

export function acceptIdentity(id: string): void {
  assertCredential()
  if (ownerId && ownerId !== id) {
    leaveSession("/")
    throw new SessionChangedError()
  }
  ownerId = id
  for (const listener of identityListeners) listener()
}

export function leaveSession(url: string, broadcast = true): void {
  if (leaving) return
  assertCredential()
  localStorage.removeItem("access_token")
  resetSession()
  exitPage()
  if (broadcast) localStorage.setItem(SESSION_EVENT, crypto.randomUUID())
  // A document navigation discards router loaders and all component-local data.
  window.location.assign(url)
}

export function completeLogin(token: string, session: Session): void {
  assertSession(session)
  resetSession()
  localStorage.setItem("access_token", token)
  localStorage.setItem(SESSION_EVENT, crypto.randomUUID())
  exitPage()
  window.location.assign("/")
}

export function reloadSession(): void {
  resetSession()
  exitPage()
  window.location.reload()
}

export function listenForSessionChanges() {
  window.addEventListener("storage", (event) => {
    if (
      event.key === SESSION_EVENT ||
      event.key === "access_token" ||
      event.key === null
    ) {
      // Another tab may already have installed a new token. Do not remove it.
      reloadSession()
    }
  })
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      reloadSession()
    }
  })
}
