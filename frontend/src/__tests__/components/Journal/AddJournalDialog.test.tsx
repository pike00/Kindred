import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddJournalDialog } from "@/components/Journal/AddJournalDialog"
import { renderWithProviders } from "@/test/helpers"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API
const mockCreateJournalEntry = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  JournalService: {
    createJournalEntryRoute: mockCreateJournalEntry,
  },
}))

// Mock MentionTextarea
vi.mock("@/components/Mentions/MentionTextarea", () => ({
  MentionTextarea: ({
    value,
    onChange,
    onBlur,
    placeholder,
  }: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    onBlur: () => void
    placeholder: string
  }) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e)}
      onBlur={onBlur}
      placeholder={placeholder}
      data-testid="mention-textarea"
    />
  ),
}))

// Mock custom hook
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

describe("AddJournalDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateJournalEntry.mockResolvedValue({
      id: "j1",
      title: "Test",
      body: null,
      created_at: new Date().toISOString(),
    })
  })

  it("renders trigger button", () => {
    renderWithProviders(<AddJournalDialog />)
    expect(
      screen.getByRole("button", { name: /new entry/i }),
    ).toBeInTheDocument()
  })

  it("opens dialog when trigger clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    const trigger = screen.getByRole("button", { name: /new entry/i })
    await user.click(trigger)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Write Journal Entry")).toBeInTheDocument()
  })

  it("shows all form fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    expect(screen.getByLabelText(/date \*/i)).toBeInTheDocument()
    expect(screen.getByTestId("mention-textarea")).toBeInTheDocument()
    expect(screen.getByLabelText(/mood/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /save entry/i }),
    ).toBeInTheDocument()
  })

  it("displays validation errors on empty submit", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const submitButton = screen.getByRole("button", { name: /save entry/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/entry content is required/i)).toBeInTheDocument()
    })
  })

  it("allows submission with required fields filled", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const entryTextarea = screen.getByTestId("mention-textarea")
    const submitButton = screen.getByRole("button", { name: /save entry/i })

    // Date input has default value of today
    await user.clear(entryTextarea)
    await user.type(entryTextarea, "Today was a great day")

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateJournalEntry).toHaveBeenCalled()
    })
  })

  it("submits with mood when provided", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const entryTextarea = screen.getByTestId("mention-textarea")
    const moodInput = screen.getByLabelText(/mood/i)
    const submitButton = screen.getByRole("button", { name: /save entry/i })

    // Date input has default value of today
    await user.clear(entryTextarea)
    await user.type(entryTextarea, "Today was a great day")
    await user.type(moodInput, "Happy")

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            body: "Today was a great day",
            mood: "Happy",
            entry_date: expect.any(String),
          }),
        }),
      )
    })
  })

  it("shows loading state while submitting", async () => {
    const user = userEvent.setup()
    mockCreateJournalEntry.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 2000)),
    )

    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const entryTextarea = screen.getByTestId("mention-textarea")
    const submitButton = screen.getByRole("button", { name: /save entry/i })

    await user.clear(entryTextarea)
    await user.type(entryTextarea, "Test entry")

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled()
    })
  })

  it("keeps dialog open on API error", async () => {
    const user = userEvent.setup()
    mockCreateJournalEntry.mockRejectedValue(new Error("API Error"))

    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const entryTextarea = screen.getByTestId("mention-textarea")
    const submitButton = screen.getByRole("button", { name: /save entry/i })

    // Date input has default value
    await user.clear(entryTextarea)
    await user.type(entryTextarea, "Test entry")

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  it("closes dialog on successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const entryTextarea = screen.getByTestId("mention-textarea")
    const submitButton = screen.getByRole("button", { name: /save entry/i })

    // Date input has default value
    await user.clear(entryTextarea)
    await user.type(entryTextarea, "Test entry")

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("resets form after successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    // First submission
    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const dateInput = screen.getByLabelText(/date \*/i) as HTMLInputElement
    const entryTextarea = screen.getByTestId(
      "mention-textarea",
    ) as HTMLTextAreaElement
    const submitButton = screen.getByRole("button", { name: /save entry/i })

    // Date already has a value, just fill entry
    await user.clear(entryTextarea)
    await user.type(entryTextarea, "Test entry")

    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // Reopen and verify reset
    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const newDateInput = screen.getByLabelText(/date \*/i) as HTMLInputElement
    const newEntryTextarea = screen.getByTestId(
      "mention-textarea",
    ) as HTMLTextAreaElement

    expect(newEntryTextarea.value).toBe("")
    expect(newDateInput.value).toBe(new Date().toISOString().split("T")[0])
  })

  it("disables submit button while loading", async () => {
    const user = userEvent.setup()
    mockCreateJournalEntry.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 200)),
    )

    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const dateInput = screen.getByLabelText(/date \*/i)
    const entryTextarea = screen.getByTestId("mention-textarea")
    const submitButton = screen.getByRole("button", { name: /save entry/i })

    await user.clear(entryTextarea)
    await user.type(entryTextarea, "Test entry")

    expect(submitButton).not.toBeDisabled()
    await user.click(submitButton)

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled()
  })

  it("handles dialog close via backdrop click", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    // Radix Dialog closes on Escape key
    await user.keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("has today's date as default", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJournalDialog />)

    await user.click(screen.getByRole("button", { name: /new entry/i }))

    const dateInput = screen.getByLabelText(/date \*/i) as HTMLInputElement
    const today = new Date().toISOString().split("T")[0]

    expect(dateInput.value).toBe(today)
  })
})
