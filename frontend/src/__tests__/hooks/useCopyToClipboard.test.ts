import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard"

describe("useCopyToClipboard", () => {
  let clipboardSpy: any
  let consoleWarnSpy: any

  beforeEach(() => {
    vi.useFakeTimers()
    clipboardSpy = {
      writeText: vi.fn(),
    }
    Object.assign(navigator, {
      clipboard: clipboardSpy,
    })
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    consoleWarnSpy.mockRestore()
  })

  it("returns initial state with null copiedText", () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [copiedText, _copy] = result.current
    expect(copiedText).toBeNull()
  })

  it("successfully copies text to clipboard", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    clipboardSpy.writeText.mockResolvedValue(undefined)

    let success = false
    await act(async () => {
      success = await copy("Hello World")
    })

    expect(success).toBe(true)
    expect(clipboardSpy.writeText).toHaveBeenCalledWith("Hello World")
  })

  it("sets copiedText state after successful copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    clipboardSpy.writeText.mockResolvedValue(undefined)

    await act(async () => {
      await copy("Test Text")
    })

    expect(result.current[0]).toBe("Test Text")
  })

  it("clears copiedText state after 2 seconds", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    clipboardSpy.writeText.mockResolvedValue(undefined)

    await act(async () => {
      await copy("Temporary Text")
    })

    expect(result.current[0]).toBe("Temporary Text")

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current[0]).toBeNull()
  })

  it("returns false when clipboard is not available", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: null,
      writable: true,
    })

    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    let success = false
    await act(async () => {
      success = await copy("Text")
    })

    expect(success).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalledWith("Clipboard not supported")
  })

  it("returns false when writeText throws error", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    const testError = new Error("Copy failed")
    clipboardSpy.writeText.mockRejectedValue(testError)

    let success = false
    await act(async () => {
      success = await copy("Text")
    })

    expect(success).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalledWith("Copy failed", testError)
  })

  it("clears copiedText when copy fails", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    clipboardSpy.writeText.mockRejectedValue(new Error("Copy error"))

    await act(async () => {
      await copy("Text")
    })

    expect(result.current[0]).toBeNull()
  })

  it("handles empty string copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    clipboardSpy.writeText.mockResolvedValue(undefined)

    let success = false
    await act(async () => {
      success = await copy("")
    })

    expect(success).toBe(true)
    expect(result.current[0]).toBe("")
    expect(clipboardSpy.writeText).toHaveBeenCalledWith("")
  })

  it("handles consecutive copy calls", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    clipboardSpy.writeText.mockResolvedValue(undefined)

    await act(async () => {
      await copy("First")
    })

    expect(result.current[0]).toBe("First")

    await act(async () => {
      await copy("Second")
    })

    expect(result.current[0]).toBe("Second")
  })

  it("handles long text copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    const longText =
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    clipboardSpy.writeText.mockResolvedValue(undefined)

    let success = false
    await act(async () => {
      success = await copy(longText)
    })

    expect(success).toBe(true)
    expect(result.current[0]).toBe(longText)
  })

  it("handles special characters in text", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    const specialText = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`"
    clipboardSpy.writeText.mockResolvedValue(undefined)

    await act(async () => {
      await copy(specialText)
    })

    expect(result.current[0]).toBe(specialText)
    expect(clipboardSpy.writeText).toHaveBeenCalledWith(specialText)
  })

  it("handles unicode characters in text", async () => {
    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    const unicodeText = "Hello 👋 World 🌍 Café ☕"
    clipboardSpy.writeText.mockResolvedValue(undefined)

    await act(async () => {
      await copy(unicodeText)
    })

    expect(result.current[0]).toBe(unicodeText)
  })

  it("returns false when clipboard property is undefined", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
    })

    const { result } = renderHook(() => useCopyToClipboard())
    const [_copiedText, copy] = result.current

    let success = false
    await act(async () => {
      success = await copy("Text")
    })

    expect(success).toBe(false)
    expect(consoleWarnSpy).toHaveBeenCalledWith("Clipboard not supported")
  })

  it("each hook instance has independent state", async () => {
    const { result: result1 } = renderHook(() => useCopyToClipboard())
    const { result: result2 } = renderHook(() => useCopyToClipboard())

    clipboardSpy.writeText.mockResolvedValue(undefined)

    await act(async () => {
      await result1.current[1]("Text1")
    })

    expect(result1.current[0]).toBe("Text1")
    expect(result2.current[0]).toBeNull()
  })

  it("clears clipboard state independent of other instances", async () => {
    const { result: result1 } = renderHook(() => useCopyToClipboard())
    const { result: result2 } = renderHook(() => useCopyToClipboard())

    clipboardSpy.writeText.mockResolvedValue(undefined)

    await act(async () => {
      await result1.current[1]("Text1")
    })

    await act(async () => {
      await result2.current[1]("Text2")
    })

    expect(result1.current[0]).toBe("Text1")
    expect(result2.current[0]).toBe("Text2")

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result1.current[0]).toBeNull()
    expect(result2.current[0]).toBeNull()
  })
})
