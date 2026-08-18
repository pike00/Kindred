import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StayInTouchWidget } from "@/components/Dashboard/StayInTouchWidget"
import { cancelable, makeContact, renderWithProviders } from "@/test/helpers"

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

describe("StayInTouchWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders empty state when there are no overdue contacts", async () => {
    mockListOverdueContacts.mockReturnValue(
      cancelable({ data: [], count: 0 }),
    )

    renderWithProviders(<StayInTouchWidget />)

    await waitFor(() => {
      expect(screen.getByText("Everyone's caught up!")).toBeInTheDocument()
    })
  })

  it("renders all contacts when count is 2 or less", async () => {
    const contacts = [
      makeContact({ id: "1", first_name: "Alice", last_name: "", days_overdue: 5 }),
      makeContact({ id: "2", first_name: "Bob", last_name: "", days_overdue: 10 }),
    ]
    mockListOverdueContacts.mockReturnValue(
      cancelable({ data: contacts, count: 2 }),
    )

    renderWithProviders(<StayInTouchWidget />)

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Bob")).toBeInTheDocument()
      expect(
        screen.queryByText(/more overdue/),
      ).not.toBeInTheDocument()
    })
  })

  it("limits displayed contacts to 2 and shows +X more overdue button when count > 2", async () => {
    const contacts = [
      makeContact({ id: "1", first_name: "Alice", last_name: "", days_overdue: 5 }),
      makeContact({ id: "2", first_name: "Bob", last_name: "", days_overdue: 10 }),
      makeContact({ id: "3", first_name: "Charlie", last_name: "", days_overdue: 15 }),
      makeContact({ id: "4", first_name: "Diana", last_name: "", days_overdue: 20 }),
      makeContact({ id: "5", first_name: "Evan", last_name: "", days_overdue: 25 }),
    ]
    mockListOverdueContacts.mockReturnValue(
      cancelable({ data: contacts, count: 5 }),
    )

    renderWithProviders(<StayInTouchWidget />)

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Bob")).toBeInTheDocument()
      expect(screen.queryByText("Charlie")).not.toBeInTheDocument()
      expect(screen.getByText("+ 3 more overdue")).toBeInTheDocument()
    })

    // Click to expand
    fireEvent.click(screen.getByText("+ 3 more overdue"))

    expect(screen.getByText("Charlie")).toBeInTheDocument()
    expect(screen.getByText("Diana")).toBeInTheDocument()
    expect(screen.getByText("Evan")).toBeInTheDocument()
    expect(screen.getByText("Show less")).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(screen.getByText("Show less"))

    expect(screen.queryByText("Charlie")).not.toBeInTheDocument()
    expect(screen.getByText("+ 3 more overdue")).toBeInTheDocument()
  })

  it("links the contact identity and keeps row actions outside the link", async () => {
    mockListOverdueContacts.mockReturnValue(
      cancelable({
        count: 1,
        data: [
          makeContact({
            id: "contact-1",
            first_name: "Alice",
            last_name: "Smith",
            company: "Acme Corp",
          }),
        ],
      }),
    )
    renderWithProviders(<StayInTouchWidget />)

    const contactLink = await screen.findByRole("link", {
      name: "View Alice Smith, Acme Corp",
    })
    expect(contactLink).toHaveAttribute("href", "/contacts/contact-1")
    expect(within(contactLink).getByText("Alice Smith")).toBeInTheDocument()
    expect(within(contactLink).getByText("Acme Corp")).toBeInTheDocument()
  })
})
