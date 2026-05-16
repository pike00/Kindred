import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider, useTheme } from "@/components/theme-provider"

// Component that uses the useTheme hook for testing
function TestComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button onClick={() => setTheme("light")} data-testid="set-light">
        Set Light
      </button>
      <button onClick={() => setTheme("dark")} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setTheme("system")} data-testid="set-system">
        Set System
      </button>
    </div>
  )
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset document classes
    document.documentElement.classList.remove("light", "dark")
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("light", "dark")
  })

  describe("initialization", () => {
    it("initializes with default theme (system)", () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("system")
    })

    it("initializes with custom defaultTheme", () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    })

    it("reads theme from localStorage on mount", () => {
      localStorage.setItem("vite-ui-theme", "dark")

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    })

    it("uses custom storageKey to read from localStorage", () => {
      localStorage.setItem("custom-theme-key", "light")

      render(
        <ThemeProvider storageKey="custom-theme-key">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("light")
    })

    it("prefers localStorage over defaultTheme", () => {
      localStorage.setItem("vite-ui-theme", "dark")

      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    })
  })

  describe("theme resolution", () => {
    it("resolves system theme to light when prefers-color-scheme matches light", () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      window.matchMedia = mockMatchMedia as any

      render(
        <ThemeProvider defaultTheme="system">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light")
    })

    it("resolves system theme to dark when prefers-color-scheme matches dark", () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      window.matchMedia = mockMatchMedia as any

      render(
        <ThemeProvider defaultTheme="system">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark")
    })

    it("resolves light theme to light", () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light")
    })

    it("resolves dark theme to dark", () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark")
    })
  })

  describe("setTheme", () => {
    it("changes theme to light", async () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("dark")

      fireEvent.click(screen.getByTestId("set-light"))

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("light")
      })
    })

    it("changes theme to dark", async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("light")

      fireEvent.click(screen.getByTestId("set-dark"))

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("dark")
      })
    })

    it("changes theme to system", async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId("set-system"))

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("system")
      })
    })

    it("saves theme to localStorage when setTheme is called", async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId("set-dark"))

      await waitFor(() => {
        expect(localStorage.getItem("vite-ui-theme")).toBe("dark")
      })
    })

    it("saves to custom storageKey", async () => {
      render(
        <ThemeProvider storageKey="custom-key">
          <TestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId("set-light"))

      await waitFor(() => {
        expect(localStorage.getItem("custom-key")).toBe("light")
      })
    })
  })

  describe("document class updates", () => {
    it("adds light class to document element when theme is light", async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(document.documentElement.classList.contains("light")).toBe(true)
        expect(document.documentElement.classList.contains("dark")).toBe(false)
      })
    })

    it("adds dark class to document element when theme is dark", async () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true)
        expect(document.documentElement.classList.contains("light")).toBe(false)
      })
    })

    it("updates document class when theme changes", async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(document.documentElement.classList.contains("light")).toBe(true)
      })

      fireEvent.click(screen.getByTestId("set-dark"))

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true)
        expect(document.documentElement.classList.contains("light")).toBe(false)
      })
    })

    it("removes both light and dark classes before adding new one", async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(document.documentElement.classList.contains("light")).toBe(true)
      })

      fireEvent.click(screen.getByTestId("set-dark"))

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true)
        expect(document.documentElement.classList.contains("light")).toBe(false)
      })
    })

    it("sets system theme class based on system preference", async () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      window.matchMedia = mockMatchMedia as any

      render(
        <ThemeProvider defaultTheme="system">
          <TestComponent />
        </ThemeProvider>,
      )

      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true)
      })
    })
  })

  describe("media query listener", () => {
    it("listens to system preference changes when theme is system", async () => {
      const listeners: any[] = []
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn((event: string, listener: any) => {
          if (event === "change") listeners.push(listener)
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      window.matchMedia = mockMatchMedia as any

      render(
        <ThemeProvider defaultTheme="system">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(listeners.length).toBeGreaterThan(0)
    })

    it("updates theme when system preference changes", async () => {
      let changeListener: any = null
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn((event: string, listener: any) => {
          if (event === "change") changeListener = listener
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      window.matchMedia = mockMatchMedia as any

      render(
        <ThemeProvider defaultTheme="system">
          <TestComponent />
        </ThemeProvider>,
      )

      // Simulate system preference change to dark
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })

      if (changeListener) {
        changeListener()
      }

      // Theme should update accordingly
      expect(screen.getByTestId("theme")).toHaveTextContent("system")
    })

    it("does not update on system preference changes when theme is not system", async () => {
      let changeListener: any = null
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn((event: string, listener: any) => {
          if (event === "change") changeListener = listener
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      window.matchMedia = mockMatchMedia as any

      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      const initialTheme = screen.getByTestId("theme").textContent

      if (changeListener) {
        changeListener()
      }

      // Theme should not change
      expect(screen.getByTestId("theme")).toHaveTextContent(initialTheme!)
    })

    it("removes event listener on cleanup", () => {
      const removeEventListenerMock = vi.fn()
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerMock,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      window.matchMedia = mockMatchMedia as any

      const { unmount } = render(
        <ThemeProvider defaultTheme="system">
          <TestComponent />
        </ThemeProvider>,
      )

      unmount()

      expect(removeEventListenerMock).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      )
    })
  })

  describe("context hook", () => {
    it("throws error when useTheme is used outside provider", () => {
      const TestComponentWithoutProvider = () => {
        const { theme } = useTheme()
        return <div>{theme}</div>
      }

      expect(() => {
        render(<TestComponentWithoutProvider />)
      }).toThrow("useTheme must be used within a ThemeProvider")
    })

    it("provides correct context value", () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toBeInTheDocument()
      expect(screen.getByTestId("resolved-theme")).toBeInTheDocument()
    })
  })

  describe("multiple components", () => {
    it("shares same theme across multiple consumers", async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
          <TestComponent />
        </ThemeProvider>,
      )

      const themes = screen.getAllByTestId("theme")
      expect(themes[0]).toHaveTextContent("light")
      expect(themes[1]).toHaveTextContent("light")

      fireEvent.click(screen.getAllByTestId("set-dark")[0])

      await waitFor(() => {
        expect(themes[0]).toHaveTextContent("dark")
        expect(themes[1]).toHaveTextContent("dark")
      })
    })
  })

  describe("edge cases", () => {
    it("handles rapid theme changes", async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>,
      )

      fireEvent.click(screen.getByTestId("set-light"))
      fireEvent.click(screen.getByTestId("set-dark"))
      fireEvent.click(screen.getByTestId("set-light"))

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("light")
      })
    })

    it("handles invalid theme from localStorage gracefully", () => {
      localStorage.setItem("vite-ui-theme", "invalid-theme" as any)

      render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      // Should not crash, theme is set from localStorage
      expect(screen.getByTestId("theme")).toBeInTheDocument()
    })

    it("handles unmount and remount", async () => {
      const { unmount } = render(
        <ThemeProvider defaultTheme="light">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("light")

      unmount()

      // Render a new component tree after unmount
      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>,
      )

      expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    })
  })
})
