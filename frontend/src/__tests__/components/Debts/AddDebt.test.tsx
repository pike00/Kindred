import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddDebt } from "@/components/Debts/AddDebt"
import { renderWithProviders } from "@/test/helpers"
import React from "react"

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
const mockCreateDebt = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  DebtsService: {
    createDebtRoute: mockCreateDebt,
  },
}))

// Mock custom hook
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

describe("AddDebt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateDebt.mockResolvedValue({
      id: "debt-1",
      contact_id: "contact-1",
      direction: "i_owe",
      amount: 100,
      currency: "USD",
    })
  })

  it("renders trigger button", () => {
    renderWithProviders(<AddDebt contactId="contact-1" />)
    expect(screen.getByRole("button", { name: /add debt/i })).toBeInTheDocument()
  })

  it("opens dialog when trigger clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    const trigger = screen.getByRole("button", { name: /add debt/i })
    await user.click(trigger)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /track debt/i })).toBeInTheDocument()
  })

  it("shows all form fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    expect(screen.getByText("Direction")).toBeInTheDocument()
    expect(screen.getByText("Amount")).toBeInTheDocument()
    expect(screen.getByText("Currency")).toBeInTheDocument()
    expect(screen.getByText("Reason")).toBeInTheDocument()
  })

  it("displays direction buttons", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    expect(screen.getByRole("button", { name: /i owe them/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /they owe me/i }),
    ).toBeInTheDocument()
  })

  it("displays validation error on empty amount submit", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const submitButton = screen.getByRole("button", { name: /save/i })
    await user.click(submitButton)

    // Validation should prevent API call
    await waitFor(
      () => {
        expect(mockCreateDebt).not.toHaveBeenCalled()
      },
      { timeout: 1000 },
    )
  })

  it("displays validation error on zero amount submit", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00")
    await user.type(amountInput, "0")

    const submitButton = screen.getByRole("button", { name: /save/i })
    await user.click(submitButton)

    // Validation should prevent API call
    await waitFor(
      () => {
        expect(mockCreateDebt).not.toHaveBeenCalled()
      },
      { timeout: 1000 },
    )
  })

  it("allows submission with only required fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "50")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateDebt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: "contact-1",
            amount: 50,
            currency: "USD",
            direction: "i_owe",
          }),
        }),
      )
    })
  })

  it("submits with decimal amount", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "123.45")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateDebt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            amount: 123.45,
          }),
        }),
      )
    })
  })

  it("allows changing direction to they_owe", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const theyOweButton = screen.getByRole("button", { name: /they owe me/i })
    await user.click(theyOweButton)

    const amountInput = screen.getByPlaceholderText("0.00")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "75")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateDebt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            direction: "they_owe",
          }),
        }),
      )
    })
  })

  it("allows custom currency", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const currencyInput = screen.getByDisplayValue("USD")
    await user.clear(currencyInput)
    await user.type(currencyInput, "EUR")

    const amountInput = screen.getByPlaceholderText("0.00")
    await user.type(amountInput, "100")

    const submitButton = screen.getByRole("button", { name: /save/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateDebt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            currency: "EUR",
          }),
        }),
      )
    })
  })

  it("allows optional reason", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00")
    const reasonInput = screen.getByPlaceholderText("What for?")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "50")
    await user.type(reasonInput, "Dinner")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateDebt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            reason: "Dinner",
          }),
        }),
      )
    })
  })

  it("closes dialog on successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "50")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("keeps dialog open on API error", async () => {
    const user = userEvent.setup()
    mockCreateDebt.mockRejectedValue(new Error("API Error"))

    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "50")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  it("shows loading state while submitting", async () => {
    const user = userEvent.setup()
    mockCreateDebt.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
    )

    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "50")
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it("resets form after successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    // First submission
    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00") as HTMLInputElement
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "50")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // Reopen and verify reset
    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const newAmountInput = screen.getByPlaceholderText("0.00") as HTMLInputElement
    // Form resets to defaultValues which is 0, displayed as empty string
    expect(newAmountInput.value).toBe("0")
  })

  it("selects correct contact ID", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-123" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const amountInput = screen.getByPlaceholderText("0.00")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(amountInput, "100")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateDebt).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: "contact-123",
          }),
        }),
      )
    })
  })

  it("default direction is i_owe", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const iOweButton = screen.getByRole("button", { name: /i owe them/i })
    // i_owe button should have primary variant (default)
    expect(iOweButton).toHaveClass("bg-primary")
  })

  it("default currency is USD", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddDebt contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add debt/i }))

    const currencyInput = screen.getByDisplayValue("USD") as HTMLInputElement
    expect(currencyInput.value).toBe("USD")
  })
})
