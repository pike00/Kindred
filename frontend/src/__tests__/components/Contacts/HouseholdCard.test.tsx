import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { renderWithProviders } from "@/test/helpers"
import { HouseholdCard } from "@/components/Contacts/HouseholdCard"
import { ContactsService } from "@/client"

// Mock ContactAvatar
vi.mock("@/components/Common/ContactAvatar", () => ({
  ContactAvatar: ({ contact }: any) =>
    React.createElement("div", { "data-testid": "avatar" }, contact.first_name),
}))

// Mock EmptyState
vi.mock("@/components/Common/EmptyState", () => ({
  EmptyState: ({ title }: any) =>
    React.createElement("div", { "data-testid": "empty-state" }, title),
}))

// Mock Tooltip
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => React.createElement("div", null, children),
  TooltipTrigger: ({ children }: any) =>
    React.createElement("button", { type: "button" }, children),
  TooltipContent: ({ children }: any) =>
    React.createElement("div", { role: "tooltip" }, children),
}))

// Mock services
vi.mock("@/client", () => ({
  ContactsService: {
    getContactHousehold: vi.fn(),
  },
}))

describe("HouseholdCard", () => {
  const mockContactService = ContactsService as any
  const contactId = "test-contact-id"
  const contactName = "Alice Smith"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading skeleton when data is loading", () => {
    mockContactService.getContactHousehold.mockReturnValue(
      new Promise(() => {}), // Never resolves
    )

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    // Check for skeleton elements
    const skeletons = document.querySelectorAll(
      ".animate-pulse, [class*='skeleton']",
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows empty state when no household members exist", async () => {
    mockContactService.getContactHousehold.mockResolvedValue({ data: [] })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    })
    expect(screen.getByText("No household detected")).toBeInTheDocument()
  })

  it("displays household members when data exists", async () => {
    const mockMembers = [
      {
        id: contactId,
        first_name: "Alice",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 35,
      },
      {
        id: "member-2",
        first_name: "Bob",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 38,
      },
      {
        id: "member-3",
        first_name: "Charlie",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 8,
      },
    ]

    mockContactService.getContactHousehold.mockResolvedValue({
      data: mockMembers,
    })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("Bob Smith")).toBeInTheDocument()
      expect(screen.getByText("Charlie Smith")).toBeInTheDocument()
    })
  })

  it("shows primary badge for the contact itself", async () => {
    const mockMembers = [
      {
        id: contactId,
        first_name: "Alice",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 35,
      },
      {
        id: "member-2",
        first_name: "Bob",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 38,
      },
    ]

    mockContactService.getContactHousehold.mockResolvedValue({
      data: mockMembers,
    })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    })

    // Find the first row (Alice) and check for Primary badge
    const primaryBadges = screen.getAllByText("Primary")
    expect(primaryBadges.length).toBe(1)
  })

  it("displays age when available", async () => {
    const mockMembers = [
      {
        id: "member-1",
        first_name: "Alice",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 35,
      },
      {
        id: "member-2",
        first_name: "Bob",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: null,
      },
    ]

    mockContactService.getContactHousehold.mockResolvedValue({
      data: mockMembers,
    })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Age: 35/)).toBeInTheDocument()
    })

    // Bob's age should not be displayed since it's null
    const bobAges = screen.queryAllByText(/Age: null/)
    expect(bobAges.length).toBe(0)
  })

  it("displays household summary at bottom", async () => {
    const mockMembers = [
      {
        id: "member-1",
        first_name: "Alice",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 35,
      },
      {
        id: "member-2",
        first_name: "Bob",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 38,
      },
    ]

    mockContactService.getContactHousehold.mockResolvedValue({
      data: mockMembers,
    })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    await waitFor(() => {
      // Should display formatted summary
      expect(
        screen.getByText(/Alice Smith \(35\), Bob Smith \(38\)/),
      ).toBeInTheDocument()
    })
  })

  it("handles members with only first name", async () => {
    const mockMembers = [
      {
        id: "member-1",
        first_name: "Prince",
        last_name: null,
        nickname: null,
        birthday: null,
        age: 25,
      },
    ]

    mockContactService.getContactHousehold.mockResolvedValue({
      data: mockMembers,
    })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    // Should render the member name
    await waitFor(() => {
      expect(screen.getAllByText("Prince").length).toBeGreaterThan(0)
    })
  })

  it("shows household title and info hint", async () => {
    mockContactService.getContactHousehold.mockResolvedValue({ data: [] })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Household")).toBeInTheDocument()
    })

    // Info hint should be present
    const infoButton = screen.getByRole("button", { name: /more info/i })
    expect(infoButton).toBeInTheDocument()
  })

  it("handles empty age gracefully", async () => {
    const mockMembers = [
      {
        id: "member-1",
        first_name: "Alice",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: undefined,
      },
    ]

    mockContactService.getContactHousehold.mockResolvedValue({
      data: mockMembers,
    })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    // Should render the member name
    await waitFor(() => {
      expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0)
    })
  })

  it("displays avatars for each member", async () => {
    const mockMembers = [
      {
        id: "member-1",
        first_name: "Alice",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 35,
      },
      {
        id: "member-2",
        first_name: "Bob",
        last_name: "Smith",
        nickname: null,
        birthday: null,
        age: 38,
      },
    ]

    mockContactService.getContactHousehold.mockResolvedValue({
      data: mockMembers,
    })

    renderWithProviders(
      <HouseholdCard contactId={contactId} contactName={contactName} />,
    )

    await waitFor(() => {
      const avatars = screen.getAllByTestId("avatar")
      expect(avatars).toHaveLength(2)
    })
  })

  describe("embedded mode", () => {
    it("renders members without an outer card shell", async () => {
      const mockMembers = [
        {
          id: contactId,
          first_name: "Alice",
          last_name: "Smith",
          nickname: null,
          birthday: null,
          age: 35,
        },
        {
          id: "member-2",
          first_name: "Bob",
          last_name: "Smith",
          nickname: null,
          birthday: null,
          age: 38,
        },
      ]

      mockContactService.getContactHousehold.mockResolvedValue({
        data: mockMembers,
      })

      const { container } = renderWithProviders(
        <HouseholdCard
          contactId={contactId}
          contactName={contactName}
          embedded
        />,
      )

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument()
        expect(screen.getByText("Bob Smith")).toBeInTheDocument()
      })

      // Still shows the Household sub-heading...
      expect(screen.getByText("Household")).toBeInTheDocument()
      // ...but no Card shell (data-slot="card") is rendered.
      expect(
        container.querySelector('[data-slot="card"]'),
      ).not.toBeInTheDocument()
    })

    it("renders nothing when household is empty", async () => {
      mockContactService.getContactHousehold.mockResolvedValue({ data: [] })

      const { container } = renderWithProviders(
        <HouseholdCard
          contactId={contactId}
          contactName={contactName}
          embedded
        />,
      )

      // Once the empty household resolves, the component returns null:
      // no heading, no empty-state, empty DOM.
      await waitFor(() => {
        expect(screen.queryByText("Household")).not.toBeInTheDocument()
      })
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument()
      expect(container).toBeEmptyDOMElement()
    })
  })
})
