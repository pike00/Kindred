import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StayInTouchWidget } from "@/components/Dashboard/StayInTouchWidget"
import { cancelable, makeContact, renderWithProviders } from "@/test/helpers"

const { mockListOverdueContacts, mockSnoozeContact } = vi.hoisted(() => ({
  mockListOverdueContacts: vi.fn(),
  mockSnoozeContact: vi.fn(),
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
    snoozeContact: mockSnoozeContact,
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
      makeContact({ id: "1", first_name: "Alice", last_name: "" }),
      makeContact({ id: "2", first_name: "Bob", last_name: "" }),
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

  it("omits suppressed contacts and never renders the old badge", async () => {
    mockListOverdueContacts.mockReturnValue(
      cancelable({
        count: 2,
        data: [
          makeContact({
            id: "suppressed",
            first_name: "Suppressed",
            do_not_contact: true,
          }),
          makeContact({ id: "visible", first_name: "Visible" }),
        ],
      }),
    )

    renderWithProviders(<StayInTouchWidget />)

    await waitFor(() => {
      expect(screen.getByText("Visible Smith")).toBeInTheDocument()
      expect(screen.queryByText("Suppressed")).not.toBeInTheDocument()
      expect(screen.queryByText("Do not contact")).not.toBeInTheDocument()
      expect(screen.getByText("1 overdue")).toBeInTheDocument()
    })
  })

  it("limits displayed contacts to 2 and shows +X more overdue button when count > 2", async () => {
    const contacts = [
      makeContact({ id: "1", first_name: "Alice", last_name: "" }),
      makeContact({ id: "2", first_name: "Bob", last_name: "" }),
      makeContact({ id: "3", first_name: "Charlie", last_name: "" }),
      makeContact({ id: "4", first_name: "Diana", last_name: "" }),
      makeContact({ id: "5", first_name: "Evan", last_name: "" }),
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

  it("calls ContactsService.snoozeContact when a snooze option is selected", async () => {
    const user = userEvent.setup()
    mockListOverdueContacts.mockReturnValue(
      cancelable({
        count: 1,
        data: [
          makeContact({
            id: "contact-1",
            first_name: "Alice",
            last_name: "Smith",
          }),
        ],
      }),
    )
    mockSnoozeContact.mockReturnValue(cancelable(makeContact({ id: "contact-1" })))

    renderWithProviders(<StayInTouchWidget />)

    const snoozeButton = await screen.findByRole("button", {
      name: "Snooze Alice Smith",
    })
    await user.click(snoozeButton)

    const option1w = await screen.findByRole("menuitem", { name: "1 week" })
    await user.click(option1w)

    expect(mockSnoozeContact).toHaveBeenCalledWith({
      contactId: "contact-1",
      requestBody: { duration: "1 week" },
    })
  })

  it("renders overdue days note and last interaction snippet with date", async () => {
    // 45 days ago relative to fixed now
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 86_400_000).toISOString()
    const d = new Date(fortyFiveDaysAgo)
    const shortDate = `${d.getMonth() + 1}/${d.getDate()}`

    mockListOverdueContacts.mockReturnValue(
      cancelable({
        count: 1,
        data: [
          makeContact({
            id: "contact-1",
            first_name: "Matt",
            last_name: "Statz",
            days_overdue: 15,
            last_contacted_at: fortyFiveDaysAgo,
            last_interaction_notes: "Discussed project updates",
          }),
        ],
      }),
    )

    renderWithProviders(<StayInTouchWidget />)

    await waitFor(() => {
      expect(screen.getByText("Matt Statz")).toBeInTheDocument()
      expect(screen.getByText("15 days overdue")).toBeInTheDocument()
      expect(
        screen.getByText(`Last interacted 45 days ago (${shortDate}: Discussed project updates)`),
      ).toBeInTheDocument()
    })
  })

  it("renders 'No interactions yet' when last_contacted_at is null", async () => {
    mockListOverdueContacts.mockReturnValue(
      cancelable({
        count: 1,
        data: [
          makeContact({
            id: "contact-2",
            first_name: "Brisa",
            last_name: "Bodell",
            days_overdue: 0,
            last_contacted_at: null,
          }),
        ],
      }),
    )

    renderWithProviders(<StayInTouchWidget />)

    await waitFor(() => {
      expect(screen.getByText("Brisa Bodell")).toBeInTheDocument()
      expect(screen.getByText("0 days overdue")).toBeInTheDocument()
      expect(screen.getByText("No interactions yet")).toBeInTheDocument()
    })
  })

  it("renders interaction date without note text when notes are null", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString()
    const d = new Date(tenDaysAgo)
    const shortDate = `${d.getMonth() + 1}/${d.getDate()}`

    mockListOverdueContacts.mockReturnValue(
      cancelable({
        count: 1,
        data: [
          makeContact({
            id: "contact-3",
            first_name: "Jane",
            last_name: "Doe",
            days_overdue: 5,
            last_contacted_at: tenDaysAgo,
            last_interaction_notes: null,
          }),
        ],
      }),
    )

    renderWithProviders(<StayInTouchWidget />)

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument()
      expect(screen.getByText("5 days overdue")).toBeInTheDocument()
      expect(screen.getByText(`Last interacted 10 days ago (${shortDate})`)).toBeInTheDocument()
    })
  })
})
