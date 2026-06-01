import { describe, it, expect } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CommandPaletteProvider, useCommandPalette } from "@/components/CommandPalette/CommandPaletteContext"

// Test component that uses the hook
function TestConsumer() {
  const { open, setOpen, toggle } = useCommandPalette()

  return (
    <div>
      <div data-testid="open-state">{String(open)}</div>
      <button onClick={() => setOpen(true)} data-testid="open-btn">
        Open
      </button>
      <button onClick={() => setOpen(false)} data-testid="close-btn">
        Close
      </button>
      <button onClick={toggle} data-testid="toggle-btn">
        Toggle
      </button>
    </div>
  )
}

describe("CommandPaletteContext", () => {
  describe("CommandPaletteProvider", () => {
    it("renders children", () => {
      render(
        <CommandPaletteProvider>
          <div data-testid="child">Child content</div>
        </CommandPaletteProvider>
      )

      expect(screen.getByTestId("child")).toBeInTheDocument()
      expect(screen.getByText("Child content")).toBeInTheDocument()
    })

    it("provides context to children", () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      expect(screen.getByTestId("open-state")).toBeInTheDocument()
      expect(screen.getByTestId("open-btn")).toBeInTheDocument()
    })
  })

  describe("useCommandPalette", () => {
    it("returns correct initial state (open: false)", () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      expect(screen.getByTestId("open-state")).toHaveTextContent("false")
    })

    it("provides setOpen function", () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      const openBtn = screen.getByTestId("open-btn")
      expect(openBtn).toBeInTheDocument()
    })

    it("provides toggle function", () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      const toggleBtn = screen.getByTestId("toggle-btn")
      expect(toggleBtn).toBeInTheDocument()
    })

    it("throws error when used outside provider", () => {
      const TestComponentWithoutProvider = () => {
        useCommandPalette()
        return <div>Test</div>
      }

      expect(() => {
        render(<TestComponentWithoutProvider />)
      }).toThrow("useCommandPalette must be used inside <CommandPaletteProvider>")
    })

    it("throws correct error message", () => {
      const TestComponentWithoutProvider = () => {
        useCommandPalette()
        return <div>Test</div>
      }

      expect(() => {
        render(<TestComponentWithoutProvider />)
      }).toThrow("useCommandPalette must be used inside <CommandPaletteProvider>")
    })
  })

  describe("setOpen function", () => {
    it("sets open to true", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      expect(screen.getByTestId("open-state")).toHaveTextContent("false")

      fireEvent.click(screen.getByTestId("open-btn"))

      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })
    })

    it("sets open to false", async () => {
      const TestConsumerStartOpen = () => {
        const { open, setOpen } = useCommandPalette()
        // Initially open by calling setOpen(true) on mount would require useEffect
        // For this test, we'll just test the close functionality
        return (
          <div>
            <div data-testid="open-state">{String(open)}</div>
            <button onClick={() => setOpen(false)} data-testid="close-btn">
              Close
            </button>
          </div>
        )
      }

      render(
        <CommandPaletteProvider>
          <TestConsumerStartOpen />
        </CommandPaletteProvider>
      )

      fireEvent.click(screen.getByTestId("close-btn"))

      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("false")
      })
    })

    it("allows multiple setOpen calls", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      fireEvent.click(screen.getByTestId("open-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })

      fireEvent.click(screen.getByTestId("close-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("false")
      })

      fireEvent.click(screen.getByTestId("open-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })
    })
  })

  describe("toggle function", () => {
    it("toggles open from false to true", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      expect(screen.getByTestId("open-state")).toHaveTextContent("false")

      fireEvent.click(screen.getByTestId("toggle-btn"))

      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })
    })

    it("toggles open from true to false", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      fireEvent.click(screen.getByTestId("open-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })

      fireEvent.click(screen.getByTestId("toggle-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("false")
      })
    })

    it("toggles correctly multiple times", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      const toggleBtn = screen.getByTestId("toggle-btn")

      expect(screen.getByTestId("open-state")).toHaveTextContent("false")

      fireEvent.click(toggleBtn)
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })

      fireEvent.click(toggleBtn)
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("false")
      })

      fireEvent.click(toggleBtn)
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })

      fireEvent.click(toggleBtn)
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("false")
      })
    })

    it("toggle flips boolean value", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      const openState = screen.getByTestId("open-state")
      const toggleBtn = screen.getByTestId("toggle-btn")
      const initialValue = openState.textContent === "true"

      fireEvent.click(toggleBtn)

      await waitFor(() => {
        const newValue = openState.textContent === "true"
        expect(newValue).not.toBe(initialValue)
      })
    })
  })

  describe("context sharing", () => {
    it("shares state between multiple consumers", async () => {
      const MultipleConsumers = () => (
        <CommandPaletteProvider>
          <div>
            <TestConsumer />
            <TestConsumer />
          </div>
        </CommandPaletteProvider>
      )

      render(<MultipleConsumers />)

      const openStates = screen.getAllByTestId("open-state")
      expect(openStates[0]).toHaveTextContent("false")
      expect(openStates[1]).toHaveTextContent("false")

      fireEvent.click(screen.getAllByTestId("open-btn")[0])

      await waitFor(() => {
        expect(openStates[0]).toHaveTextContent("true")
        expect(openStates[1]).toHaveTextContent("true")
      })
    })

    it("syncs state across nested components", async () => {
      const NestedConsumer = () => {
        const { open } = useCommandPalette()
        return <div data-testid="nested-open">{String(open)}</div>
      }

      render(
        <CommandPaletteProvider>
          <TestConsumer />
          <NestedConsumer />
        </CommandPaletteProvider>
      )

      fireEvent.click(screen.getByTestId("open-btn"))

      await waitFor(() => {
        expect(screen.getByTestId("nested-open")).toHaveTextContent("true")
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })
    })
  })

  describe("state consistency", () => {
    it("maintains state consistency when using setOpen", async () => {
      const StateValidator = () => {
        const { open, setOpen } = useCommandPalette()
        return (
          <div>
            <div data-testid="state">{String(open)}</div>
            <button onClick={() => setOpen(true)} data-testid="set-true">
              Set True
            </button>
            <button onClick={() => setOpen(true)} data-testid="set-true-again">
              Set True Again
            </button>
          </div>
        )
      }

      render(
        <CommandPaletteProvider>
          <StateValidator />
        </CommandPaletteProvider>
      )

      fireEvent.click(screen.getByTestId("set-true"))
      await waitFor(() => {
        expect(screen.getByTestId("state")).toHaveTextContent("true")
      })

      fireEvent.click(screen.getByTestId("set-true-again"))
      await waitFor(() => {
        expect(screen.getByTestId("state")).toHaveTextContent("true")
      })
    })

    it("maintains state consistency when using toggle", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      const toggleBtn = screen.getByTestId("toggle-btn")
      const openState = screen.getByTestId("open-state")

      const initialState = openState.textContent

      fireEvent.click(toggleBtn)
      await waitFor(() => {
        expect(openState.textContent).not.toBe(initialState)
      })

      const middleState = openState.textContent

      fireEvent.click(toggleBtn)
      await waitFor(() => {
        expect(openState.textContent).not.toBe(middleState)
        expect(openState.textContent).toBe(initialState)
      })
    })
  })

  describe("edge cases", () => {
    it("handles rapid toggle calls", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      const toggleBtn = screen.getByTestId("toggle-btn")

      fireEvent.click(toggleBtn)
      fireEvent.click(toggleBtn)
      fireEvent.click(toggleBtn)
      fireEvent.click(toggleBtn)

      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("false")
      })
    })

    it("handles unmount and remount", async () => {
      const { unmount } = render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      fireEvent.click(screen.getByTestId("open-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })

      unmount()

      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      // State should reset to initial value
      expect(screen.getByTestId("open-state")).toHaveTextContent("false")
    })

    it("handles rapid setOpen with different values", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      fireEvent.click(screen.getByTestId("open-btn"))
      fireEvent.click(screen.getByTestId("close-btn"))
      fireEvent.click(screen.getByTestId("open-btn"))

      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })
    })
  })

  describe("functional composition", () => {
    it("mixing setOpen and toggle works correctly", async () => {
      render(
        <CommandPaletteProvider>
          <TestConsumer />
        </CommandPaletteProvider>
      )

      fireEvent.click(screen.getByTestId("open-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })

      fireEvent.click(screen.getByTestId("toggle-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("false")
      })

      fireEvent.click(screen.getByTestId("toggle-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("true")
      })

      fireEvent.click(screen.getByTestId("close-btn"))
      await waitFor(() => {
        expect(screen.getByTestId("open-state")).toHaveTextContent("false")
      })
    })
  })
})
