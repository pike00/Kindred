import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ContactFieldsCard } from "@/components/Contacts/ContactFieldsCard"
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
  ContactFieldsService: {
    listContactFields: vi.fn(),
    createContactFieldRoute: vi.fn(),
    updateContactField: vi.fn(),
    deleteContactField: vi.fn(),
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

describe("ContactFieldsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders card title", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)
    expect(screen.getByText("Contact Information")).toBeInTheDocument()
  })

  it("renders add button", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument()
  })

  it("renders contact fields card", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    // Verify the component loads and makes the API call
    await waitFor(() => {
      expect(ContactFieldsService.listContactFields).toHaveBeenCalledWith({
        contactId: "test-contact-id",
      })
    })
  })

  it("displays contact fields grouped by type", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
        {
          id: "field-2",
          contact_id: "test-contact-id",
          field_type: "phone",
          label: "Mobile",
          value: "+1 555-1234",
          is_primary: true,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Work:")).toBeInTheDocument()
      expect(screen.getByText("Mobile:")).toBeInTheDocument()
      expect(screen.getByText("john@work.com")).toBeInTheDocument()
      expect(screen.getByText("+1 555-1234")).toBeInTheDocument()
    })
  })

  it("renders mailto link for email fields", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      const emailLink = screen.getByRole("link", {
        name: "john@work.com",
      }) as HTMLAnchorElement
      expect(emailLink.href).toBe("mailto:john@work.com")
    })
  })

  it("renders tel link for phone fields", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "phone",
          label: "Mobile",
          value: "+1 555-1234",
          is_primary: true,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      const phoneLink = screen.getByRole("link", {
        name: "+1 555-1234",
      }) as HTMLAnchorElement
      expect(phoneLink.href).toBe("tel:+1 555-1234")
    })
  })

  it("shows primary badge for primary fields", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("primary")).toBeInTheDocument()
    })
  })

  it("opens add dialog when add button is clicked", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })
  })

  it("displays field type selection buttons in add dialog", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /email/i, pressed: true }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /phone/i }),
      ).toBeInTheDocument()
    })
  })

  it("creates a new contact field", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockCreate = vi.mocked(ContactFieldsService.createContactFieldRoute)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({ data: [] })
    mockCreate.mockResolvedValue({
      id: "field-1",
      contact_id: "test-contact-id",
      field_type: "email",
      label: "Work",
      value: "john@work.com",
      is_primary: false,
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })

    const labelInput = screen.getByPlaceholderText("Home, Work, Mobile, ...")
    await user.type(labelInput, "Work")

    const valueInput = screen.getByPlaceholderText(
      "example@host.com / +1 555...",
    )
    await user.type(valueInput, "john@work.com")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        requestBody: {
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: false,
        },
      })
    })
  })

  it("switches field type in add dialog", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })

    const phoneButton = screen.getByRole("button", {
      name: /phone/i,
      pressed: false,
    })
    await user.click(phoneButton)

    expect(
      screen.getByRole("button", { name: /phone/i, pressed: true }),
    ).toBeInTheDocument()
  })

  it("shows success toast on field creation", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockCreate = vi.mocked(ContactFieldsService.createContactFieldRoute)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({ data: [] })
    mockCreate.mockResolvedValue({
      id: "field-1",
      contact_id: "test-contact-id",
      field_type: "email",
      label: "Work",
      value: "john@work.com",
      is_primary: false,
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })

    const labelInput = screen.getByPlaceholderText("Home, Work, Mobile, ...")
    await user.type(labelInput, "Work")

    const valueInput = screen.getByPlaceholderText(
      "example@host.com / +1 555...",
    )
    await user.type(valueInput, "john@work.com")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Field added")
    })
  })


  it("shows error toast on creation failure", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockCreate = vi.mocked(ContactFieldsService.createContactFieldRoute)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({ data: [] })
    mockCreate.mockRejectedValue(new Error("Creation failed"))

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })

    const labelInput = screen.getByPlaceholderText("Home, Work, Mobile, ...")
    await user.type(labelInput, "Work")

    const valueInput = screen.getByPlaceholderText(
      "example@host.com / +1 555...",
    )
    await user.type(valueInput, "john@work.com")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Creation failed")
    })
  })

  it("shows validation error when label is missing", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })

    // Try submitting without entering label or value
    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/label is required/i)).toBeInTheDocument()
    })
  })

  it("invalidates query on successful creation", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockCreate = vi.mocked(ContactFieldsService.createContactFieldRoute)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({ data: [] })
    mockCreate.mockResolvedValue({
      id: "field-1",
      contact_id: "test-contact-id",
      field_type: "email",
      label: "Work",
      value: "john@work.com",
      is_primary: false,
    })

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />, {
      queryClient,
    })

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })

    const labelInput = screen.getByPlaceholderText("Home, Work, Mobile, ...")
    await user.type(labelInput, "Work")

    const valueInput = screen.getByPlaceholderText(
      "example@host.com / +1 555...",
    )
    await user.type(valueInput, "john@work.com")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["contact-fields", "test-contact-id"],
      })
    })
  })

  it("shows validation error when value is missing", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })

    const labelInput = screen.getByPlaceholderText("Home, Work, Mobile, ...")
    await user.type(labelInput, "Work")

    // Try submitting without value
    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/value is required/i)).toBeInTheDocument()
    })
  })

  it("displays no primary badge for non-primary fields", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Secondary",
          value: "john.backup@work.com",
          is_primary: false,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("john.backup@work.com")).toBeInTheDocument()
    })

    // Should not have primary badge
    const badges = screen.queryAllByText("primary")
    expect(badges.length).toBe(0)
  })

  it("displays multiple fields of same type", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
        {
          id: "field-2",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Personal",
          value: "john@personal.com",
          is_primary: false,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("john@work.com")).toBeInTheDocument()
      expect(screen.getByText("john@personal.com")).toBeInTheDocument()
    })
  })

  it("displays loading skeleton when data is loading", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockReturnValue(
      new Promise(() => {}),
    )

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const skeletons = document.querySelectorAll(
      ".animate-pulse, [class*='skeleton']",
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })


  it("creates phone field and sets is_primary to false by default", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockCreate = vi.mocked(ContactFieldsService.createContactFieldRoute)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({ data: [] })
    mockCreate.mockResolvedValue({
      id: "field-1",
      contact_id: "test-contact-id",
      field_type: "phone",
      label: "Mobile",
      value: "+1 555-1234",
      is_primary: false,
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add contact field")).toBeInTheDocument()
    })

    // Switch to phone type
    const phoneButton = screen.getByRole("button", {
      name: /phone/i,
      pressed: false,
    })
    await user.click(phoneButton)

    const labelInput = screen.getByPlaceholderText("Home, Work, Mobile, ...")
    await user.type(labelInput, "Mobile")

    const valueInput = screen.getByPlaceholderText(
      "example@host.com / +1 555...",
    )
    await user.type(valueInput, "+1 555-1234")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        requestBody: {
          contact_id: "test-contact-id",
          field_type: "phone",
          label: "Mobile",
          value: "+1 555-1234",
          is_primary: false,
        },
      })
    })
  })

  it("opens edit dialog when edit button is clicked", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Work:")).toBeInTheDocument()
    })

    // Find and click the edit button (in the row actions menu)
    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit contact field")).toBeInTheDocument()
    })
  })

  it("prefills edit form with existing field values", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Work:")).toBeInTheDocument()
    })

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit contact field")).toBeInTheDocument()
    })

    // Check that form fields are prefilled
    const labelInput = screen.getByPlaceholderText(
      "Home, Work, Mobile, ...",
    ) as HTMLInputElement
    const valueInput = screen.getByPlaceholderText(
      "example@host.com / +1 555...",
    ) as HTMLInputElement

    expect(labelInput.value).toBe("Work")
    expect(valueInput.value).toBe("john@work.com")
  })

  it("submits edit form with updated field data", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactFieldsService.updateContactField)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
      ],
    })

    mockUpdate.mockResolvedValue({
      id: "field-1",
      contact_id: "test-contact-id",
      field_type: "email",
      label: "Work Updated",
      value: "john.updated@work.com",
      is_primary: false,
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Work:")).toBeInTheDocument()
    })

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit contact field")).toBeInTheDocument()
    })

    const labelInput = screen.getByPlaceholderText(
      "Home, Work, Mobile, ...",
    ) as HTMLInputElement
    const valueInput = screen.getByPlaceholderText(
      "example@host.com / +1 555...",
    ) as HTMLInputElement

    await user.clear(labelInput)
    await user.type(labelInput, "Work Updated")

    await user.clear(valueInput)
    await user.type(valueInput, "john.updated@work.com")

    const saveButton = screen.getAllByRole("button", { name: /save/i })[1] // Get the save button from the edit dialog
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        fieldId: "field-1",
        requestBody: {
          field_type: "email",
          label: "Work Updated",
          value: "john.updated@work.com",
          is_primary: false,
        },
      })
    })
  })

  it("shows success toast when edit form is submitted", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactFieldsService.updateContactField)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
      ],
    })

    mockUpdate.mockResolvedValue({
      id: "field-1",
      contact_id: "test-contact-id",
      field_type: "email",
      label: "Work",
      value: "john@work.com",
      is_primary: true,
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Work:")).toBeInTheDocument()
    })

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit contact field")).toBeInTheDocument()
    })

    const saveButton = screen.getAllByRole("button", { name: /save/i })[1]
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Field updated")
    })
  })

  it("shows error toast when edit form submission fails", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactFieldsService.updateContactField)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
      ],
    })

    mockUpdate.mockRejectedValue(new Error("Update failed"))

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Work:")).toBeInTheDocument()
    })

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit contact field")).toBeInTheDocument()
    })

    const saveButton = screen.getAllByRole("button", { name: /save/i })[1]
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Update failed")
    })
  })

  it("closes edit dialog without API call when cancel is clicked", async () => {
    const { ContactFieldsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactFieldsService.updateContactField)
    const mockList = vi.mocked(ContactFieldsService.listContactFields)

    mockList.mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@work.com",
          is_primary: true,
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Work:")).toBeInTheDocument()
    })

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit contact field")).toBeInTheDocument()
    })

    const cancelButton = screen.getAllByRole("button", { name: /cancel/i })[1] // Get the cancel button from the edit dialog
    await user.click(cancelButton)

    await waitFor(() => {
      expect(
        screen.queryByText("Edit contact field"),
      ).not.toBeInTheDocument()
    })

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("email field with different type shows email form UI", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Personal",
          value: "john@personal.com",
          is_primary: false,
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Personal:")).toBeInTheDocument()
    })

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit contact field")).toBeInTheDocument()
    })

    // Verify email button is pressed
    expect(
      screen.getByRole("button", { name: /email/i, pressed: true }),
    ).toBeInTheDocument()
  })

  it("phone field with different type shows phone form UI", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "phone",
          label: "Home",
          value: "+1 555-9999",
          is_primary: false,
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("Home:")).toBeInTheDocument()
    })

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit contact field")).toBeInTheDocument()
    })

    // Verify phone button is pressed
    expect(
      screen.getByRole("button", { name: /phone/i, pressed: true }),
    ).toBeInTheDocument()
  })

  it("field row renders email value as mailto link", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Work",
          value: "john@company.com",
          is_primary: false,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      const emailLink = screen.getByRole("link", {
        name: "john@company.com",
      }) as HTMLAnchorElement
      expect(emailLink.href).toBe("mailto:john@company.com")
    })
  })

  it("field row renders phone value as tel link", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "phone",
          label: "Work",
          value: "+1 555-0000",
          is_primary: false,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      const phoneLink = screen.getByRole("link", {
        name: "+1 555-0000",
      }) as HTMLAnchorElement
      expect(phoneLink.href).toBe("tel:+1 555-0000")
    })
  })

  it("field row displays is_primary badge when field is primary", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Primary Work",
          value: "john.primary@work.com",
          is_primary: true,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("john.primary@work.com")).toBeInTheDocument()
      expect(screen.getByText("primary")).toBeInTheDocument()
    })
  })

  it("field row hides is_primary badge when field is not primary", async () => {
    const { ContactFieldsService } = await import("@/client")
    vi.mocked(ContactFieldsService.listContactFields).mockResolvedValue({
      data: [
        {
          id: "field-1",
          contact_id: "test-contact-id",
          field_type: "email",
          label: "Secondary",
          value: "john.secondary@work.com",
          is_primary: false,
        },
      ],
    })

    renderWithProviders(<ContactFieldsCard contactId="test-contact-id" />)

    await waitFor(() => {
      expect(screen.getByText("john.secondary@work.com")).toBeInTheDocument()
    })

    // Primary badge should not exist
    const badges = screen.queryAllByText("primary")
    expect(badges.length).toBe(0)
  })

})
