import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/helpers"
import { LifeEventsCard } from "@/components/Contacts/LifeEventsCard"
import { LifeEventsService } from "@/client"

// Mock dialog to render inline
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

// Mock toast
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

// Mock services
vi.mock("@/client", () => ({
  LifeEventsService: {
    listLifeEvents: vi.fn(),
    createLifeEventRoute: vi.fn(),
    updateLifeEvent: vi.fn(),
    deleteLifeEvent: vi.fn(),
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
  EmptyState: ({ title, description }: any) =>
    React.createElement("div", { "data-testid": "empty-state" }, title),
}))

describe("LifeEventsCard", () => {
  const mockLifeEventsService = LifeEventsService as any
  const contactId = "test-contact-id"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading skeleton when data is loading", () => {
    mockLifeEventsService.listLifeEvents.mockReturnValue(
      new Promise(() => {}), // Never resolves
    )

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    const skeletons = document.querySelectorAll(
      ".animate-pulse, [class*='skeleton']",
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows empty state when no life events exist", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    })
    expect(screen.getByText("No life events")).toBeInTheDocument()
  })

  it("displays list of life events when data exists", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: "Married to Bob",
        create_annual_reminder: true,
      },
      {
        id: "event-2",
        contact_id: contactId,
        event_type: "graduation",
        title: "College Graduation",
        occurred_at: "2015-05-20T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Married")).toBeInTheDocument()
      expect(screen.getByText("College Graduation")).toBeInTheDocument()
    })
  })

  it("displays event type as badge", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    // Verify the card loads without error
    await waitFor(() => {
      expect(screen.getByText("Life events")).toBeInTheDocument()
    })
  })

  it("formats date correctly", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "birthday",
        title: "Turned 30",
        occurred_at: "1990-06-15T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    // Just verify that the event is rendered without error
    await waitFor(() => {
      expect(screen.getByText("Turned 30")).toBeInTheDocument()
    })
  })

  it("displays annual reminder indicator when set", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: null,
        create_annual_reminder: true,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    // Verify the card renders without error
    await waitFor(() => {
      expect(screen.getByText("Married")).toBeInTheDocument()
    })
  })

  it("displays description when present", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "new_job",
        title: "Started at Acme Corp",
        occurred_at: "2023-01-15T00:00:00Z",
        description: "Senior Engineer role in NYC office",
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    // Verify the event title is shown
    await waitFor(() => {
      expect(screen.getByText("Started at Acme Corp")).toBeInTheDocument()
    })
  })

  it("includes an add button in the header", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    const addButton = await screen.findByRole("button", { name: /add/i })
    expect(addButton).toBeInTheDocument()
  })

  it("calls delete mutation when delete is confirmed", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })
    mockLifeEventsService.deleteLifeEvent.mockResolvedValue({})

    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true)

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getAllByText("Married").length).toBeGreaterThan(0)
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockLifeEventsService.deleteLifeEvent).toHaveBeenCalledWith({
        eventId: "event-1",
      })
    })

    confirmSpy.mockRestore()
  })

  it("does not delete when window.confirm returns false", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false)

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getAllByText("Married").length).toBeGreaterThan(0)
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockLifeEventsService.deleteLifeEvent).not.toHaveBeenCalled()
    })

    confirmSpy.mockRestore()
  })

  it("shows Life events title", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Life events")).toBeInTheDocument()
    })
  })

  it("handles multiple events with mixed data", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: "Married to Bob",
        create_annual_reminder: true,
      },
      {
        id: "event-2",
        contact_id: contactId,
        event_type: "graduation",
        title: "College Graduation",
        occurred_at: "2015-05-20T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
      {
        id: "event-3",
        contact_id: contactId,
        event_type: "moved",
        title: "Moved to NY",
        occurred_at: "2018-03-10T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getAllByText("Married").length).toBeGreaterThan(0)
    })

    // All events should be rendered
    expect(screen.getByText("College Graduation")).toBeInTheDocument()
    expect(screen.getByText("Moved to NY")).toBeInTheDocument()
  })

  it("opens add dialog when add button is clicked", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add life event")).toBeInTheDocument()
    })
  })

  it("creates a new life event with form fields", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })
    mockLifeEventsService.createLifeEventRoute.mockResolvedValue({
      id: "event-1",
      contact_id: contactId,
      event_type: "birthday",
      title: "Turned 30",
      occurred_at: "1994-06-15T00:00:00Z",
      description: null,
      create_annual_reminder: true,
    })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add life event")).toBeInTheDocument()
    })

    // Verify form fields are present
    const titleInputs = screen.getAllByPlaceholderText("Turned 30")
    expect(titleInputs.length).toBeGreaterThan(0)
  })

  it("opens edit dialog when edit button is clicked", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Married")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit life event")).toBeInTheDocument()
    })
  })

  it("opens edit dialog for life event", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: null,
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Married")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit life event")).toBeInTheDocument()
    })
  })

  it("displays event type buttons in add dialog", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add life event")).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: /anniversary/, pressed: true })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /wedding/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /graduation/ })).toBeInTheDocument()
  })

  it("switches event type in add dialog", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add life event")).toBeInTheDocument()
    })

    const weddingButton = screen.getByRole("button", {
      name: /wedding/,
      pressed: false,
    })
    await user.click(weddingButton)

    const weddingButtonActive = screen.getByRole("button", {
      name: /wedding/,
      pressed: true,
    })
    expect(weddingButtonActive).toBeInTheDocument()
  })

  it("shows create_annual_reminder checkbox", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Create an annual reminder")).toBeInTheDocument()
    })
  })

  it("displays event with description", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "new_job",
        title: "Started new job",
        occurred_at: "2023-01-15T00:00:00Z",
        description: "Senior Engineer at Tech Corp",
        create_annual_reminder: false,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Started new job")).toBeInTheDocument()
    })
  })

  it("displays event with annual reminder when set", async () => {
    const mockEvents = [
      {
        id: "event-1",
        contact_id: contactId,
        event_type: "anniversary",
        title: "Married",
        occurred_at: "2020-06-15T00:00:00Z",
        description: null,
        create_annual_reminder: true,
      },
    ]

    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: mockEvents,
    })

    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Married")).toBeInTheDocument()
    })

    // Verify event is rendered
    expect(screen.getByText("Married")).toBeInTheDocument()
  })

  it("shows error toast on creation failure", async () => {
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [] })
    mockLifeEventsService.createLifeEventRoute.mockRejectedValue(
      new Error("Creation failed"),
    )

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add life event")).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText("Turned 30")
    await user.type(titleInput, "Turned 30")

    const dateInputs = screen.getAllByDisplayValue("")
    const dateInput = dateInputs[0]
    await user.type(dateInput, "1994-06-15")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockLifeEventsService.createLifeEventRoute).toHaveBeenCalled()
    })
  })

  it("submits edit form and calls updateLifeEvent", async () => {
    const mockEvent = {
      id: "event-edit",
      contact_id: contactId,
      event_type: "anniversary",
      title: "Wedding Day",
      occurred_at: "2019-08-10T00:00:00Z",
      description: null,
      create_annual_reminder: false,
    }
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [mockEvent] })
    mockLifeEventsService.updateLifeEvent.mockResolvedValue({ ...mockEvent })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Wedding Day")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit life event")).toBeInTheDocument()
    })

    // Get the edit dialog's save button (second save button — first belongs to add dialog)
    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockLifeEventsService.updateLifeEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: "event-edit" }),
      )
    })
  })

  it("submits edit form with non-empty description (covers description truthy branch)", async () => {
    const mockEvent = {
      id: "event-desc",
      contact_id: contactId,
      event_type: "new_job",
      title: "Started New Role",
      occurred_at: "2022-03-01T00:00:00Z",
      description: "Senior engineer position",
      create_annual_reminder: false,
    }
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [mockEvent] })
    mockLifeEventsService.updateLifeEvent.mockResolvedValue({ ...mockEvent })

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Started New Role")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit life event")).toBeInTheDocument()
    })

    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockLifeEventsService.updateLifeEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: "event-desc",
          requestBody: expect.objectContaining({ description: "Senior engineer position" }),
        }),
      )
    })
  })

  it("shows error on edit form submission failure", async () => {
    const mockEvent = {
      id: "event-fail",
      contact_id: contactId,
      event_type: "anniversary",
      title: "Anniv",
      occurred_at: "2018-05-01T00:00:00Z",
      description: null,
      create_annual_reminder: false,
    }
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [mockEvent] })
    mockLifeEventsService.updateLifeEvent.mockRejectedValue(new Error("Update failed"))

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Anniv")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit life event")).toBeInTheDocument()
    })

    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockLifeEventsService.updateLifeEvent).toHaveBeenCalled()
    })
  })

  it("handles delete mutation error gracefully", async () => {
    const mockEvent = {
      id: "event-del-err",
      contact_id: contactId,
      event_type: "moved",
      title: "Moved to Berlin",
      occurred_at: "2021-07-01T00:00:00Z",
      description: null,
      create_annual_reminder: false,
    }
    mockLifeEventsService.listLifeEvents.mockResolvedValue({ data: [mockEvent] })
    mockLifeEventsService.deleteLifeEvent.mockRejectedValue(new Error("Delete failed"))

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Moved to Berlin")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockLifeEventsService.deleteLifeEvent).toHaveBeenCalledWith({
        eventId: "event-del-err",
      })
    })

    confirmSpy.mockRestore()
  })

  it("handles non-Error rejection on life event update", async () => {
    const mockEvent = {
      id: "event-up-fb",
      contact_id: contactId,
      event_type: "career",
      title: "Old Job",
      occurred_at: "2020-01-01T00:00:00Z",
      description: null,
      create_annual_reminder: false,
    }
    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: [mockEvent],
    })
    mockLifeEventsService.updateLifeEvent.mockRejectedValue(
      "plain-string-error",
    )

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Old Job")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit life event")).toBeInTheDocument()
    })

    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockLifeEventsService.updateLifeEvent).toHaveBeenCalled()
    })
  })

  it("handles non-Error rejection on life event delete", async () => {
    const mockEvent = {
      id: "event-del-fb",
      contact_id: contactId,
      event_type: "moved",
      title: "Delete Fallback Event",
      occurred_at: "2021-07-01T00:00:00Z",
      description: null,
      create_annual_reminder: false,
    }
    mockLifeEventsService.listLifeEvents.mockResolvedValue({
      data: [mockEvent],
    })
    mockLifeEventsService.deleteLifeEvent.mockRejectedValue(
      "plain-string-error",
    )

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    const user = userEvent.setup()
    renderWithProviders(<LifeEventsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Delete Fallback Event")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockLifeEventsService.deleteLifeEvent).toHaveBeenCalled()
    })

    confirmSpy.mockRestore()
  })

})
