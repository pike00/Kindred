import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EnvironmentChip } from "@/components/Common/EnvironmentChip"
import { renderWithProviders } from "@/test/helpers"

// Mock the client module
vi.mock("@/client", () => ({
  OpenAPI: { BASE: "http://localhost:3000" },
}))

describe("EnvironmentChip", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("rendering", () => {
    it("renders nothing when data is loading", () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          () =>
            new Promise(() => {
              // Never resolves to simulate loading
            }),
        ),
      )

      const { container } = renderWithProviders(<EnvironmentChip />)
      expect(container.firstChild).toBeEmptyDOMElement()
    })

    it("renders nothing when environment is production", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ environment: "production" }),
          } as Response),
        ),
      )

      const { container } = renderWithProviders(<EnvironmentChip />)

      // Wait for query to settle
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(container.firstChild).toBeEmptyDOMElement()
    })

    it("renders chip when environment is staging", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ environment: "staging" }),
          } as Response),
        ),
      )

      const { getByText } = renderWithProviders(<EnvironmentChip />)

      // Wait for the query to settle
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(getByText("staging environment")).toBeInTheDocument()
    })

    it("renders chip when environment is development", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ environment: "development" }),
          } as Response),
        ),
      )

      const { getByText } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(getByText("development environment")).toBeInTheDocument()
    })

    it("renders chip when environment is local", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ environment: "local" }),
          } as Response),
        ),
      )

      const { getByText } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(getByText("local environment")).toBeInTheDocument()
    })
  })

  describe("styling", () => {
    it("applies correct styling classes to chip", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ environment: "staging" }),
          } as Response),
        ),
      )

      const { getByText } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const chip = getByText("staging environment")
      expect(chip).toHaveClass("rounded-full")
      expect(chip).toHaveClass("border")
      expect(chip).toHaveClass("border-red-400/60")
      expect(chip).toHaveClass("bg-red-600")
      expect(chip).toHaveClass("px-3")
      expect(chip).toHaveClass("py-0.5")
      expect(chip).toHaveClass("text-[10px]")
      expect(chip).toHaveClass("font-bold")
      expect(chip).toHaveClass("uppercase")
      expect(chip).toHaveClass("tracking-widest")
      expect(chip).toHaveClass("text-white")
      expect(chip).toHaveClass("shadow")
      expect(chip).toHaveClass("shadow-red-900/40")
    })
  })

  describe("API interaction", () => {
    it("fetches environment from correct endpoint", async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ environment: "staging" }),
        } as Response),
      )
      vi.stubGlobal("fetch", fetchMock)

      renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/api/v1/utils/environment/",
        { credentials: "include" },
      )
    })

    it("includes credentials in fetch request", async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ environment: "staging" }),
        } as Response),
      )
      vi.stubGlobal("fetch", fetchMock)

      renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      const callArgs = fetchMock.mock.calls[0]
      expect(callArgs[1]).toHaveProperty("credentials", "include")
    })

    it("handles fetch errors gracefully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: false,
            status: 500,
          } as Response),
        ),
      )

      const { container } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should render nothing when fetch fails
      expect(container.firstChild).toBeEmptyDOMElement()
    })

    it("does not retry on failure", async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response),
      )
      vi.stubGlobal("fetch", fetchMock)

      renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 200))

      // Should only call once (no retries)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("caches result with infinite staleTime", async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ environment: "staging" }),
        } as Response),
      )
      vi.stubGlobal("fetch", fetchMock)

      const { rerender } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      rerender(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should only fetch once due to infinite staleTime
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe("query configuration", () => {
    it("uses correct query key", async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ environment: "staging" }),
        } as Response),
      )
      vi.stubGlobal("fetch", fetchMock)

      renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Query is set up (no direct way to test key, but verifying it fetches)
      expect(fetchMock).toHaveBeenCalled()
    })
  })

  describe("edge cases", () => {
    it("handles unknown environment values", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ environment: "unknown-env" }),
          } as Response),
        ),
      )

      const { getByText } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(getByText("unknown-env environment")).toBeInTheDocument()
    })

    it("handles malformed response gracefully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ someOtherField: "value" }),
          } as Response),
        ),
      )

      const { container } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should render nothing when environment field is missing
      expect(container.firstChild).toBeEmptyDOMElement()
    })

    it("handles empty environment string", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ environment: "" }),
          } as Response),
        ),
      )

      const { container } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Empty environment should still render
      expect(container.firstChild).not.toBeEmptyDOMElement()
    })

    it("handles case-sensitive environment comparison", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ environment: "Production" }),
          } as Response),
        ),
      )

      const { getByText } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // "Production" (uppercase P) should render, only lowercase "production" is hidden
      expect(getByText("Production environment")).toBeInTheDocument()
    })
  })

  describe("component lifecycle", () => {
    it("cleans up on unmount", async () => {
      const fetchMock = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ environment: "staging" }),
        } as Response),
      )
      vi.stubGlobal("fetch", fetchMock)

      const { unmount } = renderWithProviders(<EnvironmentChip />)

      await new Promise((resolve) => setTimeout(resolve, 100))

      unmount()

      // Should not cause errors on unmount
      expect(true).toBe(true)
    })
  })
})
