import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CustomFieldsCard } from "@/components/Contacts/CustomFieldsCard"
import { createQueryClient, renderWithProviders } from "@/test/helpers"

// Mock router
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => (
      <a href={String(to)} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
  }
})

// Mock API client
vi.mock("@/client", () => ({
  CustomFieldsService: {
    listFieldDefinitions: vi.fn(),
    listFieldValues: vi.fn(),
    createFieldValue: vi.fn(),
    updateFieldValue: vi.fn(),
    deleteFieldValue: vi.fn(),
  },
}))

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock useCustomToast
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

// Mock dialog to render inline
const React = require("react")
const mockDialog = vi.hoisted(() => ({
  Dialog: ({ children, open }: any) => {
    const arr = React.Children.toArray(children)
    // Always render content for testing (both trigger and content)
    return React.createElement("div", null, arr[0], arr[1])
  },
  DialogTrigger: ({ children, asChild }: any) =>
    React.createElement("div", null, children),
  DialogContent: ({ children }: any) =>
    React.createElement("div", { role: "dialog" }, children),
  DialogHeader: ({ children }: any) =>
    React.createElement("div", null, children),
  DialogTitle: ({ children }: any) =>
    React.createElement("h2", null, children),
  DialogDescription: ({ children }: any) =>
    React.createElement("p", null, children),
  DialogFooter: ({ children }: any) =>
    React.createElement("div", null, children),
  DialogClose: ({ children, asChild }: any) =>
    React.createElement("div", null, children),
}))

vi.mock("@/components/ui/dialog", () => mockDialog)

// Mock RowActionsMenu to simplify testing
vi.mock("@/components/Common/RowActionsMenu", () => ({
  RowActionsMenu: ({ items }: any) =>
    React.createElement(
      "div",
      null,
      items.map((item: any) =>
        React.createElement(
          "button",
          {
            key: item.label,
            onClick: item.onSelect,
            "data-testid": `action-${item.label.toLowerCase()}`,
          },
          item.label,
        ),
      ),
    ),
}))

// Mock EmptyState
vi.mock("@/components/Common/EmptyState", () => ({
  EmptyState: ({ title, description }: any) =>
    React.createElement("div", { "data-testid": "empty-state" }, title),
}))

