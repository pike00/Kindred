import { AxiosError } from "axios"
import { describe, expect, it } from "vitest"
import { getInitials, handleError } from "../../utils"

describe("extractErrorMessage and handleError", () => {
  it("handles AxiosError by returning error message", () => {
    const mockCallback = (msg: string) => {
      expect(msg).toBe("Network Error")
    }

    const axiosErr = new AxiosError("Network Error")
    handleError.call(mockCallback, axiosErr)
  })

  it("handles error with array detail in body", () => {
    const mockCallback = (msg: string) => {
      expect(msg).toBe("Validation failed")
    }

    const err = {
      body: {
        detail: [{ msg: "Validation failed" }],
      },
    } as any

    handleError.call(mockCallback, err)
  })

  it("handles error with string detail in body", () => {
    const mockCallback = (msg: string) => {
      expect(msg).toBe("Invalid input")
    }

    const err = {
      body: {
        detail: "Invalid input",
      },
    } as any

    handleError.call(mockCallback, err)
  })

  it("returns default message when detail is missing", () => {
    const mockCallback = (msg: string) => {
      expect(msg).toBe("Something went wrong.")
    }

    const err = {
      body: {},
    } as any

    handleError.call(mockCallback, err)
  })

  it("handles error with empty array detail", () => {
    const mockCallback = (msg: string) => {
      expect(msg).toBe("Something went wrong.")
    }

    const err = {
      body: {
        detail: [],
      },
    } as any

    handleError.call(mockCallback, err)
  })

  it("handles error with null body", () => {
    const mockCallback = (msg: string) => {
      expect(msg).toBe("Something went wrong.")
    }

    const err = {
      body: null,
    } as any

    handleError.call(mockCallback, err)
  })

  it("handles error with undefined body", () => {
    const mockCallback = (msg: string) => {
      expect(msg).toBe("Something went wrong.")
    }

    const err = {} as any

    handleError.call(mockCallback, err)
  })

  it("calls the provided callback with error message", () => {
    let capturedMessage = ""
    const mockCallback = (msg: string) => {
      capturedMessage = msg
    }

    const err = {
      body: {
        detail: "Test error",
      },
    } as any

    handleError.call(mockCallback, err)
    expect(capturedMessage).toBe("Test error")
  })

  it("prioritizes array detail over string detail", () => {
    const mockCallback = (msg: string) => {
      expect(msg).toBe("Array error")
    }

    const err = {
      body: {
        detail: [{ msg: "Array error" }, { msg: "Second error" }],
      },
    } as any

    handleError.call(mockCallback, err)
  })
})

describe("getInitials", () => {
  it("returns initials from single word", () => {
    expect(getInitials("John")).toBe("J")
  })

  it("returns initials from two words", () => {
    expect(getInitials("John Doe")).toBe("JD")
  })

  it("returns initials from multiple words taking first two", () => {
    expect(getInitials("John Michael Doe")).toBe("JM")
  })

  it("handles empty string", () => {
    expect(getInitials("")).toBe("")
  })

  it("handles string with extra spaces", () => {
    expect(getInitials("  John   Doe  ")).toBe("JD")
  })

  it("converts lowercase to uppercase", () => {
    expect(getInitials("john doe")).toBe("JD")
  })

  it("handles mixed case", () => {
    expect(getInitials("jOhN dOe")).toBe("JD")
  })

  it("handles single word with multiple spaces", () => {
    expect(getInitials("John    ")).toBe("J")
  })

  it("handles names with special characters", () => {
    expect(getInitials("José María")).toBe("JM")
  })

  it("handles hyphenated names as single word", () => {
    expect(getInitials("Mary-Jane Watson")).toBe("MW")
  })

  it("returns empty string when only spaces", () => {
    expect(getInitials("   ")).toBe("")
  })

  it("handles unicode characters", () => {
    expect(getInitials("François Müller")).toBe("FM")
  })

  it("returns first letter when single character name", () => {
    expect(getInitials("A")).toBe("A")
  })

  it("handles three-word names correctly", () => {
    expect(getInitials("Martin Luther King")).toBe("ML")
  })

  it("handles names starting with lowercase letter", () => {
    expect(getInitials("andrew benson")).toBe("AB")
  })
})
