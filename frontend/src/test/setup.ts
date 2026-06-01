import "@testing-library/jest-dom"
import { cleanup, configure } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// Increase default waitFor timeout to handle slow async resolution under load
configure({ asyncUtilTimeout: 5000 })

// Vite-injected build-time globals — defined in vite.config.ts, declared in
// vite-env.d.ts. Vitest doesn't run Vite's define plugin, so polyfill here.
;(globalThis as Record<string, unknown>).__APP_VERSION__ = "test"
;(globalThis as Record<string, unknown>).__APP_HASH__ = "testhash"

// localStorage polyfill (not available in Node.js jsdom without --localstorage-file)
const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = String(value)
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  },
  get length() {
    return Object.keys(localStorageStore).length
  },
  key: (n: number) => Object.keys(localStorageStore)[n] ?? null,
}
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

afterEach(() => {
  cleanup()
  localStorageMock.clear()
})

// Stub window.matchMedia (jsdom doesn't implement it)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Stub ResizeObserver (must be a class, not arrow fn, because Radix calls `new ResizeObserver`)
class MockResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe(_target: Element, _options?: ResizeObserverOptions) {}
  unobserve(_target: Element) {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Stub IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Stub scrollIntoView (not in jsdom)
Element.prototype.scrollIntoView = vi.fn()

// Silence console.warn in tests (Radix noisy)
vi.spyOn(console, "warn").mockImplementation(() => {})

// Stub indexedDB (jsdom doesn't implement it; used by offline-db.ts for draft persistence)
const indexedDBMock = {
  open: vi.fn().mockReturnValue({
    result: null,
    error: null,
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
  deleteDatabase: vi.fn(),
  databases: vi.fn().mockResolvedValue([]),
  cmp: vi.fn().mockReturnValue(0),
}
Object.defineProperty(globalThis, "indexedDB", {
  value: indexedDBMock,
  writable: true,
  configurable: true,
})