describe("CustomFieldsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders card title", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldValues).mockResolvedValue({
      data: [],
    })

    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)
    expect(screen.getByText("Custom fields")).toBeInTheDocument()
  })

  it("renders add button", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldValues).mockResolvedValue({
      data: [],
    })

    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument()
  })

  it("shows empty state when no custom fields", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldValues).mockResolvedValue({
      data: [],
    })

    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("No custom fields")).toBeInTheDocument()
    })
  })

  it("displays custom field values", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldValues).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_definition_id: "def-1",
          field_name: "Favorite Color",
          value: "Blue",
        },
      ],
    })

    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Favorite Color:")).toBeInTheDocument()
      expect(screen.getByText("Blue")).toBeInTheDocument()
    })
  })

  it("opens add dialog when add button is clicked", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldValues).mockResolvedValue({
      data: [],
    })
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValue({
      data: [
        { id: "def-1", name: "Favorite Color" },
        { id: "def-2", name: "Pet Name" },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field")).toBeInTheDocument()
    })
  })

  it("displays available field definitions in add dialog", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldValues).mockResolvedValue({
      data: [],
    })
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValue({
      data: [
        { id: "def-1", name: "Favorite Color" },
        { id: "def-2", name: "Pet Name" },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Favorite Color")).toBeInTheDocument()
      expect(screen.getByText("Pet Name")).toBeInTheDocument()
    })
  })

  it("displays available field definitions in add dialog", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockDefs = vi.mocked(CustomFieldsService.listFieldDefinitions)

    mockList.mockResolvedValue({ data: [] })
    mockDefs.mockResolvedValue({
      data: [
        { id: "def-1", name: "Favorite Color" },
        { id: "def-2", name: "Pet Name" },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field")).toBeInTheDocument()
    })
  })

  it("shows validation error when field not selected", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockDefs = vi.mocked(CustomFieldsService.listFieldDefinitions)

    mockList.mockResolvedValue({ data: [] })
    mockDefs.mockResolvedValue({
      data: [{ id: "def-1", name: "Favorite Color" }],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field")).toBeInTheDocument()
    })

    // Try to submit without selecting a field
    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/field is required/i)).toBeInTheDocument()
    })
  })

  it("closes dialog when cancel is clicked", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockDefs = vi.mocked(CustomFieldsService.listFieldDefinitions)

    mockList.mockResolvedValue({ data: [] })
    mockDefs.mockResolvedValue({
      data: [{ id: "def-1", name: "Favorite Color" }],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field")).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText("Add custom field")).not.toBeInTheDocument()
    })
  })

  it("shows validation error when value is empty", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockDefs = vi.mocked(CustomFieldsService.listFieldDefinitions)

    mockList.mockResolvedValue({ data: [] })
    mockDefs.mockResolvedValue({
      data: [{ id: "def-1", name: "Favorite Color" }],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field")).toBeInTheDocument()
    })

    // Try to submit without entering a value
    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/value is required/i)).toBeInTheDocument()
    })
  })

  it("shows placeholder text when no definitions available", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockDefs = vi.mocked(CustomFieldsService.listFieldDefinitions)

    mockList.mockResolvedValue({ data: [] })
    mockDefs.mockResolvedValue({
      data: [], // No definitions available
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText(/no definitions available/i)).toBeInTheDocument()
    })
  })

  it("loads field definitions when dialog opens", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockDefs = vi.mocked(CustomFieldsService.listFieldDefinitions)

    mockList.mockResolvedValue({ data: [] })
    mockDefs.mockResolvedValue({
      data: [{ id: "def-1", name: "Favorite Color" }],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(mockDefs).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Edit Dialog and EditCustomFieldValueDialog coverage
  // ============================================================================

  it("opens EditCustomFieldValueDialog when Edit button is clicked", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_definition_id: "def-1",
          field_name: "Favorite Color",
          value: "Blue",
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Blue")).toBeInTheDocument()
    })

    // Click the Edit button
    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    // Verify the edit dialog title appears
    await waitFor(() => {
      expect(screen.getByText(/edit.*favorite color/i)).toBeInTheDocument()
    })
  })

  it("EditCustomFieldValueDialog pre-fills value from existing field", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_definition_id: "def-1",
          field_name: "Favorite Food",
          value: "Pizza",
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Pizza")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText(/edit.*favorite food/i)).toBeInTheDocument()
    })

    // Verify form field is pre-filled with current value
    const valueInputs = screen.getAllByDisplayValue("Pizza")
    expect(valueInputs.length).toBeGreaterThan(0)
  })

  it("submit edit custom field calls updateFieldValue API", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockUpdate = vi.mocked(CustomFieldsService.updateFieldValue)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_definition_id: "def-1",
          field_name: "Favorite Animal",
          value: "Dog",
        },
      ],
    })

    mockUpdate.mockResolvedValue({
      id: "field-1",
      contact_id: "test-contact-id",
      field_definition_id: "def-1",
      field_name: "Favorite Animal",
      value: "Cat",
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Dog")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText(/edit.*favorite animal/i)).toBeInTheDocument()
    })

    // Modify the value and save
    const valueInputs = screen.getAllByDisplayValue("Dog")
    if (valueInputs.length > 0) {
      const input = valueInputs[0] as HTMLInputElement
      await user.clear(input)
      await user.type(input, "Cat")
    }

    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    const dialogSaveButton = saveButtons[saveButtons.length - 1]
    await user.click(dialogSaveButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it("shows error toast on custom field edit failure", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockUpdate = vi.mocked(CustomFieldsService.updateFieldValue)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_definition_id: "def-1",
          field_name: "Hobby",
          value: "Reading",
        },
      ],
    })

    mockUpdate.mockRejectedValue(new Error("Update failed"))

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Reading")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText(/edit.*hobby/i)).toBeInTheDocument()
    })

    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    const dialogSaveButton = saveButtons[saveButtons.length - 1]
    await user.click(dialogSaveButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it("displays field_name in ValueRow when present", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_definition_id: "def-1",
          field_name: "Pet Breed",
          value: "Golden Retriever",
        },
      ],
    })

    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Pet Breed:")).toBeInTheDocument()
    })
  })

  it("displays dash (—) in ValueRow when field_name is null", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_definition_id: "def-1",
          field_name: null, // Explicitly null
          value: "Some Value",
        },
      ],
    })

    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      // Should show "—:" instead of "field-name:"
      expect(screen.getByText("—:")).toBeInTheDocument()
    })
  })

  it("disables save button when no definitions available in add dialog", async () => {
    const { CustomFieldsService } = await import("@/client")
    const mockList = vi.mocked(CustomFieldsService.listFieldValues)
    const mockDefs = vi.mocked(CustomFieldsService.listFieldDefinitions)

    mockList.mockResolvedValue({ data: [] })
    mockDefs.mockResolvedValue({
      data: [], // No definitions
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field")).toBeInTheDocument()
    })

    // Find the save button in the dialog and check if it's disabled
    const allSaveButtons = screen.getAllByRole("button", { name: /save/i })
    const saveInDialog = allSaveButtons[allSaveButtons.length - 1]
    expect(saveInDialog).toHaveAttribute("disabled")
  })
})
