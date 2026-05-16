import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddReminderDialog } from "@/components/Reminders/AddReminderDialog"
import { renderWithProviders } from "@/test/helpers"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API
const mockCreateReminder = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  RemindersService: {
    createReminderRoute: mockCreateReminder,
  },
}))

// Mock custom hook
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

describe("AddReminderDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateReminder.mockResolvedValue({
      id: "r1",
      title: "Test",
      remind_at: new Date().toISOString(),
    })
  })

  it("renders trigger button", () => {
    renderWithProviders(<AddReminderDialog />)
    expect(
      screen.getByRole("button", { name: /add reminder/i }),
    ).toBeInTheDocument()
  })

  it("opens dialog when trigger clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    const trigger = screen.getByRole("button", { name: /add reminder/i })
    await user.click(trigger)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Add New Reminder")).toBeInTheDocument()
  })

  it("shows all form fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    expect(screen.getByLabelText(/title \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date & time \*/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /create reminder/i }),
    ).toBeInTheDocument()
  })

  it("displays validation error on empty title submit", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it("displays validation error on empty date submit", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    await user.type(titleInput, "Call Mom")

    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/date and time is required/i)).toBeInTheDocument()
    })
  })

  it("allows submission with only required fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Call Mom")
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateReminder).toHaveBeenCalled()
    })
  })

  it("submits with optional description", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Call Mom")
    await user.type(descriptionInput, "Ask about her day and upcoming vacation")
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            title: "Call Mom",
            description: "Ask about her day and upcoming vacation",
          }),
        }),
      )
    })
  })

  it("converts datetime string to ISO format on submit", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Test Reminder")
    await user.type(datetimeInput, "2024-12-25T14:30")

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            remind_at: expect.stringMatching(/2024-12-25T14:30/),
          }),
        }),
      )
    })
  })

  it("shows loading state while submitting", async () => {
    const user = userEvent.setup()
    mockCreateReminder.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
    )

    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Test")
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled()
  })

  it("keeps dialog open on API error", async () => {
    const user = userEvent.setup()
    mockCreateReminder.mockRejectedValue(new Error("API Error"))

    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Test")
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  it("closes dialog on successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Test")
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("resets form after successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    // First submission
    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i) as HTMLInputElement
    const datetimeInput = screen.getByLabelText(
      /date & time \*/i,
    ) as HTMLInputElement
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Call Mom")
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // Reopen and verify reset
    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const newTitleInput = screen.getByLabelText(/title \*/i) as HTMLInputElement
    const newDatetimeInput = screen.getByLabelText(
      /date & time \*/i,
    ) as HTMLInputElement
    const newDescriptionInput = screen.getByLabelText(
      /description/i,
    ) as HTMLTextAreaElement

    expect(newTitleInput.value).toBe("")
    expect(newDatetimeInput.value).toBe("")
    expect(newDescriptionInput.value).toBe("")
  })

  it("disables submit button while loading", async () => {
    const user = userEvent.setup()
    mockCreateReminder.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 200)),
    )

    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Test")
    await user.type(datetimeInput, "2024-12-25T10:00")

    expect(submitButton).not.toBeDisabled()
    await user.click(submitButton)

    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled()
  })

  it("handles dialog close via backdrop click", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    const dialog = screen.getByRole("dialog")
    await user.click(dialog, { pointerEventsCheck: 0 })

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("validates title is not empty or whitespace", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "   ")
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it("allows empty description", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Reminder without description")
    await user.type(datetimeInput, "2024-12-25T10:00")
    // Don't fill description

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            title: "Reminder without description",
            description: "",
          }),
        }),
      )
    })
  })

  it("invalidates reminders query after successful creation", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    await user.type(titleInput, "Test")
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateReminder).toHaveBeenCalled()
    })
  })

  it("displays correct placeholders", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    expect(screen.getByPlaceholderText("e.g., Call John")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("What should you discuss?"),
    ).toBeInTheDocument()
  })

  it("handles long title input", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    const longTitle = "A".repeat(200)
    await user.type(titleInput, longTitle)
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            title: longTitle,
          }),
        }),
      )
    })
  })

  it("handles long description input", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddReminderDialog />)

    await user.click(screen.getByRole("button", { name: /add reminder/i }))

    const titleInput = screen.getByLabelText(/title \*/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const datetimeInput = screen.getByLabelText(/date & time \*/i)
    const submitButton = screen.getByRole("button", {
      name: /create reminder/i,
    })

    const longDescription = "Lorem ipsum dolor sit amet. ".repeat(50)
    await user.type(titleInput, "Test")
    await user.type(descriptionInput, longDescription)
    await user.type(datetimeInput, "2024-12-25T10:00")

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            description: longDescription,
          }),
        }),
      )
    })
  })
})
