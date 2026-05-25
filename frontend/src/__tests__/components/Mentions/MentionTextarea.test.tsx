import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, beforeEach, it, expect, vi, afterEach } from "vitest"

import { ContactsService } from "@/client"
import { MentionTextarea } from "@/components/Mentions/MentionTextarea"
import { renderWithProviders, makeContact } from "@/test/helpers"

vi.mock("@/client", () => ({
  ContactsService: {
    listContacts: vi.fn(),
    getContact: vi.fn(),
  },
}))

// Helper to simulate user typing (which triggers onChange and updates value)
function changeTextareaValue(
  textarea: HTMLTextAreaElement,
  newValue: string,
  rerender: (ui: React.ReactElement) => void,
  onChange: (value: string) => void,
  currentValue: string,
) {
  fireEvent.change(textarea, { target: { value: newValue } })
  rerender(
    <MentionTextarea value={newValue} onChange={onChange} />,
  )
}

describe("MentionTextarea", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // Basic Rendering & Props
  // ============================================================================

  it("renders a textarea with given value and placeholder", () => {
    const handleChange = vi.fn()
    renderWithProviders(
      <MentionTextarea
        value="hello world"
        onChange={handleChange}
        placeholder="Type a message..."
      />,
    )

    const textarea = screen.getByPlaceholderText("Type a message...")
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue("hello world")
  })

  it("renders with className passed to textarea", () => {
    renderWithProviders(
      <MentionTextarea
        value=""
        onChange={vi.fn()}
        className="custom-class"
      />,
    )

    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveClass("custom-class")
  })

  it("forwards ref to textarea element", () => {
    const ref = { current: null as HTMLTextAreaElement | null }
    renderWithProviders(
      <MentionTextarea ref={ref} value="" onChange={vi.fn()} />,
    )

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it("accepts function ref", () => {
    const refCallback = vi.fn()
    renderWithProviders(
      <MentionTextarea
        ref={refCallback}
        value=""
        onChange={vi.fn()}
      />,
    )

    expect(refCallback).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement))
  })

  // ============================================================================
  // onChange & Text Input
  // ============================================================================

  it("fires onChange callback when text changes", () => {
    const handleChange = vi.fn()
    renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "hello" } })

    expect(handleChange).toHaveBeenCalledWith("hello")
  })

  it("updates trigger state on onChange", async () => {
    const handleChange = vi.fn()
    renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@a" } })

    expect(handleChange).toHaveBeenCalledWith("@a")
  })

  // ============================================================================
  // Trigger Detection & Query
  // ============================================================================

  it("does not show suggestions when no @ is in text", () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    renderWithProviders(
      <MentionTextarea value="hello world" onChange={vi.fn()} />,
    )

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("does not fetch contacts when trigger is null", () => {
    renderWithProviders(
      <MentionTextarea value="hello world" onChange={vi.fn()} />,
    )

    expect(ContactsService.listContacts).not.toHaveBeenCalled()
  })

  it("fetches contacts when trigger becomes active", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(ContactsService.listContacts).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Suggestions List: Visibility & Content
  // ============================================================================

  it("shows suggestion dropdown when @ trigger is active with contacts", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })
  })

  it("does not show listbox when suggestions are empty", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    renderWithProviders(
      <MentionTextarea value="@xyz123" onChange={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  it("renders suggestion options with contact names", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("Bob Jones")).toBeInTheDocument()
    })
  })

  it("shows contact without last_name correctly", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: null }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument()
    })
  })

  it("shows 'Unnamed contact' when contact has no name", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: null, last_name: null }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Unnamed contact")).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Ranking & Filtering
  // ============================================================================

  it("ranks contacts: starts-with first (score 0)", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Bob", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Alice", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveTextContent("Alice Jones")
    })
  })

  it("ranks contacts: contains second (score 1)", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Bob", last_name: "Anderson" }),
        makeContact({ id: "2", first_name: "Charlie", last_name: "Smith" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@and" } })

    rerender(
      <MentionTextarea value="@and" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveTextContent("Bob Anderson")
    })
  })

  it("ranks contacts: company match third (score 2)", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({
          id: "1",
          first_name: "Bob",
          last_name: "Smith",
          company: "Acme Corp",
        }),
        makeContact({
          id: "2",
          first_name: "Charlie",
          last_name: "Jones",
          company: null,
        }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@acme" } })

    rerender(
      <MentionTextarea value="@acme" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveTextContent("Bob Smith")
    })
  })

  it("filters out non-matching contacts", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@xyz" } })

    rerender(
      <MentionTextarea value="@xyz" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  it("limits suggestions to MAX_SUGGESTIONS (6)", async () => {
    const contacts = Array.from({ length: 10 }, (_, i) =>
      makeContact({
        id: `contact-${i}`,
        first_name: "Contact",
        last_name: String(i),
      }),
    )

    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: contacts,
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options).toHaveLength(6)
    })
  })

  it("shows company in suggestion item", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({
          id: "1",
          first_name: "Alice",
          last_name: "Smith",
          company: "Acme Corp",
        }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument()
    })
  })

  it("does not show company when empty", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({
          id: "1",
          first_name: "Alice",
          last_name: "Smith",
          company: null,
        }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      const companies = screen.queryAllByText(/.*/)
      const hasCompanySpan = companies.some(el =>
        el.classList.contains("text-xs") && el.classList.contains("text-muted-foreground")
      )
      expect(hasCompanySpan).toBe(false)
    })
  })

  // ============================================================================
  // Highlighting & Navigation
  // ============================================================================

  it("highlights first suggestion initially", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveAttribute("aria-selected", "true")
    })
  })

  it("highlight resets to first option on new query", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
        makeContact({ id: "3", first_name: "Charlie", last_name: "Brown" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    // Start typing @
    fireEvent.change(textarea, { target: { value: "@" } })
    textarea.setSelectionRange(1, 1)

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    // First option should be highlighted
    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveAttribute("aria-selected", "true")
    })

    // Move to second option
    fireEvent.keyDown(textarea, { key: "ArrowDown" })

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[1]).toHaveAttribute("aria-selected", "true")
    })

    // Type more to change the query
    fireEvent.change(textarea, { target: { value: "@a" } })
    textarea.setSelectionRange(2, 2)

    rerender(
      <MentionTextarea value="@a" onChange={handleChange} />,
    )

    // After query changes, highlight should reset to first (per useEffect dependency on query)
    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveAttribute("aria-selected", "true")
    })
  })

  it("navigates suggestions down with ArrowDown", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox")

    fireEvent.change(textarea as HTMLTextAreaElement, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveAttribute("aria-selected", "true")
    })

    fireEvent.keyDown(textarea, { key: "ArrowDown" })

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[1]).toHaveAttribute("aria-selected", "true")
    })
  })

  it("ArrowDown wraps around to first suggestion", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox")

    fireEvent.change(textarea as HTMLTextAreaElement, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveAttribute("aria-selected", "true")
    })

    // Move to last
    fireEvent.keyDown(textarea, { key: "ArrowDown" })
    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[1]).toHaveAttribute("aria-selected", "true")
    })

    // Wrap around
    fireEvent.keyDown(textarea, { key: "ArrowDown" })
    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveAttribute("aria-selected", "true")
    })
  })

  it("navigates suggestions up with ArrowUp", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox")

    fireEvent.change(textarea as HTMLTextAreaElement, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveAttribute("aria-selected", "true")
    })

    fireEvent.keyDown(textarea, { key: "ArrowUp" })

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[options.length - 1]).toHaveAttribute("aria-selected", "true")
    })
  })

  it("ArrowUp wraps around to last suggestion", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
        makeContact({ id: "3", first_name: "Charlie", last_name: "Brown" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox")

    fireEvent.change(textarea as HTMLTextAreaElement, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveAttribute("aria-selected", "true")
    })

    // Go up once
    fireEvent.keyDown(textarea, { key: "ArrowUp" })
    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[options.length - 1]).toHaveAttribute("aria-selected", "true")
    })

    // Go up again (wraps to previous)
    fireEvent.keyDown(textarea, { key: "ArrowUp" })
    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options[options.length - 2]).toHaveAttribute("aria-selected", "true")
    })
  })

  it("highlights option on mouseEnter", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "2", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox")

    fireEvent.change(textarea as HTMLTextAreaElement, { target: { value: "@" } })

    rerender(
      <MentionTextarea value="@" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      fireEvent.mouseEnter(options[1])
      expect(options[1]).toHaveAttribute("aria-selected", "true")
    })
  })

  // ============================================================================
  // Key Commands: Enter, Tab, Escape
  // ============================================================================

  it("inserts mention with Enter key", async () => {
    const handleChange = vi.fn()

    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "alice-123", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("option")).toBeInTheDocument()
    })

    fireEvent.keyDown(textarea, { key: "Enter" })

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("@[Alice Smith](alice-123) ")
    })
  })

  it("prevents default on Enter when suggestions visible", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "alice-123", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={vi.fn()} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("option")).toBeInTheDocument()
    })

    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, "preventDefault")

    fireEvent(textarea, event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it("inserts mention with Tab key", async () => {
    const handleChange = vi.fn()

    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "bob-456", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@b" } })

    rerender(
      <MentionTextarea value="@b" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("option")).toBeInTheDocument()
    })

    fireEvent.keyDown(textarea, { key: "Tab" })

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("@[Bob Jones](bob-456) ")
    })
  })

  it("prevents default on Tab when suggestions visible", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "alice-123", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={vi.fn()} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("option")).toBeInTheDocument()
    })

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, "preventDefault")

    fireEvent(textarea, event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it("closes suggestions on Escape", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={vi.fn()} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })

    fireEvent.keyDown(textarea, { key: "Escape" })

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  it("prevents default on Escape when suggestions visible", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "alice-123", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={vi.fn()} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("option")).toBeInTheDocument()
    })

    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, "preventDefault")

    fireEvent(textarea, event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it("passes through keys when no trigger active", async () => {
    const handleKeyDown = vi.fn()

    renderWithProviders(
      <MentionTextarea
        value="hello"
        onChange={vi.fn()}
        onKeyDown={handleKeyDown}
      />,
    )

    const textarea = screen.getByRole("textbox")
    fireEvent.keyDown(textarea, { key: "ArrowDown" })

    expect(handleKeyDown).toHaveBeenCalled()
  })

  it("passes through keys when suggestions empty", async () => {
    const handleKeyDown = vi.fn()

    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea
        value=""
        onChange={vi.fn()}
        onKeyDown={handleKeyDown}
      />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@xyz" } })

    rerender(
      <MentionTextarea
        value="@xyz"
        onChange={vi.fn()}
        onKeyDown={handleKeyDown}
      />,
    )

    fireEvent.keyDown(textarea, { key: "ArrowDown" })

    expect(handleKeyDown).toHaveBeenCalled()
  })

  it("passes through other keys when suggestions visible", async () => {
    const handleKeyDown = vi.fn()

    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea
        value=""
        onChange={vi.fn()}
        onKeyDown={handleKeyDown}
      />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@" } })

    rerender(
      <MentionTextarea
        value="@"
        onChange={vi.fn()}
        onKeyDown={handleKeyDown}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole("option")).toBeInTheDocument()
    })

    fireEvent.keyDown(textarea, { key: "a" })

    expect(handleKeyDown).toHaveBeenCalled()
  })

  // ============================================================================
  // Mouse Interactions
  // ============================================================================

  it("inserts mention on suggestion mouseDown", async () => {
    const handleChange = vi.fn()

    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "alice-123", first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: "bob-456", first_name: "Bob", last_name: "Jones" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@b" } })

    rerender(
      <MentionTextarea value="@b" onChange={handleChange} />,
    )

    await waitFor(() => {
      const options = screen.getAllByRole("option")
      fireEvent.mouseDown(options[0])
    })

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("@[Bob Jones](bob-456) ")
    })
  })

  // ============================================================================
  // Insert Mention: Edge Cases
  // ============================================================================

  it("inserts mention at caret position correctly", async () => {
    const handleChange = vi.fn()

    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "alice-123", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    // Type trigger
    fireEvent.change(textarea, { target: { value: "@a" } })
    textarea.setSelectionRange(2, 2)

    rerender(
      <MentionTextarea value="@a" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("option")).toBeInTheDocument()
    })

    fireEvent.keyDown(textarea, { key: "Enter" })

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("@[Alice Smith](alice-123) ")
    })
  })

  it("closes trigger after inserting mention", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "alice-123", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={handleChange} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })

    fireEvent.keyDown(textarea, { key: "Enter" })

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled()
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Blur Handling
  // ============================================================================

  it("closes suggestions on blur after delay", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const handleChange = vi.fn()

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={handleChange} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    // Change to trigger mode
    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={handleChange} />,
    )

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })

    // Blur should schedule a setTimeout to close suggestions
    fireEvent.blur(textarea)

    // Suggestions should still be visible immediately
    expect(screen.getByRole("listbox")).toBeInTheDocument()

    // After 150ms, suggestions should be gone (120ms timeout + margin)
    await waitFor(
      () => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      },
      { timeout: 200 },
    )
  })

  it("calls onBlur prop if provided", async () => {
    const handleBlur = vi.fn()

    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    renderWithProviders(
      <MentionTextarea
        value=""
        onChange={vi.fn()}
        onBlur={handleBlur}
      />,
    )

    const textarea = screen.getByRole("textbox")

    fireEvent.blur(textarea)

    expect(handleBlur).toHaveBeenCalled()
  })

  // ============================================================================
  // Click & KeyUp Interactions
  // ============================================================================

  it("updates trigger on textarea click", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={vi.fn()} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={vi.fn()} />,
    )

    textarea.setSelectionRange(2, 2)

    fireEvent.click(textarea)

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })
  })

  it("updates trigger on keyUp", async () => {
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: [
        makeContact({ id: "1", first_name: "Alice", last_name: "Smith" }),
      ],
    })

    const { rerender } = renderWithProviders(
      <MentionTextarea value="" onChange={vi.fn()} />,
    )

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement

    fireEvent.change(textarea, { target: { value: "@a" } })

    rerender(
      <MentionTextarea value="@a" onChange={vi.fn()} />,
    )

    textarea.setSelectionRange(2, 2)

    fireEvent.keyUp(textarea)

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })
  })
})
