import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StayInTouchWidget } from "@/components/Dashboard/StayInTouchWidget"
import { makeContact, renderWithProviders } from "@/test/helpers"

const { mockListOverdueContacts } = vi.hoisted(() => ({
  mockListOverdueContacts: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params, ...props }: any) => (
    <a href={`/contacts/${params.contactId}`} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/client", () => ({
  ContactsService: {
    listOverdueContacts: mockListOverdueContacts,
  },
}))

vi.mock("@/components/Common/ContactAvatar", () => ({
  ContactAvatar: ({ contact }: any) => (
    <div data-testid={`avatar-${contact.id}`}>avatar</div>
  ),
}))

vi.mock("@/components/Interactions/AddInteractionDialog", () => ({
  AddInteractionDialog: () => (
    <button type="button">Log interaction</button>
  ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock("@/lib/icons", () => ({
  Clock: () => <span aria-hidden="true" />,
  SkipForward: () => <span aria-hidden="true" />,
}))

describe("StayInTouchWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListOverdueContacts.mockResolvedValue({
      count: 1,
      data: [
        makeContact({
          id: "contact-1",
          first_name: "Alice",
          last_name: "Smith",
          company: "Acme Corp",
        }),
      ],
    })
  })

  it("links the contact identity and keeps row actions outside the link", async () => {
    const user = userEvent.setup()
    renderWithProviders(<StayInTouchWidget />)

    const contactLink = await screen.findByRole("link", {
      name: "View Alice Smith, Acme Corp",
    })
    expect(contactLink).toHaveAttribute("href", "/contacts/contact-1")
    expect(within(contactLink).getByText("Alice Smith")).toBeInTheDocument()
    expect(within(contactLink).getByText("Acme Corp")).toBeInTheDocument()
    expect(contactLink).toHaveClass("focus-visible:ring-2")

    const interactionButton = screen.getByRole("button", {
      name: "Log interaction",
    })
    const skipButton = screen.getByTitle("Skip this week")
    expect(interactionButton.closest("a")).toBeNull()
    expect(skipButton.closest("a")).toBeNull()

    await user.tab()
    expect(document.activeElement).toBe(contactLink)
    await user.tab()
    expect(document.activeElement).toBe(interactionButton)
    await user.tab()
    expect(document.activeElement).toBe(skipButton)
  })

  it("includes do-not-contact context in the accessible name", async () => {
    mockListOverdueContacts.mockResolvedValueOnce({
      count: 1,
      data: [
        makeContact({
          id: "contact-2",
          first_name: "Bob",
          do_not_contact: true,
        }),
      ],
    })

    renderWithProviders(<StayInTouchWidget />)

    await waitFor(() => {
      expect(
        screen.getByRole("link", {
          name: "View Bob Smith, Do not contact",
        }),
      ).toBeInTheDocument()
    })
  })
})
