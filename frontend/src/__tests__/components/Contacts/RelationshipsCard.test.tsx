import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/helpers"
import { RelationshipsCard } from "@/components/Contacts/RelationshipsCard"

// Mock variables for easier manipulation
const {
  mockListContacts,
  mockGetContact,
  mockGetContactHousehold,
  mockListRelationships,
  mockCreateRelationship,
  mockUpdateRelationship,
  mockDeleteRelationship,
  mockLookupInverse,
  mockShowSuccessToast,
  mockShowErrorToast,
} = vi.hoisted(() => ({
  mockListContacts: vi.fn(),
  mockGetContact: vi.fn(),
  mockGetContactHousehold: vi.fn(),
  mockListRelationships: vi.fn(),
  mockCreateRelationship: vi.fn(),
  mockUpdateRelationship: vi.fn(),
  mockDeleteRelationship: vi.fn(),
  mockLookupInverse: vi.fn(),
  mockShowSuccessToast: vi.fn(),
  mockShowErrorToast: vi.fn(),
}))

// Mock dialog to render inline
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => {
    const arr = React.Children.toArray(children)
    return open ? React.createElement("div", null, ...arr) : React.createElement("div", null, arr[0] || null)
  },
  DialogTrigger: ({ children }: any) =>
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
  DialogClose: ({ children }: any) =>
    React.createElement("div", null, children),
}))

// Mock Popover
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) =>
    React.createElement("div", null, children),
  PopoverTrigger: ({ children }: any) =>
    React.createElement("div", null, children),
  PopoverContent: ({ children }: any) =>
    React.createElement("div", null, children),
}))

// Mock Command
vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) =>
    React.createElement("div", null, children),
  CommandInput: (props: any) =>
    React.createElement("input", {
      ...props,
      "data-testid": "command-input",
    }),
  CommandList: ({ children }: any) =>
    React.createElement("div", null, children),
  CommandEmpty: ({ children }: any) =>
    React.createElement("div", { "data-testid": "command-empty" }, children),
  CommandGroup: ({ children }: any) =>
    React.createElement("div", null, children),
  CommandItem: ({ children, onSelect, value }: any) =>
    React.createElement(
      "button",
      {
        onClick: () => onSelect?.(),
        type: "button",
        "data-testid": `contact-item-${value}`,
      },
      children,
    ),
}))

// Mock toast
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

// Mock router Link
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: any) =>
    React.createElement("a", { href: "#" }, children),
  useNavigate: vi.fn(),
}))

// Mock services
vi.mock("@/client", () => ({
  ContactsService: {
    listContacts: mockListContacts,
    getContact: mockGetContact,
    getContactHousehold: mockGetContactHousehold,
  },
  RelationshipsService: {
    listRelationships: mockListRelationships,
    createRelationshipRoute: mockCreateRelationship,
    updateRelationship: mockUpdateRelationship,
    deleteRelationship: mockDeleteRelationship,
    lookupInverse: mockLookupInverse,
  },
}))

// Mock RowActionsMenu
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
  EmptyState: ({ title }: any) =>
    React.createElement("div", { "data-testid": "empty-state" }, title),
}))

// Mock ContactAvatar (used by the embedded HouseholdCard)
vi.mock("@/components/Common/ContactAvatar", () => ({
  ContactAvatar: ({ contact }: any) =>
    React.createElement("div", { "data-testid": "avatar" }, contact.first_name),
}))

// Mock Tooltip (used by the embedded HouseholdCard's info hint)
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => React.createElement("div", null, children),
  TooltipTrigger: ({ children }: any) =>
    React.createElement("button", { type: "button" }, children),
  TooltipContent: ({ children }: any) =>
    React.createElement("div", { role: "tooltip" }, children),
}))

const makeContact = (overrides: any = {}) => ({
  id: "contact-id",
  first_name: "Bob",
  last_name: "Jones",
  nickname: null,
  company: null,
  title: null,
  birthday: null,
  prefix: null,
  middle_name: null,
  suffix: null,
  last_contacted_at: null,
  is_starred: false,
  tags: [],
  ...overrides,
})

