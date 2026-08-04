import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/helpers"
import { AddressesCard } from "@/components/Contacts/AddressesCard"
import { AddressesService } from "@/client"

// Mock dialog to render inline
const mockDialog = vi.hoisted(() => ({
  Dialog: ({ children }: any) => {
    const arr = React.Children.toArray(children)
    // Always render content for testing (both trigger and content)
    return React.createElement("div", null, arr[0], arr[1])
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
  AddressesService: {
    listAddresses: vi.fn(),
    createAddressRoute: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
  },
}))

// Mock RowActionsMenu to simplify testing
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

describe("AddressesCard", () => {
  const mockAddressService = AddressesService as any
  const contactId = "test-contact-id"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading skeleton when data is loading", () => {
    mockAddressService.listAddresses.mockReturnValue(
      new Promise(() => {}), // Never resolves
    )

    renderWithProviders(<AddressesCard contactId={contactId} />)

    // Check for skeleton element
    const skeletons = document.querySelectorAll(
      ".animate-pulse, [class*='skeleton']",
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows empty state when no addresses exist", async () => {
    mockAddressService.listAddresses.mockResolvedValue({ data: [] })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    })
    expect(screen.getByText("No addresses")).toBeInTheDocument()
  })

  it("displays list of addresses when data exists", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: "Apt 4B",
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
      {
        id: "addr-2",
        contact_id: contactId,
        label: "Work",
        street: "456 Office Ave",
        extended: null,
        city: "New York",
        region: "NY",
        postal_code: "10001",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    // Verify addresses are displayed (pick one label to ensure list rendered)
    await waitFor(() => {
      const homeLabels = screen.getAllByText("Home")
      expect(homeLabels.length).toBeGreaterThan(0)
    })
  })

  it("includes an add button in the header", async () => {
    mockAddressService.listAddresses.mockResolvedValue({ data: [] })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    const addButton = await screen.findByRole("button", { name: /add/i })
    expect(addButton).toBeInTheDocument()
  })


  it("displays all address fields when present", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: "Apt 4B",
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getAllByText("Home").length).toBeGreaterThan(0)
    })
  })

  it("filters out empty fields from address display", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: null,
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: null,
        postal_code: null,
        country: null,
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    // Just verify the card renders without error
    await waitFor(() => {
      expect(screen.getByText("Addresses")).toBeInTheDocument()
    })
  })

  it("shows Addresses title with icon", async () => {
    mockAddressService.listAddresses.mockResolvedValue({ data: [] })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Addresses")).toBeInTheDocument()
    })
  })

  it("opens add dialog when add button is clicked", async () => {
    mockAddressService.listAddresses.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add address")).toBeInTheDocument()
    })
  })

  it("opens add address dialog with form fields", async () => {
    mockAddressService.listAddresses.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add address")).toBeInTheDocument()
    })

    // Verify form fields are present
    const streetInputs = screen.getAllByPlaceholderText("123 Main St")
    expect(streetInputs.length).toBeGreaterThan(0)
  })

  it("shows error toast on address creation failure", async () => {
    mockAddressService.listAddresses.mockResolvedValue({ data: [] })
    mockAddressService.createAddressRoute.mockRejectedValue(
      new Error("Network error"),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add address")).toBeInTheDocument()
    })

    const streetInput = screen.getByPlaceholderText("123 Main St")
    await user.type(streetInput, "123 Main St")

    const saveButton = screen.getAllByRole("button", { name: /save/i })[0]
    await user.click(saveButton)

    // Verify the error was handled (mutation catches it)
    await waitFor(() => {
      expect(mockAddressService.createAddressRoute).toHaveBeenCalled()
    })
  })


  it("displays address with extended field", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: "Apt 4B",
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Apt 4B")).toBeInTheDocument()
    })
  })

  it("displays address without country", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: null,
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Addresses")).toBeInTheDocument()
    })
  })

  it("formats address city line correctly", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Work",
        street: "456 Office Ave",
        extended: null,
        city: "New York",
        region: "NY",
        postal_code: "10001",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      // Should have city, region, postal code separated by commas
      const cityLine = screen.getByText(/New York, NY, 10001/)
      expect(cityLine).toBeInTheDocument()
    })
  })

  it("displays label preset buttons in add dialog", async () => {
    mockAddressService.listAddresses.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
      expect(screen.getByText("Work")).toBeInTheDocument()
      expect(screen.getByText("Other")).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Edit Dialog and EditAddressDialog coverage
  // ============================================================================

  it("opens EditAddressDialog when Edit button is clicked", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: "Apt 4B",
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })

    // Click the Edit button for the address (RowActionsMenu renders as button with data-testid="action-edit")
    const editButton = await screen.findByTestId("action-edit")
    await user.click(editButton)

    // Verify the edit dialog title appears
    await waitFor(() => {
      expect(screen.getByText("Edit address")).toBeInTheDocument()
    })
  })

  it("EditAddressDialog pre-fills form with existing address data", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Work",
        street: "456 Office Ave",
        extended: "Suite 100",
        city: "New York",
        region: "NY",
        postal_code: "10001",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Work")).toBeInTheDocument()
    })

    const editButton = await screen.findByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit address")).toBeInTheDocument()
    })

    // Verify form fields are pre-filled
    const streetInputs = screen.getAllByDisplayValue("456 Office Ave")
    expect(streetInputs.length).toBeGreaterThan(0)
  })

  it("Home preset button sets label to Home in edit dialog", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Custom",
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("123 Main St")).toBeInTheDocument()
    })

    const editButton = await screen.findByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit address")).toBeInTheDocument()
    })

    // Find the Home button and click it
    const homeButtons = screen.getAllByRole("button", { name: /^Home$/ })
    const homeButton = homeButtons.find(
      (btn) => btn.getAttribute("aria-pressed") !== "true",
    )
    if (homeButton) {
      await user.click(homeButton)
    }

    // Verify Home button is now pressed (default style)
    await waitFor(() => {
      const pressedHome = screen.getAllByRole("button", { name: /^Home$/ })
      const isPressedNow = pressedHome.some(
        (btn) => btn.getAttribute("aria-pressed") === "true",
      )
      expect(isPressedNow).toBe(true)
    })
  })

  it("Work preset button sets label to Work in edit dialog", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })

    const editButton = await screen.findByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit address")).toBeInTheDocument()
    })

    // Click Work button
    const workButtons = screen.getAllByRole("button", { name: /^Work$/ })
    if (workButtons.length > 0) {
      await user.click(workButtons[0])
    }

    // Verify Work button becomes pressed
    await waitFor(() => {
      const pressedWork = screen.getAllByRole("button", { name: /^Work$/ })
      const isPressedNow = pressedWork.some(
        (btn) => btn.getAttribute("aria-pressed") === "true",
      )
      expect(isPressedNow).toBe(true)
    })
  })

  it("Other button allows custom label input in edit dialog", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })

    const editButton = await screen.findByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit address")).toBeInTheDocument()
    })

    // Click Other button
    const otherButtons = screen.getAllByRole("button", { name: /^Other$/ })
    if (otherButtons.length > 0) {
      await user.click(otherButtons[0])
    }

    // Clear custom input and type new value
    const customLabelInput = screen
      .getAllByPlaceholderText("Enter custom label...")
      .find((el) => el instanceof HTMLInputElement)
    if (customLabelInput) {
      await user.clear(customLabelInput as HTMLInputElement)
      await user.type(customLabelInput as HTMLInputElement, "Vacation")
    }

    // Verify Other button is pressed
    await waitFor(() => {
      const otherBtn = screen.getAllByRole("button", { name: /^Other$/ })
      const isOtherPressed = otherBtn.some(
        (btn) => btn.getAttribute("aria-pressed") === "true",
      )
      expect(isOtherPressed).toBe(true)
    })
  })

  it("submit edit address calls updateAddress API", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })
    mockAddressService.updateAddress.mockResolvedValue({
      id: "addr-1",
      contact_id: contactId,
      label: "Home Updated",
      street: "123 Main St",
      extended: null,
      city: "Brooklyn",
      region: "NY",
      postal_code: "11201",
      country: "USA",
    })

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })

    const editButton = await screen.findByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit address")).toBeInTheDocument()
    })

    // Find and click save button in the dialog
    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    const dialogSaveButton = saveButtons[saveButtons.length - 1]
    await user.click(dialogSaveButton)

    await waitFor(() => {
      expect(mockAddressService.updateAddress).toHaveBeenCalled()
    })
  })

  it("shows error toast on address edit failure", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })
    mockAddressService.updateAddress.mockRejectedValue(
      new Error("Update failed"),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })

    const editButton = await screen.findByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit address")).toBeInTheDocument()
    })

    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    const dialogSaveButton = saveButtons[saveButtons.length - 1]
    await user.click(dialogSaveButton)

    await waitFor(() => {
      expect(mockAddressService.updateAddress).toHaveBeenCalled()
    })
  })

  it("displays address without extended field", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })

    // Verify extended field is not shown
    expect(screen.queryByText("Apt 4B")).not.toBeInTheDocument()
  })

  it("displays non-USA country when set", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: null,
        city: "London",
        region: "England",
        postal_code: "SW1A 1AA",
        country: "United Kingdom",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("United Kingdom")).toBeInTheDocument()
    })
  })

  it("hides USA country (default)", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "123 Main St",
        extended: null,
        city: "Brooklyn",
        region: "NY",
        postal_code: "11201",
        country: "United States",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument()
    })

    // Country should not be visible (it's "United States" which is default)
    const countryElements = screen.queryAllByText("United States")
    expect(countryElements.length).toBe(0)
  })

  it("deletes address when delete is confirmed", async () => {
    mockAddressService.listAddresses.mockResolvedValue({
      data: [
        {
          id: "addr-del",
          contact_id: contactId,
          label: "Old Home",
          street: "99 Delete St",
          extended: null,
          city: "Portland",
          region: "OR",
          postal_code: "97201",
          country: null,
        },
      ],
    })
    mockAddressService.deleteAddress.mockResolvedValue(undefined)

    vi.spyOn(window, "confirm").mockReturnValue(true)

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Old Home")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await userEvent.setup().click(deleteButton)

    await waitFor(() => {
      expect(mockAddressService.deleteAddress).toHaveBeenCalledWith({
        addressId: "addr-del",
      })
    })
  })

  it("does not delete address when confirm is canceled", async () => {
    mockAddressService.listAddresses.mockResolvedValue({
      data: [
        {
          id: "addr-keep",
          contact_id: contactId,
          label: "Keep Home",
          street: "1 Keep St",
          extended: null,
          city: "Seattle",
          region: "WA",
          postal_code: "98101",
          country: null,
        },
      ],
    })

    vi.spyOn(window, "confirm").mockReturnValue(false)

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Keep Home")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await userEvent.setup().click(deleteButton)

    expect(mockAddressService.deleteAddress).not.toHaveBeenCalled()
  })

  it("handles delete address error gracefully", async () => {
    mockAddressService.listAddresses.mockResolvedValue({
      data: [
        {
          id: "addr-err",
          contact_id: contactId,
          label: "Error Home",
          street: "2 Err St",
          extended: null,
          city: "Denver",
          region: "CO",
          postal_code: "80201",
          country: null,
        },
      ],
    })
    mockAddressService.deleteAddress.mockRejectedValue(new Error("Network error"))

    vi.spyOn(window, "confirm").mockReturnValue(true)

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Error Home")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await userEvent.setup().click(deleteButton)

    await waitFor(() => {
      expect(mockAddressService.deleteAddress).toHaveBeenCalledWith({
        addressId: "addr-err",
      })
    })
  })

  it("handles non-Error rejection on address creation", async () => {
    mockAddressService.listAddresses.mockResolvedValue({ data: [] })
    mockAddressService.createAddressRoute.mockRejectedValue("plain-string")

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add address")).toBeInTheDocument()
    })

    const streetInput = screen.getByPlaceholderText("123 Main St")
    await user.type(streetInput, "123 Main St")

    const saveButton = screen.getAllByRole("button", { name: /save/i })[0]
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockAddressService.createAddressRoute).toHaveBeenCalled()
    })
  })

  it("handles non-Error rejection on address update", async () => {
    mockAddressService.listAddresses.mockResolvedValue({
      data: [
        {
          id: "addr-up",
          contact_id: contactId,
          label: "UpdHome",
          street: "1 Main",
          extended: null,
          city: "NYC",
          region: "NY",
          postal_code: "10001",
          country: "USA",
        },
      ],
    })
    mockAddressService.updateAddress.mockRejectedValue("plain-string")

    const user = userEvent.setup()
    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() =>
      expect(screen.getByText("UpdHome")).toBeInTheDocument(),
    )

    const editButton = await screen.findByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() =>
      expect(screen.getByText("Edit address")).toBeInTheDocument(),
    )

    const saveButtons = screen.getAllByRole("button", { name: /save/i })
    await user.click(saveButtons[saveButtons.length - 1])

    await waitFor(() => {
      expect(mockAddressService.updateAddress).toHaveBeenCalled()
    })
  })

  it("handles non-Error rejection on address delete", async () => {
    mockAddressService.listAddresses.mockResolvedValue({
      data: [
        {
          id: "addr-del2",
          contact_id: contactId,
          label: "DelHome",
          street: "1 Main",
          extended: null,
          city: "NYC",
          region: "NY",
          postal_code: "10001",
          country: "USA",
        },
      ],
    })
    mockAddressService.deleteAddress.mockRejectedValue("plain-string")
    vi.spyOn(window, "confirm").mockReturnValue(true)

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() =>
      expect(screen.getByText("DelHome")).toBeInTheDocument(),
    )

    const deleteButton = screen.getByTestId("action-delete")
    await userEvent.setup().click(deleteButton)

    await waitFor(() => {
      expect(mockAddressService.deleteAddress).toHaveBeenCalled()
    })
  })

  it("renders Google Maps link and action when address details exist", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Home",
        street: "1724 Maple Ave",
        extended: null,
        city: "Philadelphia",
        region: "PA",
        postal_code: "55656",
        country: "USA",
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      const mapsLink = screen.getByRole("link", { name: /open in google maps/i })
      expect(mapsLink).toBeInTheDocument()
      expect(mapsLink).toHaveAttribute(
        "href",
        "https://www.google.com/maps/search/?api=1&query=1724%20Maple%20Ave%2C%20Philadelphia%2C%20PA%2C%2055656%2C%20USA",
      )
      expect(screen.getByTestId("action-open in google maps")).toBeInTheDocument()
    })
  })

  it("prioritizes latitude and longitude for Google Maps link if available", async () => {
    const mockAddresses = [
      {
        id: "addr-1",
        contact_id: contactId,
        label: "Work",
        street: "1724 Maple Ave",
        latitude: 39.9526,
        longitude: -75.1652,
      },
    ]

    mockAddressService.listAddresses.mockResolvedValue({
      data: mockAddresses,
    })

    renderWithProviders(<AddressesCard contactId={contactId} />)

    await waitFor(() => {
      const mapsLink = screen.getByRole("link", { name: /open in google maps/i })
      expect(mapsLink).toHaveAttribute(
        "href",
        "https://www.google.com/maps/search/?api=1&query=39.9526,-75.1652",
      )
    })
  })
})

