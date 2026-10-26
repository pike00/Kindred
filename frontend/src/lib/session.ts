// A generation belongs to one page's authenticated session. Never transfer work
// (including callbacks which ignore AbortSignal) across an authentication change.
let generation = 0
let controller = new AbortController()
let ownerId: string | null = null
let leaving = false
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

export function captureSession() {
  return {
    generation,
    token: localStorage.getItem("access_token"),
    signal: controller.signal,
  }
}

export type Session = ReturnType<typeof captureSession>

export function assertSession(session: Session) {
  if (
    leaving ||
    session.signal.aborted ||
    session.generation !== generation ||
    session.token !== localStorage.getItem("access_token")
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

export function resetSession() {
  leaving = false
  generation++
  controller.abort()
  controller = new AbortController()
  ownerId = null
  for (const listener of identityListeners) listener()
  for (const listener of listeners) listener()
}

export function currentAccountId(): string {
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

export function acceptIdentity(id: string) {
  if (ownerId && ownerId !== id) {
    leaveSession("/")
    throw new SessionChangedError()
  }
  ownerId = id
  for (const listener of identityListeners) listener()
}

export function leaveSession(url: string, broadcast = true) {
  if (leaving) return
  localStorage.removeItem("access_token")
  resetSession()
  exitPage()
  if (broadcast) localStorage.setItem(SESSION_EVENT, crypto.randomUUID())
  // A document navigation discards router loaders and all component-local data.
  window.location.assign(url)
}

export function completeLogin(token: string, session: Session) {
  assertSession(session)
  resetSession()
  localStorage.setItem("access_token", token)
  localStorage.setItem(SESSION_EVENT, crypto.randomUUID())
  exitPage()
  window.location.assign("/")
}

export function reloadSession() {
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
