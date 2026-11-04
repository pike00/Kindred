import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { ensurePrivateApiWorker } from "@/lib/service-worker-session"

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("MessageChannel", class {
    port1 = { onmessage: null as null | ((event: { data: unknown }) => void), close: vi.fn() }
    port2 = { close: vi.fn(), postMessage: (data: unknown) => this.port1.onmessage?.({ data }) }
  })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

const safeWorker = { postMessage: vi.fn((data: unknown, ports: MessagePort[]) => ports[0].postMessage(data)) }

it("allows a first visit without a controlling service worker", async () => {
  vi.stubGlobal("navigator", { serviceWorker: { controller: null } })
  await expect(ensurePrivateApiWorker()).resolves.toBeUndefined()
})

it("waits for an installed worker on a cold offline start", async () => {
  const workers: any = {
    controller: null,
    ready: Promise.resolve().then(() => {
      workers.controller = safeWorker
      return { active: safeWorker }
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    register: vi.fn(),
  }
  vi.stubGlobal("navigator", { onLine: false, serviceWorker: workers })
  await expect(ensurePrivateApiWorker()).resolves.toBeUndefined()
  expect(workers.register).not.toHaveBeenCalled()
})

it("allows an installed worker only after its NetworkOnly handshake", async () => {
  const register = vi.fn()
  vi.stubGlobal("navigator", { serviceWorker: { controller: safeWorker, register, addEventListener: vi.fn(), removeEventListener: vi.fn() } })
  await expect(ensurePrivateApiWorker()).resolves.toBeUndefined()
  expect(register).not.toHaveBeenCalled()
})

it("waits for the safe replacement to control an old caching worker's page", async () => {
  let changed!: () => void
  const workers = {
    controller: { postMessage: vi.fn() },
    addEventListener: vi.fn((_event, listener) => { changed = listener }),
    removeEventListener: vi.fn(),
    register: vi.fn(async () => ({ update: async () => { workers.controller = safeWorker; changed() } })),
  }
  vi.stubGlobal("navigator", { serviceWorker: workers })
  const pending = ensurePrivateApiWorker()
  const done = expect(pending).resolves.toBeUndefined()
  await vi.advanceTimersByTimeAsync(1000)
  await done
  expect(workers.register).toHaveBeenCalledWith("/sw.js", { updateViaCache: "none" })
})

it("blocks private routes when an old caching worker cannot be replaced offline", async () => {
  const workers = {
    controller: { postMessage: vi.fn() },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    register: vi.fn(async () => ({ update: () => new Promise(() => {}) })),
  }
  vi.stubGlobal("navigator", { serviceWorker: workers })
  const pending = ensurePrivateApiWorker()
  const rejected = expect(pending).rejects.toThrow("security update is required")
  await vi.advanceTimersByTimeAsync(16000)
  await rejected
})

it("accepts a safe controller that takes over during the initial old-worker probe", async () => {
  const workers = {
    controller: { postMessage: vi.fn() },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    register: vi.fn(async () => ({ update: async () => {} })),
  }
  vi.stubGlobal("navigator", { serviceWorker: workers })
  const pending = ensurePrivateApiWorker()
  const resolved = expect(pending).resolves.toBeUndefined()
  workers.controller = safeWorker
  await vi.advanceTimersByTimeAsync(16000)
  await resolved
})

it("does not accept an earlier safe handshake after an unsafe controller takes over", async () => {
  const unsafe = { postMessage: vi.fn((_data: unknown, _ports: MessagePort[]) => {}) }
  const workers = {
    controller: { postMessage: vi.fn((data: unknown, ports: MessagePort[]) => {
      ports[0].postMessage(data)
      workers.controller = unsafe
    }) },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    register: vi.fn(async () => ({ update: () => new Promise(() => {}) })),
  }
  vi.stubGlobal("navigator", { serviceWorker: workers })
  const rejected = expect(ensurePrivateApiWorker()).rejects.toThrow("security update is required")
  await vi.advanceTimersByTimeAsync(16000)
  await rejected
})
