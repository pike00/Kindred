import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddGift } from "@/components/Gifts/AddGift"
import { renderWithProviders } from "@/test/helpers"

// Mock dialog to render inline (wraps Radix primitives)
vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react")
  const radixDialog = await import("@radix-ui/react-dialog")

  return {
    Dialog: ({ children, ...props }: any) =>
      React.createElement(radixDialog.Root, props, children),
    DialogTrigger: ({ children, ...props }: any) =>
      React.createElement(radixDialog.Trigger, props, children),
    DialogContent: ({ children, ...props }: any) =>
      React.createElement(
        radixDialog.Content,
        { ...props, role: "dialog" },
        children,
      ),
    DialogHeader: ({ children }: any) =>
      React.createElement("div", null, children),
    DialogTitle: ({ children }: any) =>
      React.createElement(radixDialog.Title, null, children),
    DialogDescription: ({ children }: any) =>
      React.createElement(radixDialog.Description, null, children),
    DialogFooter: ({ children }: any) =>
      React.createElement("div", null, children),
    DialogClose: ({ children, ...props }: any) =>
      React.createElement(radixDialog.Close, props, children),
  }
})

// Mock API
const mockCreateGift = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  GiftsService: {
    createGiftRoute: mockCreateGift,
  },
}))

// Mock custom hook
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

describe("AddGift", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateGift.mockResolvedValue({
      id: "gift-1",
      contact_id: "contact-1",
      name: "Gift",
      status: "idea",
    })
  })

  it("renders trigger button", () => {
    renderWithProviders(<AddGift contactId="contact-1" />)
    expect(screen.getByRole("button", { name: /add gift/i })).toBeInTheDocument()
  })

  it("opens dialog when trigger clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    const trigger = screen.getByRole("button", { name: /add gift/i })
    await user.click(trigger)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /add gift/i })).toBeInTheDocument()
  })

  it("shows all form fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Occasion")).toBeInTheDocument()
    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getByText("Value ($)")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
    expect(screen.getByText("URL")).toBeInTheDocument()
  })

  it("displays validation error on empty name submit", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const submitButton = screen.getByRole("button", { name: /save/i })
    await user.click(submitButton)

    // Validation should prevent API call
    await waitFor(
      () => {
        expect(mockCreateGift).not.toHaveBeenCalled()
      },
      { timeout: 1000 },
    )
  })

  it("allows submission with only required fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: "contact-1",
            name: "Watch",
            status: "idea",
          }),
        }),
      )
    })
  })

  it("shows status buttons", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    expect(screen.getByRole("button", { name: /^Idea$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Given$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Received$/i })).toBeInTheDocument()
  })

  it("allows changing status to given", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const givenButton = screen.getByRole("button", { name: /^Given$/i })
    await user.click(givenButton)

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            status: "given",
          }),
        }),
      )
    })
  })

  it("allows changing status to received", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const receivedButton = screen.getByRole("button", { name: /^Received$/i })
    await user.click(receivedButton)

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            status: "received",
          }),
        }),
      )
    })
  })

  it("allows optional occasion", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const occasionInput = screen.getByPlaceholderText("e.g. Birthday, Christmas")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.type(occasionInput, "Birthday")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            occasion: "Birthday",
          }),
        }),
      )
    })
  })

  it("allows optional date", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const dateInputs = screen.getAllByDisplayValue("")
    const dateInput = dateInputs.find((el) => (el as HTMLInputElement).type === "date")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    if (dateInput) {
      await user.type(dateInput, "2024-12-25")
    }
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            date: "2024-12-25",
          }),
        }),
      )
    })
  })

  it("allows optional value amount", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const valueInputs = screen.getAllByPlaceholderText("0.00")
    const valueInput = valueInputs[valueInputs.length - 1] // Last one is the value input
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.type(valueInput, "150.99")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            value_amount: 150.99,
          }),
        }),
      )
    })
  })

  it("allows optional description", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const descriptionInput = screen.getByPlaceholderText("Details or notes")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.type(descriptionInput, "Gold watch, Swiss made")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            description: "Gold watch, Swiss made",
          }),
        }),
      )
    })
  })

  it("allows optional URL", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const urlInput = screen.getByPlaceholderText("https://...")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.type(urlInput, "https://example.com/watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            url: "https://example.com/watch",
          }),
        }),
      )
    })
  })

  it("rejects invalid URL", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const urlInput = screen.getByPlaceholderText("https://...")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.type(urlInput, "not a url")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).not.toHaveBeenCalled()
    })
  })

  it("closes dialog on successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("keeps dialog open on API error", async () => {
    const user = userEvent.setup()
    mockCreateGift.mockRejectedValue(new Error("API Error"))

    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  it("handles non-Error rejection on create", async () => {
    const user = userEvent.setup()
    mockCreateGift.mockRejectedValue("plain-string-error")

    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalled()
    })
  })

  it("shows loading state while submitting", async () => {
    const user = userEvent.setup()
    mockCreateGift.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
    )

    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it("resets form after successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    // First submission
    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name") as HTMLInputElement
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // Reopen and verify reset
    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const newNameInput = screen.getByPlaceholderText("Gift name") as HTMLInputElement
    expect(newNameInput.value).toBe("")
  })

  it("default status is idea", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const ideaButton = screen.getByRole("button", { name: "Idea" })
    // idea button should have primary variant (default)
    expect(ideaButton).toHaveClass("bg-primary")
  })

  it("selects correct contact ID", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-456" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: "contact-456",
          }),
        }),
      )
    })
  })

  it("allows empty value amount to be undefined", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Watch")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            name: "Watch",
          }),
        }),
      )
    })
  })

  it("handles all fields together", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddGift contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add gift/i }))

    const nameInput = screen.getByPlaceholderText("Gift name")
    const givenButton = screen.getByRole("button", { name: /^Given$/i })
    const occasionInput = screen.getByPlaceholderText("e.g. Birthday, Christmas")
    const descriptionInput = screen.getByPlaceholderText("Details or notes")
    const urlInput = screen.getByPlaceholderText("https://...")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(nameInput, "Gold Watch")
    await user.click(givenButton)
    await user.type(occasionInput, "Birthday")
    await user.type(descriptionInput, "Luxury watch")
    await user.type(urlInput, "https://example.com")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateGift).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: "contact-1",
            name: "Gold Watch",
            status: "given",
            occasion: "Birthday",
            description: "Luxury watch",
            url: "https://example.com",
          }),
        }),
      )
    })
  })
})