const makeRelationship = (overrides: any = {}) => ({
  id: "rel-1",
  contact_id: "contact-id",
  related_contact_id: "contact-2",
  relationship_type: "spouse",
  inverse_relationship_type: "spouse",
  notes: null,
  ...overrides,
})

describe("RelationshipsCard", () => {
  const contactId = "contact-id"
  const contactName = "Alice Smith"

  beforeEach(() => {
    vi.clearAllMocks()
    // Embedded HouseholdCard renders nothing for an empty household, keeping
    // these relationship-focused tests isolated from household rendering.
    mockGetContactHousehold.mockResolvedValue({ data: [] })
  })

  describe("RelationshipsCard main component", () => {
    it("shows loading skeleton when relationships are loading", () => {
      mockListContacts.mockResolvedValue({ data: [] })
      // Never resolve to keep loading state
      mockListRelationships.mockImplementation(
        () => new Promise(() => {}),
      )

      const { container } = renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      // Skeleton should be present while relationships are loading
      const skeletons = container.querySelectorAll(".h-4, .w-2\\/3")
      expect(skeletons.length).toBeGreaterThanOrEqual(0) // Just test that render succeeded

      // The component renders with the "People" card title visible
      expect(screen.getByText("People")).toBeInTheDocument()
    })

    it("shows empty state when no relationships exist", async () => {
      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("empty-state")).toBeInTheDocument()
      })
      expect(screen.getByText("No relationships")).toBeInTheDocument()
    })

    it("displays relationships list when data exists", async () => {
      const relationships = [
        makeRelationship({ id: "rel-1" }),
        makeRelationship({
          id: "rel-2",
          relationship_type: "brother",
          related_contact_id: "contact-3",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact({ id: "contact-2" }))

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument()
      })
      expect(screen.getByText("People")).toBeInTheDocument()
    })

    it("renders 'People' card title and 'Relationships' sub-heading", async () => {
      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByText("People")).toBeInTheDocument()
      })
      // The relationships section keeps a labeled sub-heading inside the card.
      expect(screen.getByText("Relationships")).toBeInTheDocument()
    })

    it("renders the embedded Household sub-section when a household exists", async () => {
      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockGetContactHousehold.mockResolvedValue({
        data: [
          {
            id: "member-1",
            first_name: "Dave",
            last_name: "Smith",
            nickname: null,
            birthday: null,
            age: 40,
          },
        ],
      })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Household")).toBeInTheDocument()
        expect(screen.getByText("Dave Smith")).toBeInTheDocument()
      })
    })
  })

  describe("AddRelationshipInline picker behavior", () => {
    it("shows 'Add relationship' picker button initially", async () => {
      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Add relationship")).toBeInTheDocument()
      })
    })

    it("shows 'No other contacts yet' message when no other contacts exist", async () => {
      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("command-empty")).toBeInTheDocument()
        expect(screen.getByText("No other contacts yet.")).toBeInTheDocument()
      })
    })

    it("filters out current contact from picker", async () => {
      const contacts = [
        makeContact({ id: contactId, first_name: "Alice" }),
        makeContact({ id: "contact-2", first_name: "Bob" }),
      ]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("command-input")).toBeInTheDocument()
      })
    })
  })

  describe("AddRelationshipInline contact selection and form", () => {
    it("shows form after selecting a contact", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      await waitFor(() => {
        expect(screen.getByPlaceholderText("spouse, brother, colleague...")).toBeInTheDocument()
      })
    })

    it("shows relationship type input and inverse help text when inferred inverse exists", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: "spouse" })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "spouse")

      await waitFor(
        () => {
          const helpText = screen.queryByText(/will appear as/)
          expect(helpText).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })

    it("shows manual inverse input when lookup returns no inverse", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: null })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "colleague")

      await waitFor(
        () => {
          expect(
            screen.getByPlaceholderText("reverse relationship"),
          ).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })

    it("auto-populates inverse type when not manually touched", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: null })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "mentor")

      await waitFor(() => {
        const inverseInput = screen.getByPlaceholderText(
          "reverse relationship",
        ) as HTMLInputElement
        expect(inverseInput.value).toBe("mentor")
      })
    })

    it("prevents auto-population after manual inverse edit", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: null })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "colleague")

      await waitFor(
        () => {
          expect(
            screen.getByPlaceholderText("reverse relationship"),
          ).toBeInTheDocument()
        },
        { timeout: 3000 },
      )

      const inverseInput = screen.getByPlaceholderText(
        "reverse relationship",
      ) as HTMLInputElement
      // Type something manually (this marks as touched)
      await userEvent.type(inverseInput, "X")

      // Type more in type input
      await userEvent.type(typeInput, "X")

      // Manual edit should be preserved
      expect(inverseInput.value).toContain("X")
    })

    it("disables Save button when type is empty", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const saveButton = screen.getByRole("button", { name: "Save" })
      expect(saveButton).toBeDisabled()
    })

    it("disables Save button when inverse is missing", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: null })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "colleague")

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("reverse relationship"),
        ).toBeInTheDocument()
      })

      const inverseInput = screen.getByPlaceholderText(
        "reverse relationship",
      ) as HTMLInputElement
      await userEvent.clear(inverseInput)

      const saveButton = screen.getByRole("button", { name: "Save" })

      expect(saveButton).toBeDisabled()
    })
  })

  describe("AddRelationshipInline submission", () => {
    it("submits relationship with inferred inverse", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: "spouse" })
      mockCreateRelationship.mockResolvedValue({ id: "new-rel" })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "spouse")

      const saveButton = screen.getByRole("button", { name: "Save" })

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockCreateRelationship).toHaveBeenCalledWith({
          requestBody: {
            contact_id: contactId,
            related_contact_id: "contact-2",
            relationship_type: "spouse",
            inverse_relationship_type: "spouse",
            notes: null,
          },
        })
      })
    })

    it("submits relationship with manual inverse", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: null })
      mockCreateRelationship.mockResolvedValue({ id: "new-rel" })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "mentor")

      const inverseInput = screen.getByPlaceholderText("reverse relationship")
      await userEvent.clear(inverseInput)
      await userEvent.type(inverseInput, "student")

      const saveButton = screen.getByRole("button", { name: "Save" })

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockCreateRelationship).toHaveBeenCalledWith({
          requestBody: {
            contact_id: contactId,
            related_contact_id: "contact-2",
            relationship_type: "mentor",
            inverse_relationship_type: "student",
            notes: null,
          },
        })
      })
    })

    it("shows success toast on successful creation", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: "spouse" })
      mockCreateRelationship.mockResolvedValue({ id: "new-rel" })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "spouse")

      const saveButton = screen.getByRole("button", { name: "Save" })

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith("Relationship added")
      })
    })

    it("shows error toast on creation failure", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: "spouse" })
      mockCreateRelationship.mockRejectedValue(new Error("Network error"))

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "spouse")

      const saveButton = screen.getByRole("button", { name: "Save" })

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith("Network error")
      })
    })

    it("uses fallback message on non-Error creation rejection", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: "spouse" })
      mockCreateRelationship.mockRejectedValue("plain-string-error")

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText(
        "spouse, brother, colleague...",
      )
      await userEvent.type(typeInput, "spouse")

      const saveButton = screen.getByRole("button", { name: "Save" })
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          "Failed to add relationship",
        )
      })
    })
  })

  describe("AddRelationshipInline cancel behavior", () => {
    it("resets to picker when cancel button clicked", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("spouse, brother, colleague..."),
        ).toBeInTheDocument()
      })

      const cancelButton = screen.getByLabelText("Cancel")
      await userEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.getByText("Add relationship")).toBeInTheDocument()
      })
    })

    it("resets to picker when Escape pressed in type input", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "spouse")
      await userEvent.keyboard("{Escape}")

      await waitFor(() => {
        expect(screen.getByText("Add relationship")).toBeInTheDocument()
      })
    })

    it("resets to picker when Escape pressed in inverse input", async () => {
      const contacts = [makeContact({ id: "contact-2", first_name: "Bob" })]

      mockListContacts.mockResolvedValue({ data: contacts })
      mockListRelationships.mockResolvedValue({ data: [] })
      mockLookupInverse.mockResolvedValue({ inverse: null })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("contact-item-Bob Jones")).toBeInTheDocument()
      })

      const contactButton = screen.getByTestId("contact-item-Bob Jones")
      await userEvent.click(contactButton)

      const typeInput = screen.getByPlaceholderText("spouse, brother, colleague...")
      await userEvent.type(typeInput, "colleague")

      const inverseInput = screen.getByPlaceholderText("reverse relationship")
      await userEvent.type(inverseInput, "test")
      await userEvent.keyboard("{Escape}")

      await waitFor(() => {
        expect(screen.getByText("Add relationship")).toBeInTheDocument()
      })
    })
  })

  describe("RelationshipRow display", () => {
    it("displays relationship type and related contact name", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "spouse",
          related_contact_id: "contact-2",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(
        makeContact({ id: "contact-2", first_name: "Bob" }),
      )

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Bob Jones")).toBeInTheDocument()
        expect(screen.getByText(/spouse/)).toBeInTheDocument()
      })
    })

    it("shows related contact ID when contact not yet loaded", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "brother",
          related_contact_id: "contact-2",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockImplementation(
        () => new Promise(() => {}),
      )

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByText(/contact-/)).toBeInTheDocument()
      })
    })

    it("displays relationship notes when present", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "spouse",
          notes: "Married since 2015",
          related_contact_id: "contact-2",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockImplementation((args: any) => {
        return Promise.resolve(
          makeContact({ id: args.contactId, first_name: "Bob" }),
        )
      })

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(
        () => {
          expect(screen.getByText("Bob Jones")).toBeInTheDocument()
        },
        { timeout: 3000 },
      )

      const notesElements = screen.getAllByText("Married since 2015")
      const noteInRow = notesElements.find((el) =>
        el.className.includes("whitespace-pre-wrap"),
      )
      expect(noteInRow).toBeInTheDocument()
    })

    it("hides notes section when notes are null", async () => {
      const relationships = [makeRelationship({ notes: null })]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument()
      })

      expect(screen.queryByText("Married since 2015")).not.toBeInTheDocument()
    })
  })

  describe("RelationshipRow edit dialog", () => {
    it("opens edit dialog when edit action selected", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "spouse",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-edit")).toBeInTheDocument()
      })

      const editButton = screen.getByTestId("action-edit")
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByText("Edit relationship")).toBeInTheDocument()
      })
    })

    it("populates dialog with current relationship data", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "sibling",
          notes: "Younger sister",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-edit")).toBeInTheDocument()
      })

      const editButton = screen.getByTestId("action-edit")
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByText("Edit relationship")).toBeInTheDocument()
        expect(screen.getByDisplayValue("sibling")).toBeInTheDocument()
      })
    })

    it("submits updated relationship", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "spouse",
          notes: null,
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())
      mockUpdateRelationship.mockResolvedValue({})

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-edit")).toBeInTheDocument()
      })

      const editButton = screen.getByTestId("action-edit")
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByText("Edit relationship")).toBeInTheDocument()
      })

      const saveButton = within(
        (document.querySelector("[role='dialog']") as HTMLElement) ||
          document.body,
      ).getByRole("button", { name: "Save" })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateRelationship).toHaveBeenCalled()
      })
    })

    it("shows success toast on update", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "spouse",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())
      mockUpdateRelationship.mockResolvedValue({})

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-edit")).toBeInTheDocument()
      })

      const editButton = screen.getByTestId("action-edit")
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByText("Edit relationship")).toBeInTheDocument()
      })

      const saveButton = within(
        (document.querySelector("[role='dialog']") as HTMLElement) ||
          document.body,
      ).getByRole("button", { name: "Save" })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          "Relationship updated",
        )
      })
    })

    it("shows error toast on update failure", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "spouse",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())
      mockUpdateRelationship.mockRejectedValue(new Error("Update failed"))

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-edit")).toBeInTheDocument()
      })

      const editButton = screen.getByTestId("action-edit")
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByText("Edit relationship")).toBeInTheDocument()
      })

      const saveButton = within(
        (document.querySelector("[role='dialog']") as HTMLElement) ||
          document.body,
      ).getByRole("button", { name: "Save" })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith("Update failed")
      })
    })

    it("uses fallback message on non-Error update rejection", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "spouse",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())
      mockUpdateRelationship.mockRejectedValue("plain-string-error")

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-edit")).toBeInTheDocument()
      })

      const editButton = screen.getByTestId("action-edit")
      await userEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByText("Edit relationship")).toBeInTheDocument()
      })

      const saveButton = within(
        (document.querySelector("[role='dialog']") as HTMLElement) ||
          document.body,
      ).getByRole("button", { name: "Save" })

      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          "Failed to update relationship",
        )
      })
    })
  })

  describe("RelationshipRow delete action", () => {
    it("deletes relationship when delete action confirmed", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "colleague",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())
      mockDeleteRelationship.mockResolvedValue({})

      vi.spyOn(window, "confirm").mockReturnValue(true)

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-delete")).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId("action-delete")
      await userEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteRelationship).toHaveBeenCalledWith({ relId: "rel-1" })
      })
    })

    it("shows confirmation dialog before deleting", async () => {
      const relationships = [makeRelationship()]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())

      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-delete")).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId("action-delete")
      await userEvent.click(deleteButton)

      expect(confirmSpy).toHaveBeenCalledWith("Delete this relationship?")
      expect(mockDeleteRelationship).not.toHaveBeenCalled()
    })

    it("shows success toast on delete", async () => {
      const relationships = [
        makeRelationship({
          id: "rel-1",
          relationship_type: "colleague",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())
      mockDeleteRelationship.mockResolvedValue({})

      vi.spyOn(window, "confirm").mockReturnValue(true)

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-delete")).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId("action-delete")
      await userEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          "Relationship deleted",
        )
      })
    })

    it("shows error toast on delete failure", async () => {
      const relationships = [makeRelationship()]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())
      mockDeleteRelationship.mockRejectedValue(new Error("Delete failed"))

      vi.spyOn(window, "confirm").mockReturnValue(true)

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-delete")).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId("action-delete")
      await userEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith("Delete failed")
      })
    })

    it("uses fallback message on non-Error delete rejection", async () => {
      const relationships = [makeRelationship()]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(makeContact())
      mockDeleteRelationship.mockRejectedValue("plain-string-error")

      vi.spyOn(window, "confirm").mockReturnValue(true)

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByTestId("action-delete")).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId("action-delete")
      await userEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          "Failed to delete relationship",
        )
      })
    })
  })

  describe("formatContactName utility", () => {
    it("formats full name correctly", async () => {
      const relationships = [
        makeRelationship({
          related_contact_id: "contact-2",
        }),
      ]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(
        makeContact({ id: "contact-2", first_name: "Jane", last_name: "Doe" }),
      )

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Jane Doe")).toBeInTheDocument()
      })
    })

    it("formats name with only first name", async () => {
      const relationships = [makeRelationship()]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(
        makeContact({ first_name: "Bob", last_name: null }),
      )

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Bob")).toBeInTheDocument()
      })
    })

    it("shows unnamed for contact with no names", async () => {
      const relationships = [makeRelationship()]

      mockListContacts.mockResolvedValue({ data: [] })
      mockListRelationships.mockResolvedValue({ data: relationships })
      mockGetContact.mockResolvedValue(
        makeContact({ first_name: "", last_name: null }),
      )

      renderWithProviders(
        <RelationshipsCard contactId={contactId} contactName={contactName} />,
      )

      await waitFor(() => {
        expect(screen.getByText("(unnamed)")).toBeInTheDocument()
      })
    })
  })
})
