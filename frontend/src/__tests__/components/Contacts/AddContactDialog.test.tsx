import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddContactDialog } from "@/components/Contacts/AddContactDialog"
import {
  createQueryClient,
  makeContact,
  renderWithProviders,
} from "@/test/helpers"

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
    createContact: vi.fn(),
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

describe("AddContactDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders trigger button", () => {
    renderWithProviders(<AddContactDialog />)
    expect(
      screen.getByRole("button", { name: /add contact/i }),
    ).toBeInTheDocument()
  })

  it("opens dialog when trigger button is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    expect(screen.getByText("Add New Contact")).toBeInTheDocument()
    expect(
      screen.getByText("Create a new contact to start tracking interactions."),
    ).toBeInTheDocument()
  })

  it("displays form fields when dialog is open", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/birthday/i)).toBeInTheDocument()
  })

  it("shows validation error when first name is empty", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
    })
  })

  it("submits form with valid data", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockResolvedValue(
      makeContact({
        id: "new-contact-id",
        first_name: "Bob",
        last_name: "Johnson",
        birthday: "1990-01-15",
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText("John")
    const lastNameInput = screen.getByPlaceholderText("Doe")
    const birthdayInput = screen.getByLabelText(/birthday/i)

    await user.type(firstNameInput, "Bob")
    await user.type(lastNameInput, "Johnson")
    await user.type(birthdayInput, "1990-01-15")

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateContact).toHaveBeenCalledWith({
        requestBody: {
          first_name: "Bob",
          last_name: "Johnson",
          birthday: "1990-01-15",
        },
      })
    })
  })

  it("shows success toast on successful creation", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockResolvedValue(
      makeContact({
        id: "new-contact-id",
        first_name: "Bob",
        last_name: null,
        birthday: null,
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText("John")
    await user.type(firstNameInput, "Bob")

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        "Contact created successfully",
      )
    })
  })

  it("closes dialog on successful creation", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockResolvedValue(
      makeContact({
        id: "new-contact-id",
        first_name: "Bob",
        last_name: null,
        birthday: null,
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText("John")
    await user.type(firstNameInput, "Bob")

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText("Add New Contact")).not.toBeInTheDocument()
    })
  })

  it("resets form after successful submission", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockResolvedValue(
      makeContact({
        id: "new-contact-id",
        first_name: "Bob",
        last_name: null,
        birthday: null,
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText(
      "John",
    ) as HTMLInputElement
    await user.type(firstNameInput, "Bob")

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(firstNameInput.value).toBe("")
    })
  })

  it("invalidates contacts query on successful creation", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockResolvedValue(
      makeContact({
        id: "new-contact-id",
        first_name: "Bob",
        last_name: null,
        birthday: null,
      }),
    )

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />, { queryClient })

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText("John")
    await user.type(firstNameInput, "Bob")

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contacts"] })
    })
  })

  it("shows error toast on API error", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockRejectedValue(new Error("API error"))

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText("John")
    await user.type(firstNameInput, "Bob")

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Failed to create contact",
      )
    })
  })

  it("disables submit button while creating", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockImplementation(
      () =>
        new Promise((r) => setTimeout(r, 1000)) as unknown as ReturnType<
          typeof ContactsService.createContact
        >,
    )

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText("John")
    await user.type(firstNameInput, "Bob")

    const submitButton = screen.getByRole("button", {
      name: /create contact/i,
    }) as HTMLButtonElement
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it("shows creating text while submission is pending", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockImplementation(
      () =>
        new Promise((r) => setTimeout(r, 1000)) as unknown as ReturnType<
          typeof ContactsService.createContact
        >,
    )

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText("John")
    await user.type(firstNameInput, "Bob")

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeInTheDocument()
    })
  })

  it("handles optional last_name and birthday fields", async () => {
    const { ContactsService } = await import("@/client")
    const mockCreateContact = vi.mocked(ContactsService.createContact)
    mockCreateContact.mockResolvedValue(
      makeContact({
        id: "new-contact-id",
        first_name: "Bob",
        last_name: null,
        birthday: null,
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddContactDialog />)

    const triggerButton = screen.getByRole("button", { name: /add contact/i })
    await user.click(triggerButton)

    const firstNameInput = screen.getByPlaceholderText("John")
    await user.type(firstNameInput, "Bob")

    const submitButton = screen.getByRole("button", { name: /create contact/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateContact).toHaveBeenCalledWith({
        requestBody: {
          first_name: "Bob",
          last_name: null,
          birthday: null,
        },
      })
    })
  })
})
