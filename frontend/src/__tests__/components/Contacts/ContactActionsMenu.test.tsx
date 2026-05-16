import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ContactActionsMenu } from "@/components/Contacts/ContactActionsMenu"
import { renderWithProviders, makeContact } from "@/test/helpers"

// Mock router
const mockNavigate = vi.fn()
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => (
      <a href={String(to)} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
  }
})

// Mock API client
vi.mock("@/client", () => ({
  ContactsService: {
    deleteContact: vi.fn(),
  },
}))

// Mock toast
vi.mock("sonser", () => ({
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

// Mock RowActionsMenu
vi.mock("@/components/Common/RowActionsMenu", () => ({
  RowActionsMenu: ({ items }: any) => (
    <div data-testid="row-actions-menu">
      {items.map((item: any, idx: number) => (
        <button key={idx} onClick={() => item.onSelect()}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  Pencil: () => null,
  Trash2: () => null,
}))

describe("ContactActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders menu actions", () => {
    const contact = makeContact()
    renderWithProviders(<ContactActionsMenu contact={contact} />)

    expect(screen.getByText("View")).toBeInTheDocument()
    expect(screen.getByText("Edit")).toBeInTheDocument()
    expect(screen.getByText("Delete")).toBeInTheDocument()
  })

  it("navigates to contact on View click", async () => {
    const contact = makeContact({ id: "contact-123" })
    const user = userEvent.setup()

    renderWithProviders(<ContactActionsMenu contact={contact} />)

    const viewButton = screen.getByText("View")
    await user.click(viewButton)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/contacts/$contactId",
      params: { contactId: "contact-123" },
    })
  })

  it("navigates to contact on Edit click", async () => {
    const contact = makeContact({ id: "contact-456" })
    const user = userEvent.setup()

    renderWithProviders(<ContactActionsMenu contact={contact} />)

    const editButton = screen.getByText("Edit")
    await user.click(editButton)

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/contacts/$contactId",
      params: { contactId: "contact-456" },
    })
  })

  it("calls deleteContact mutation on Delete click", async () => {
    const { ContactsService } = await import("@/client")
    const mockDeleteContact = vi.mocked(ContactsService.deleteContact)
    mockDeleteContact.mockResolvedValue({})

    const contact = makeContact({ id: "contact-789" })
    const user = userEvent.setup()

    renderWithProviders(<ContactActionsMenu contact={contact} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteContact).toHaveBeenCalledWith({
        contactId: "contact-789",
      })
    })
  })

  it("shows success toast on successful deletion", async () => {
    const { ContactsService } = await import("@/client")
    const mockDeleteContact = vi.mocked(ContactsService.deleteContact)
    mockDeleteContact.mockResolvedValue({})

    const contact = makeContact()
    const user = userEvent.setup()

    renderWithProviders(<ContactActionsMenu contact={contact} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Contact deleted")
    })
  })

  it("invalidates contacts query on successful deletion", async () => {
    const { ContactsService } = await import("@/client")
    const mockDeleteContact = vi.mocked(ContactsService.deleteContact)
    mockDeleteContact.mockResolvedValue({})

    const contact = makeContact()
    const user = userEvent.setup()

    const { queryClient } = renderWithProviders(<ContactActionsMenu contact={contact} />)
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contacts"] })
    })
  })

  it("shows error toast on deletion failure", async () => {
    const { ContactsService } = await import("@/client")
    const mockDeleteContact = vi.mocked(ContactsService.deleteContact)
    mockDeleteContact.mockRejectedValue(new Error("API error"))

    const contact = makeContact()
    const user = userEvent.setup()

    renderWithProviders(<ContactActionsMenu contact={contact} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Failed to delete contact")
    })
  })

  it("does not show success toast on deletion failure", async () => {
    const { ContactsService } = await import("@/client")
    const mockDeleteContact = vi.mocked(ContactsService.deleteContact)
    mockDeleteContact.mockRejectedValue(new Error("API error"))

    const contact = makeContact()
    const user = userEvent.setup()

    renderWithProviders(<ContactActionsMenu contact={contact} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).not.toHaveBeenCalled()
    })
  })

  it("handles navigation with different contact IDs", async () => {
    const contacts = [
      makeContact({ id: "id-1" }),
      makeContact({ id: "id-2" }),
      makeContact({ id: "id-3" }),
    ]

    const user = userEvent.setup()

    for (const contact of contacts) {
      vi.clearAllMocks()
      const { unmount } = renderWithProviders(
        <ContactActionsMenu contact={contact} />
      )

      const viewButton = screen.getByText("View")
      await user.click(viewButton)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/contacts/$contactId",
        params: { contactId: contact.id },
      })

      unmount()
    }
  })

  it("renders with contact data passed as prop", () => {
    const contact = makeContact({
      id: "specific-id",
      first_name: "John",
      last_name: "Doe",
    })

    renderWithProviders(<ContactActionsMenu contact={contact} />)

    // Component doesn't directly display contact info, but should render without errors
    expect(screen.getByTestId("row-actions-menu")).toBeInTheDocument()
  })
})
