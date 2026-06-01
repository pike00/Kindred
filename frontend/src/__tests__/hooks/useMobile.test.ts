import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useIsMobile } from "../../hooks/useMobile"

describe("useIsMobile", () => {
  let matchMediaMock: any
  let addEventListenerSpy: any
  let removeEventListenerSpy: any

  beforeEach(() => {
    addEventListenerSpy = vi.fn()
    removeEventListenerSpy = vi.fn()

    matchMediaMock = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    }))

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMediaMock,
    })

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns false when innerWidth is >= 768 (desktop)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns true when innerWidth is < 768 (mobile)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    })

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("registers change event listener on matchMedia", () => {
    renderHook(() => useIsMobile())

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    )
  })

  it("unregisters event listener on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    )
  })

  it("updates to true when resizing to mobile", () => {
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      })

      const callback = addEventListenerSpy.mock.calls[0][1]
      callback()
    })

    expect(result.current).toBe(true)
  })

  it("updates to false when resizing to desktop", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      })

      const callback = addEventListenerSpy.mock.calls[0][1]
      callback()
    })

    expect(result.current).toBe(false)
  })

  it("uses correct breakpoint of 768px", () => {
    renderHook(() => useIsMobile())

    const query = matchMediaMock.mock.calls[0][0]
    expect(query).toBe("(max-width: 767px)")
  })

  it("returns false at exactly 768px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns true at 767px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 767,
    })

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("handles multiple re-renders correctly", () => {
    const { result, rerender } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    rerender()

    expect(result.current).toBe(false)
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1)
  })

  it("handles rapid resize events", () => {
    const { result } = renderHook(() => useIsMobile())

    const callback = addEventListenerSpy.mock.calls[0][1]

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      })
      callback()
    })

    expect(result.current).toBe(true)

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      })
      callback()
    })

    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 600,
      })
      callback()
    })

    expect(result.current).toBe(true)
  })

  it("initializes with correct mobile state", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("initializes with correct desktop state", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("handles small phone sizes", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 320,
    })

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("handles large desktop sizes", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 2560,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("handles tablet size at exactly 768px as desktop", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("handles tablet size just below breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 767,
    })

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("coerces to boolean with !! operator", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useIsMobile())
    expect(typeof result.current).toBe("boolean")
    expect(result.current).toBe(false)
  })

  it("handles state initialization before first render", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    })

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it("listener receives correct callback on change event", () => {
    const { result } = renderHook(() => useIsMobile())

    const onChange = addEventListenerSpy.mock.calls[0][1]

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    })

    act(() => {
      onChange()
    })

    expect(result.current).toBe(true)
  })

  it("removes same listener that was added", () => {
    renderHook(() => useIsMobile())

    renderHook(() => useIsMobile()).unmount()

    const removedCallback = removeEventListenerSpy.mock.calls[0]?.[1]

    expect(removedCallback).toBeDefined()
  })
})
