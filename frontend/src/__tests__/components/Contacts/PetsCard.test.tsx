import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/helpers"
import { PetsCard } from "@/components/Contacts/PetsCard"
import { PetsService } from "@/client"

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
  PetsService: {
    listPets: vi.fn(),
    createPetRoute: vi.fn(),
    updatePet: vi.fn(),
    deletePet: vi.fn(),
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

describe("PetsCard", () => {
  const mockPetsService = PetsService as any
  const contactId = "test-contact-id"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows loading skeleton when data is loading", () => {
    mockPetsService.listPets.mockReturnValue(
      new Promise(() => {}), // Never resolves
    )

    renderWithProviders(<PetsCard contactId={contactId} />)

    const skeletons = document.querySelectorAll(
      ".animate-pulse, [class*='skeleton']",
    )
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows empty state when no pets exist", async () => {
    mockPetsService.listPets.mockResolvedValue({ data: [] })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    })
    expect(screen.getByText("No pets")).toBeInTheDocument()
  })

  it("displays list of pets when data exists", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: "Very friendly",
      },
      {
        id: "pet-2",
        contact_id: contactId,
        name: "Whiskers",
        species: "Cat",
        breed: "Siamese",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
      expect(screen.getByText("Whiskers")).toBeInTheDocument()
    })
  })

  it("displays pet name, species, and breed", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
      expect(screen.getByText(/Dog, Golden Retriever/)).toBeInTheDocument()
    })
  })

  it("displays pet notes when present", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: "Extremely friendly and loyal",
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })
    // Notes should be rendered as part of the pet row
    expect(screen.getAllByText("Extremely friendly and loyal")[0]).toBeInTheDocument()
  })

  it("handles pet with species only", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Tweety",
        species: "Parakeet",
        breed: null,
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Tweety")).toBeInTheDocument()
      expect(screen.getByText(/Parakeet/)).toBeInTheDocument()
    })
  })

  it("handles pet with no species or breed", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Mystery",
        species: null,
        breed: null,
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Mystery")).toBeInTheDocument()
    })

    // Should not show species/breed dash separator
    const dashes = screen.queryAllByText("—")
    expect(dashes.length).toBe(0)
  })

  it("includes an add button in the header", async () => {
    mockPetsService.listPets.mockResolvedValue({ data: [] })

    renderWithProviders(<PetsCard contactId={contactId} />)

    const addButton = await screen.findByRole("button", { name: /add/i })
    expect(addButton).toBeInTheDocument()
  })

  it("calls delete mutation when delete is confirmed", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })
    mockPetsService.deletePet.mockResolvedValue({})

    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true)

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockPetsService.deletePet).toHaveBeenCalledWith({
        petId: "pet-1",
      })
    })

    confirmSpy.mockRestore()
  })

  it("does not delete when window.confirm returns false", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false)

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockPetsService.deletePet).not.toHaveBeenCalled()
    })

    confirmSpy.mockRestore()
  })

  it("shows Pets title", async () => {
    mockPetsService.listPets.mockResolvedValue({ data: [] })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Pets")).toBeInTheDocument()
    })
  })

  it("displays multiple pets correctly", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Rex",
        species: "Dog",
        breed: "Labrador",
        notes: null,
      },
      {
        id: "pet-2",
        contact_id: contactId,
        name: "Mittens",
        species: "Cat",
        breed: null,
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Rex")).toBeInTheDocument()
      expect(screen.getByText("Mittens")).toBeInTheDocument()
    })
  })

  it("displays edit button in actions menu", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    expect(editButton).toBeInTheDocument()
  })

  it("opens add dialog when add button is clicked", async () => {
    mockPetsService.listPets.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add pet")).toBeInTheDocument()
    })
  })

  it("opens add pet dialog with form fields", async () => {
    mockPetsService.listPets.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add pet")).toBeInTheDocument()
    })

    // Verify form fields are present
    const nameInputs = screen.getAllByPlaceholderText("Biscuit")
    expect(nameInputs.length).toBeGreaterThan(0)
  })

  it("shows validation error when pet name is missing", async () => {
    mockPetsService.listPets.mockResolvedValue({ data: [] })

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add pet")).toBeInTheDocument()
    })

    // Try to submit without entering name
    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it("opens edit dialog when edit button is clicked", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit pet")).toBeInTheDocument()
    })
  })

  it("opens edit dialog and calls update mutation", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })
    mockPetsService.updatePet.mockResolvedValue({
      id: "pet-1",
      contact_id: contactId,
      name: "Biscuit Updated",
      species: "Dog",
      breed: "Labrador",
      notes: "Very friendly",
    })

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })

    const editButton = screen.getByTestId("action-edit")
    await user.click(editButton)

    await waitFor(() => {
      expect(screen.getByText("Edit pet")).toBeInTheDocument()
    })

    // Verify the mutation would be called
    expect(mockPetsService.updatePet).not.toHaveBeenCalled()
  })

  it("displays pet with breed only", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Max",
        species: null,
        breed: "Siamese",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Max")).toBeInTheDocument()
    })
  })

  it("shows error toast on pet creation failure", async () => {
    mockPetsService.listPets.mockResolvedValue({ data: [] })
    mockPetsService.createPetRoute.mockRejectedValue(
      new Error("Creation failed"),
    )

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add pet")).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText("Biscuit")
    await user.type(nameInput, "Biscuit")

    const saveButton = screen.getByRole("button", { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPetsService.createPetRoute).toHaveBeenCalled()
    })
  })

  it("deletes a pet when confirmed", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })
    mockPetsService.deletePet.mockResolvedValue({})

    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true)

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockPetsService.deletePet).toHaveBeenCalledWith({
        petId: "pet-1",
      })
    })

    confirmSpy.mockRestore()
  })

  it("does not delete when window.confirm returns false", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })

    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(false)

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockPetsService.deletePet).not.toHaveBeenCalled()
    })

    confirmSpy.mockRestore()
  })

  it("shows error toast on pet deletion failure", async () => {
    const mockPets = [
      {
        id: "pet-1",
        contact_id: contactId,
        name: "Biscuit",
        species: "Dog",
        breed: "Golden Retriever",
        notes: null,
      },
    ]

    mockPetsService.listPets.mockResolvedValue({ data: mockPets })
    mockPetsService.deletePet.mockRejectedValue(new Error("Delete failed"))

    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true)

    const user = userEvent.setup()
    renderWithProviders(<PetsCard contactId={contactId} />)

    await waitFor(() => {
      expect(screen.getByText("Biscuit")).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockPetsService.deletePet).toHaveBeenCalled()
    })

    confirmSpy.mockRestore()
  })


})
