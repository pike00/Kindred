import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import useCustomToast from "../../hooks/useCustomToast"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("useCustomToast", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns object with success and error toast functions", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast, showErrorToast } = result.current

    expect(typeof showSuccessToast).toBe("function")
    expect(typeof showErrorToast).toBe("function")
  })

  it("calls toast.success with correct title and description", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    act(() => {
      showSuccessToast("Operation completed")
    })

    const { toast } = require("sonner")
    expect(toast.success).toHaveBeenCalledWith("Success!", {
      description: "Operation completed",
    })
  })

  it("calls toast.error with correct title and description", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showErrorToast } = result.current

    act(() => {
      showErrorToast("An error occurred")
    })

    const { toast } = require("sonner")
    expect(toast.error).toHaveBeenCalledWith("Something went wrong!", {
      description: "An error occurred",
    })
  })

  it("handles empty description for success toast", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    act(() => {
      showSuccessToast("")
    })

    const { toast } = require("sonner")
    expect(toast.success).toHaveBeenCalledWith("Success!", {
      description: "",
    })
  })

  it("handles empty description for error toast", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showErrorToast } = result.current

    act(() => {
      showErrorToast("")
    })

    const { toast } = require("sonner")
    expect(toast.error).toHaveBeenCalledWith("Something went wrong!", {
      description: "",
    })
  })

  it("handles long descriptions for success toast", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    const longDescription =
      "This is a very long description that contains multiple sentences and provides detailed information about the success of the operation. It may span multiple lines in the UI."

    act(() => {
      showSuccessToast(longDescription)
    })

    const { toast } = require("sonner")
    expect(toast.success).toHaveBeenCalledWith("Success!", {
      description: longDescription,
    })
  })

  it("handles long descriptions for error toast", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showErrorToast } = result.current

    const longDescription =
      "This is a detailed error message explaining what went wrong, why it happened, and what steps the user should take to resolve the issue."

    act(() => {
      showErrorToast(longDescription)
    })

    const { toast } = require("sonner")
    expect(toast.error).toHaveBeenCalledWith("Something went wrong!", {
      description: longDescription,
    })
  })

  it("handles special characters in description", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    const descriptionWithSpecialChars =
      "Success! !@#$%^&*()_+-=[]{}|;:',.<>?/~`"

    act(() => {
      showSuccessToast(descriptionWithSpecialChars)
    })

    const { toast } = require("sonner")
    expect(toast.success).toHaveBeenCalledWith("Success!", {
      description: descriptionWithSpecialChars,
    })
  })

  it("handles unicode characters in description", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showErrorToast } = result.current

    const unicodeDescription = "Error: 错误 🚨 问题 😞"

    act(() => {
      showErrorToast(unicodeDescription)
    })

    const { toast } = require("sonner")
    expect(toast.error).toHaveBeenCalledWith("Something went wrong!", {
      description: unicodeDescription,
    })
  })

  it("allows multiple consecutive success toasts", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    act(() => {
      showSuccessToast("First message")
    })

    act(() => {
      showSuccessToast("Second message")
    })

    const { toast } = require("sonner")
    expect(toast.success).toHaveBeenCalledTimes(2)
    expect(toast.success).toHaveBeenNthCalledWith(1, "Success!", {
      description: "First message",
    })
    expect(toast.success).toHaveBeenNthCalledWith(2, "Success!", {
      description: "Second message",
    })
  })

  it("allows multiple consecutive error toasts", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showErrorToast } = result.current

    act(() => {
      showErrorToast("Error 1")
    })

    act(() => {
      showErrorToast("Error 2")
    })

    const { toast } = require("sonner")
    expect(toast.error).toHaveBeenCalledTimes(2)
    expect(toast.error).toHaveBeenNthCalledWith(1, "Something went wrong!", {
      description: "Error 1",
    })
    expect(toast.error).toHaveBeenNthCalledWith(2, "Something went wrong!", {
      description: "Error 2",
    })
  })

  it("allows interleaved success and error toasts", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast, showErrorToast } = result.current

    act(() => {
      showSuccessToast("Success 1")
    })

    act(() => {
      showErrorToast("Error 1")
    })

    act(() => {
      showSuccessToast("Success 2")
    })

    const { toast } = require("sonner")
    expect(toast.success).toHaveBeenCalledTimes(2)
    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it("handles description with newlines", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    const descriptionWithNewlines = "Line 1\nLine 2\nLine 3"

    act(() => {
      showSuccessToast(descriptionWithNewlines)
    })

    const { toast } = require("sonner")
    expect(toast.success).toHaveBeenCalledWith("Success!", {
      description: descriptionWithNewlines,
    })
  })

  it("handles description with tabs", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showErrorToast } = result.current

    const descriptionWithTabs = "Item 1\tValue 1\nItem 2\tValue 2"

    act(() => {
      showErrorToast(descriptionWithTabs)
    })

    const { toast } = require("sonner")
    expect(toast.error).toHaveBeenCalledWith("Something went wrong!", {
      description: descriptionWithTabs,
    })
  })

  it("each hook instance has independent state", () => {
    const { result: result1 } = renderHook(() => useCustomToast())
    const { result: result2 } = renderHook(() => useCustomToast())

    const { toast } = require("sonner")

    act(() => {
      result1.current.showSuccessToast("Message 1")
    })

    act(() => {
      result2.current.showErrorToast("Message 2")
    })

    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it("always shows Success! title for success toast", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    const { toast } = require("sonner")

    act(() => {
      showSuccessToast("Custom description")
    })

    const [title, _options] = toast.success.mock.calls[0]
    expect(title).toBe("Success!")
  })

  it("always shows Something went wrong! title for error toast", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showErrorToast } = result.current

    const { toast } = require("sonner")

    act(() => {
      showErrorToast("Custom error description")
    })

    const [title, _options] = toast.error.mock.calls[0]
    expect(title).toBe("Something went wrong!")
  })

  it("passes description in options object", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    const { toast } = require("sonner")

    act(() => {
      showSuccessToast("Test description")
    })

    const [_title, options] = toast.success.mock.calls[0]
    expect(options).toHaveProperty("description")
    expect(options.description).toBe("Test description")
  })

  it("handles whitespace-only description", () => {
    const { result } = renderHook(() => useCustomToast())
    const { showSuccessToast } = result.current

    const { toast } = require("sonner")

    act(() => {
      showSuccessToast("   ")
    })

    expect(toast.success).toHaveBeenCalledWith("Success!", {
      description: "   ",
    })
  })
})
