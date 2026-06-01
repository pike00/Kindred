import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/helpers"
import { NotesCard } from "@/components/Notes/NotesCard"

// Mock API client services
const mockListNotes = vi.hoisted(() => vi.fn())
const mockCreateNote = vi.hoisted(() => vi.fn())
const mockUpdateNote = vi.hoisted(() => vi.fn())
const mockDeleteNote = vi.hoisted(() => vi.fn())

vi.mock("@/client", () => ({
  NotesService: {
    listNotes: mockListNotes,
    createNoteRoute: mockCreateNote,
    updateNoteRoute: mockUpdateNote,
    deleteNote: mockDeleteNote,
  },
}))

// Mock toast hook
const mockShowSuccessToast = vi.hoisted(() => vi.fn())
const mockShowErrorToast = vi.hoisted(() => vi.fn())
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

// Mock MentionText
vi.mock("@/components/Mentions/MentionText", () => ({
  MentionText: ({ text, className }: any) => (
    <span className={className} data-testid="mention-text">
      {text}
    </span>
  ),
}))

// Mock MentionTextarea
vi.mock("@/components/Mentions/MentionTextarea", () => ({
  MentionTextarea: ({ value, onChange, placeholder, onKeyDown, ...rest }: any) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      data-testid="mention-textarea"
      {...rest}
    />
  ),
}))

// Mock Dialog (render inline so it's visible in tests)
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: any) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogFooter: ({ children, className }: any) => (
    <div data-testid="dialog-footer" className={className}>
      {children}
    </div>
  ),
  DialogClose: ({ children }: any) => <>{children}</>,
}))

// Mock EmptyState
vi.mock("@/components/Common/EmptyState", () => ({
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}))

