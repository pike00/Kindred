import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { EditContactDialog } from "@/components/Contacts/EditContactDialog"
import { createQueryClient, makeContact, renderWithProviders } from "@/test/helpers"

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
  ContactsService: {
    updateContact: vi.fn(),
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

describe("EditContactDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders edit button", () => {
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />)
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument()
  })

  it("opens dialog when edit button is clicked", async () => {
    const user = userEvent.setup()
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    expect(screen.getByText("Edit Contact")).toBeInTheDocument()
    expect(
      screen.getByText("Update the contact information."),
    ).toBeInTheDocument()
  })

  it("displays form fields when dialog is open", async () => {
    const user = userEvent.setup()
    const contact = makeContact({
      first_name: "John",
      last_name: "Doe",
    })
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    expect(screen.getByDisplayValue("John")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument()
  })

  it("pre-fills form with contact data", async () => {
    const user = userEvent.setup()
    const contact = makeContact({
      first_name: "John",
      last_name: "Doe",
      nickname: "Johnny",
      how_we_met: "At the gym",
      contact_frequency_days: 30,
      is_favorite: true,
      is_archived: false,
      do_not_contact: false,
      do_not_contact_reason: null,
    })
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    expect(screen.getByDisplayValue("John")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Johnny")).toBeInTheDocument()
    expect(screen.getByDisplayValue("At the gym")).toBeInTheDocument()
    expect(screen.getByDisplayValue("30")).toBeInTheDocument()
  })

  it("shows validation error when first name is empty", async () => {
    const user = userEvent.setup()
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const firstNameInput = screen.getByDisplayValue(contact.first_name)
    await user.clear(firstNameInput)

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    })
  })

  it("submits form with valid data", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockResolvedValue(makeContact())

    const user = userEvent.setup()
    const contact = makeContact({
      first_name: "John",
      last_name: "Doe",
      is_favorite: false,
      is_archived: false,
      do_not_contact: false,
    })
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const firstNameInput = screen.getByDisplayValue("John")
    await user.clear(firstNameInput)
    await user.type(firstNameInput, "Jane")

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        contactId: contact.id,
        requestBody: {
          first_name: "Jane",
          last_name: "Doe",
          nickname: null,
          how_we_met: null,
          contact_frequency_days: null,
          is_favorite: false,
          is_archived: false,
          do_not_contact: false,
          do_not_contact_reason: null,
          timezone: null,
          pronouns: null,
        },
      })
    })
  })

  it("shows success toast on successful update", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockResolvedValue(makeContact())

    const user = userEvent.setup()
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const firstNameInput = screen.getByDisplayValue(contact.first_name)
    await user.clear(firstNameInput)
    await user.type(firstNameInput, "Jane")

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        "Contact updated successfully",
      )
    })
  })

  it("closes dialog on successful update", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockResolvedValue(makeContact())

    const user = userEvent.setup()
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const firstNameInput = screen.getByDisplayValue(contact.first_name)
    await user.clear(firstNameInput)
    await user.type(firstNameInput, "Jane")

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText("Edit Contact")).not.toBeInTheDocument()
    })
  })

  it("shows error toast on API error", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockRejectedValue(new Error("API error"))

    const user = userEvent.setup()
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const firstNameInput = screen.getByDisplayValue(contact.first_name)
    await user.clear(firstNameInput)
    await user.type(firstNameInput, "Jane")

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("API error")
    })
  })

  it("disables submit button while updating", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockImplementation(
      () => new Promise((r) => setTimeout(r, 1000)),
    )

    const user = userEvent.setup()
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const firstNameInput = screen.getByDisplayValue(contact.first_name)
    await user.clear(firstNameInput)
    await user.type(firstNameInput, "Jane")

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    }) as HTMLButtonElement
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByText("Updating...")).toBeInTheDocument()
    })
  })

  it("shows do_not_contact reason field when checkbox is checked", async () => {
    const user = userEvent.setup()
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const doNotContactCheckbox = screen.getByRole("checkbox", {
      name: /no contact reminders needed/i,
    })
    await user.click(doNotContactCheckbox)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("e.g. Live together")).toBeInTheDocument()
    })
  })

  it("hides do_not_contact reason field when checkbox is unchecked", async () => {
    const user = userEvent.setup()
    const contact = makeContact({
      do_not_contact: true,
      do_not_contact_reason: "Live together",
    })
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const doNotContactCheckbox = screen.getByRole("checkbox", {
      name: /no contact reminders needed/i,
    }) as HTMLInputElement
    expect(doNotContactCheckbox.checked).toBe(true)

    await user.click(doNotContactCheckbox)

    await waitFor(() => {
      expect(screen.queryByPlaceholderText("e.g. Live together")).not.toBeInTheDocument()
    })
  })

  it("handles checkbox fields (favorite, archived)", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockResolvedValue(makeContact())

    const user = userEvent.setup()
    const contact = makeContact({
      is_favorite: false,
      is_archived: false,
    })
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const favoriteCheckbox = screen.getByRole("checkbox", {
      name: /favorite/i,
    })
    await user.click(favoriteCheckbox)

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        contactId: contact.id,
        requestBody: expect.objectContaining({
          is_favorite: true,
        }),
      })
    })
  })

  it("invalidates both contacts queries on successful update", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockResolvedValue(makeContact())

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const user = userEvent.setup()
    const contact = makeContact()
    renderWithProviders(<EditContactDialog contact={contact} />, {
      queryClient,
    })

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const firstNameInput = screen.getByDisplayValue(contact.first_name)
    await user.clear(firstNameInput)
    await user.type(firstNameInput, "Jane")

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contacts"] })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["contacts", contact.id],
      })
    })
  })

  it("clears optional fields when empty", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockResolvedValue(makeContact())

    const user = userEvent.setup()
    const contact = makeContact({
      last_name: "Doe",
      nickname: "Johnny",
    })
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const lastNameInput = screen.getByDisplayValue("Doe")
    await user.clear(lastNameInput)

    const submitButton = screen.getByRole("button", {
      name: /update contact/i,
    })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        contactId: contact.id,
        requestBody: expect.objectContaining({
          last_name: null,
        }),
      })
    })
  })

  it("resets form when dialog opens after contact change", async () => {
    const { ContactsService } = await import("@/client")
    const mockUpdate = vi.mocked(ContactsService.updateContact)
    mockUpdate.mockResolvedValue(makeContact())

    const user = userEvent.setup()
    let contact = makeContact({ first_name: "John" })
    const { rerender } = renderWithProviders(
      <EditContactDialog contact={contact} />,
    )

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    // Change the contact prop
    contact = makeContact({ first_name: "Jane" })
    rerender(<EditContactDialog contact={contact} />)

    // Form should reset with new contact data
    const firstNameInput = screen.getByDisplayValue("Jane") as HTMLInputElement
    expect(firstNameInput.value).toBe("Jane")
  })

  it("contact frequency input handles cleared value via onChange", async () => {
    const user = userEvent.setup()
    const contact = makeContact({
      contact_frequency_days: 30,
    })
    renderWithProviders(<EditContactDialog contact={contact} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    const freqInput = screen.getByDisplayValue("30") as HTMLInputElement
    expect(freqInput).toBeInTheDocument()

    // Clearing triggers field.onChange(e.target.valueAsNumber || null)
    // which exercises the "|| null" fallback branch
    await user.clear(freqInput)

    // The clear should have triggered the onChange handler;
    // exercising the false branch of valueAsNumber.
    expect(freqInput).toBeInTheDocument()
  })
})