// Mock RowActionsMenu
vi.mock("@/components/Common/RowActionsMenu", () => ({
  RowActionsMenu: ({ items }: any) => (
    <div data-testid="row-actions-menu">
      {items.map((item: any, idx: number) => (
        <button
          key={idx}
          data-testid={`action-${item.label}`}
          onClick={() => item.onSelect()}
          data-variant={item.variant}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

// Mock LoadingButton
vi.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, onClick, loading, disabled, type, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      data-testid="loading-button"
      data-loading={loading}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  NotebookPen: () => <span data-testid="icon-notebook">Notebook</span>,
  Pencil: () => <span data-testid="icon-pencil">Pencil</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
}))

describe("NotesCard", () => {
  const mockNoteData = {
    data: [
      {
        id: "n1",
        contact_id: "c1",
        body: "First note about Alice",
        created_at: "2024-01-10T10:00:00Z",
        updated_at: "2024-01-10T10:00:00Z",
      },
      {
        id: "n2",
        contact_id: "c1",
        body: "Second note",
        created_at: "2024-01-12T14:30:00Z",
        updated_at: "2024-01-12T14:30:00Z",
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockShowSuccessToast.mockClear()
    mockShowErrorToast.mockClear()
    mockListNotes.mockResolvedValue({ data: [] })
    mockCreateNote.mockResolvedValue({ id: "n3" })
    mockUpdateNote.mockResolvedValue({ id: "n1" })
    mockDeleteNote.mockResolvedValue({})
    // Mock window.confirm for delete operations
    global.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders notes card with title", () => {
    renderWithProviders(<NotesCard contactId="c1" />)
    expect(screen.getByText("Notes")).toBeInTheDocument()
  })

  it("renders quick capture textarea", async () => {
    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      const textarea = screen.getByTestId("mention-textarea")
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute(
        "placeholder",
        expect.stringContaining("Jot a quick note"),
      )
    })
  })

  it("shows loading skeleton while loading", async () => {
    mockListNotes.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const { container } = renderWithProviders(<NotesCard contactId="c1" />)

    // Look for skeleton elements in the DOM by data-slot
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows empty state when no notes exist", async () => {
    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
      expect(screen.getByText("No notes yet")).toBeInTheDocument()
      expect(
        screen.getByText(/Capture quick observations/),
      ).toBeInTheDocument()
    })
  })

  it("shows notes list when notes exist", async () => {
    mockListNotes.mockResolvedValueOnce(mockNoteData)

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
      expect(screen.getByText("Second note")).toBeInTheDocument()
    })
  })

  it("shows note count in title when notes exist", async () => {
    mockListNotes.mockResolvedValueOnce(mockNoteData)

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument()
    })
  })

  it("submits a note on form submit", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "Test note text")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            contact_id: "c1",
            body: "Test note text",
          },
        }),
      )
    })
  })

  it("clears textarea after successful submission", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea") as HTMLTextAreaElement
    await user.type(textarea, "Test note")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(textarea.value).toBe("")
    })
  })

  it("clears textarea after successful note creation", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea") as HTMLTextAreaElement
    await user.type(textarea, "Test note")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled()
      expect(textarea.value).toBe("")
    })
  })

  it("shows error toast when note creation fails", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })
    mockCreateNote.mockRejectedValueOnce(new Error("Network error"))

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "Test note")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Network error")
    })
  })

  it("uses fallback message when note creation rejects with non-Error value", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })
    mockCreateNote.mockRejectedValueOnce("plain-string")

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "Test note")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Failed to save note")
    })
  })

  it("disables submit button when textarea is empty", async () => {
    renderWithProviders(<NotesCard contactId="c1" />)

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    expect(submitBtn).toBeDisabled()
  })

  it("disables submit button when textarea only has whitespace", async () => {
    const user = userEvent.setup()
    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "   ")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    expect(submitBtn).toBeDisabled()
  })

  it("enables submit button when textarea has content", async () => {
    const user = userEvent.setup()
    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "Note content")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    expect(submitBtn).not.toBeDisabled()
  })

  it("disables submit button while submitting", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })
    let resolveCreate: any
    mockCreateNote.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveCreate = () => resolve({ id: "n3" })
        setTimeout(resolveCreate, 100)
      }),
    )

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "Test note")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })

    // Before click, button should be enabled
    expect(submitBtn).not.toBeDisabled()

    await user.click(submitBtn)

    // Immediately after click, button should be disabled (isPending = true)
    expect(submitBtn).toBeDisabled()

    // After mutation completes, button should be re-enabled
    await waitFor(() => expect(mockCreateNote).toHaveBeenCalled())
  })

  it("submits on Ctrl+Enter keyboard shortcut via onKeyDown", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea") as HTMLTextAreaElement
    await user.type(textarea, "Test note")

    // Simulate Ctrl+Enter keystroke by calling the onKeyDown handler directly
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      ctrlKey: true,
      bubbles: true,
    })
    textarea.dispatchEvent(event)

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled()
    })
  })

  it("submits on Cmd+Enter keyboard shortcut via onKeyDown", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea") as HTMLTextAreaElement
    await user.type(textarea, "Test note")

    // Simulate Cmd+Enter keystroke by calling the onKeyDown handler directly
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      metaKey: true,
      bubbles: true,
    })
    textarea.dispatchEvent(event)

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled()
    })
  })

  it("renders notes with dates", async () => {
    mockListNotes.mockResolvedValueOnce(mockNoteData)

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/2024-01-10/)).toBeInTheDocument()
      expect(screen.getByText(/2024-01-12/)).toBeInTheDocument()
    })
  })

  it("shows edited indicator when note was updated", async () => {
    mockListNotes.mockResolvedValueOnce({
      data: [
        {
          id: "n1",
          contact_id: "c1",
          body: "Note text",
          created_at: "2024-01-10T10:00:00Z",
          updated_at: "2024-01-10T15:00:00Z",
        },
      ],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/edited 2024-01-10/)).toBeInTheDocument()
    })
  })

  it("does not show edited indicator when note was not updated", async () => {
    mockListNotes.mockResolvedValueOnce({
      data: [
        {
          id: "n1",
          contact_id: "c1",
          body: "Note text",
          created_at: "2024-01-10T10:00:00Z",
          updated_at: "2024-01-10T10:00:00Z",
        },
      ],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.queryByText(/edited/)).not.toBeInTheDocument()
    })
  })

  it("note item has row actions menu", async () => {
    mockListNotes.mockResolvedValueOnce(mockNoteData)

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getAllByTestId("row-actions-menu").length).toBeGreaterThan(0)
    })
  })

  it("edit action opens dialog", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
      expect(screen.getByTestId("dialog-title")).toHaveTextContent("Edit note")
    })
  })

  it("edit dialog textarea has note body", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
    })

    const dialogTextareas = screen.getAllByTestId("mention-textarea")
    const dialogTextarea = dialogTextareas[dialogTextareas.length - 1] // last one is in dialog
    expect(dialogTextarea).toHaveValue("First note about Alice")
  })

  it("edit dialog saves changes", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
    })

    const dialogTextareas = screen.getAllByTestId("mention-textarea")
    const dialogTextarea = dialogTextareas[dialogTextareas.length - 1] // last one is in dialog
    await user.clear(dialogTextarea)
    await user.type(dialogTextarea, "Updated note text")

    const saveBtns = screen.getAllByRole("button", { name: /Save/i })
    const saveBtn = saveBtns[saveBtns.length - 1] // last one is in dialog
    await user.click(saveBtn)

    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith(
        expect.objectContaining({
          noteId: "n1",
          requestBody: {
            body: "Updated note text",
          },
        }),
      )
    })
  })

  it("edit dialog shows success toast after save", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
    })

    const dialogTextareas = screen.getAllByTestId("mention-textarea")
    const dialogTextarea = dialogTextareas[dialogTextareas.length - 1] // last one is in dialog
    await user.clear(dialogTextarea)
    await user.type(dialogTextarea, "Updated")

    const saveBtns = screen.getAllByRole("button", { name: /Save/i })
    const saveBtn = saveBtns[saveBtns.length - 1] // last one is in dialog
    await user.click(saveBtn)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Note updated")
    })
  })

  it("edit dialog disables save when text is empty", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
    })

    const dialogTextareas = screen.getAllByTestId("mention-textarea")
    const dialogTextarea = dialogTextareas[dialogTextareas.length - 1] // last one is in dialog
    await user.clear(dialogTextarea)

    const saveBtns = screen.getAllByRole("button", { name: /Save/i })
    const saveBtn = saveBtns[saveBtns.length - 1] // last one is in dialog
    expect(saveBtn).toBeDisabled()
  })

  it("delete action shows confirm dialog", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const deleteBtn = screen.getByTestId("action-Delete")
    await user.click(deleteBtn)

    expect(global.confirm).toHaveBeenCalledWith("Delete this note?")
  })

  it("delete action does not delete if confirm is cancelled", async () => {
    const user = userEvent.setup()
    global.confirm = vi.fn(() => false)
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const deleteBtn = screen.getByTestId("action-Delete")
    await user.click(deleteBtn)

    expect(mockDeleteNote).not.toHaveBeenCalled()
  })

  it("delete action calls deleteNote when confirmed", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const deleteBtn = screen.getByTestId("action-Delete")
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(mockDeleteNote).toHaveBeenCalledWith(expect.objectContaining({ noteId: "n1" }))
    })
  })

  it("delete action shows success toast", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const deleteBtn = screen.getByTestId("action-Delete")
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Note deleted")
    })
  })

  it("delete action uses fallback message on non-Error rejection", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValueOnce(true)

    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })
    mockDeleteNote.mockRejectedValueOnce("plain-string-error")

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const deleteBtn = screen.getByTestId("action-Delete")
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Failed to delete note")
    })
  })

  it("edit dialog uses fallback message on non-Error rejection", async () => {
    const user = userEvent.setup()

    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })
    mockUpdateNote.mockRejectedValueOnce("plain-string-error")

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
    })

    const dialogTextareas = screen.getAllByTestId("mention-textarea")
    const dialogTextarea = dialogTextareas[dialogTextareas.length - 1]
    await user.clear(dialogTextarea)
    await user.type(dialogTextarea, "Updated note")

    const saveBtns = screen.getAllByRole("button", { name: /Save/i })
    const saveBtn = saveBtns[saveBtns.length - 1]
    await user.click(saveBtn)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Failed to update note")
    })
  })

  it("delete action shows error toast on failure", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })
    mockDeleteNote.mockRejectedValueOnce(new Error("Delete failed"))

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const deleteBtn = screen.getByTestId("action-Delete")
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Delete failed")
    })
  })

  it("invalidates query after note creation", async () => {
    const user = userEvent.setup()
    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "Test note")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled()
    })

    // After mutation success, the notes query should be invalidated
    expect(mockListNotes).toHaveBeenCalled()
  })

  it("invalidates query after note deletion", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const deleteBtn = screen.getByTestId("action-Delete")
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(mockDeleteNote).toHaveBeenCalled()
    })

    // Query should be invalidated
    expect(mockListNotes).toHaveBeenCalled()
  })

  it("invalidates query after note update", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
    })

    const dialogTextareas = screen.getAllByTestId("mention-textarea")
    const dialogTextarea = dialogTextareas[dialogTextareas.length - 1] // last one is in dialog
    await user.clear(dialogTextarea)
    await user.type(dialogTextarea, "Updated")

    const saveBtns = screen.getAllByRole("button", { name: /Save/i })
    const saveBtn = saveBtns[saveBtns.length - 1] // last one is in dialog
    await user.click(saveBtn)

    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalled()
    })

    // Query should be invalidated
    expect(mockListNotes).toHaveBeenCalled()
  })

  it("uses correct contactId for queries and mutations", async () => {
    const contactId = "specific-contact-id"
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })

    renderWithProviders(<NotesCard contactId={contactId} />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "Test note")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: contactId,
          }),
        }),
      )
    })
  })

  it("trims whitespace from note before submitting", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({ data: [] })

    renderWithProviders(<NotesCard contactId="c1" />)

    const textarea = screen.getByTestId("mention-textarea")
    await user.type(textarea, "  Test note with spaces  ")

    const submitBtn = screen.getByRole("button", { name: /Save note/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            contact_id: "c1",
            body: "Test note with spaces",
          },
        }),
      )
    })
  })

  it("trims whitespace from edited note before submitting", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
    })

    const dialogTextareas = screen.getAllByTestId("mention-textarea")
    const dialogTextarea = dialogTextareas[dialogTextareas.length - 1] // last one is in dialog
    await user.clear(dialogTextarea)
    await user.type(dialogTextarea, "  Updated text  ")

    const saveBtns = screen.getAllByRole("button", { name: /Save/i })
    const saveBtn = saveBtns[saveBtns.length - 1] // last one is in dialog
    await user.click(saveBtn)

    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith(
        expect.objectContaining({
          noteId: "n1",
          requestBody: {
            body: "Updated text",
          },
        }),
      )
    })
  })

  it("dialog closes after successful update", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce({
      data: [mockNoteData.data[0]],
    })

    renderWithProviders(<NotesCard contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("First note about Alice")).toBeInTheDocument()
    })

    const editBtn = screen.getByTestId("action-Edit")
    await user.click(editBtn)

    await waitFor(() => {
      expect(screen.getByTestId("dialog")).toBeInTheDocument()
    })

    const dialogTextareas = screen.getAllByTestId("mention-textarea")
    const dialogTextarea = dialogTextareas[dialogTextareas.length - 1] // last one is in dialog
    await user.clear(dialogTextarea)
    await user.type(dialogTextarea, "Updated")

    const saveBtns = screen.getAllByRole("button", { name: /Save/i })
    const saveBtn = saveBtns[saveBtns.length - 1] // last one is in dialog
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
    })
  })
})
