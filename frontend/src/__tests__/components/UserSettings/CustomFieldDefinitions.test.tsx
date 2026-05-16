import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders, createQueryClient } from "@/test/helpers"
import CustomFieldDefinitions from "@/components/UserSettings/CustomFieldDefinitions"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/client", () => ({
  CustomFieldsService: {
    listFieldDefinitions: vi.fn(),
    createFieldDefinition: vi.fn(),
    updateFieldDefinition: vi.fn(),
    deleteFieldDefinition: vi.fn(),
  },
  OpenAPI: {
    BASE: "http://localhost",
    TOKEN: "test-token",
  },
}))

describe("CustomFieldDefinitions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders section heading", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    expect(screen.getByText("Custom field definitions")).toBeInTheDocument()
  })

  it("renders description text", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    expect(
      screen.getByText(/Define arbitrary fields you want to track on contacts/,
        { exact: false })
    ).toBeInTheDocument()
  })

  it("renders add field button", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    expect(screen.getByRole("button", { name: /Add field/ })).toBeInTheDocument()
  })

  it("shows loading skeleton while loading", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => resolve({ data: [] }), 1000)
      })
    )

    const { container } = renderWithProviders(<CustomFieldDefinitions />)

    const skeleton = container.querySelector('[class*="skeleton"]')
    expect(skeleton).toBeInTheDocument()
  })

  it("displays empty state when no definitions exist", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(
        screen.getByText(/No definitions yet/, { exact: false })
      ).toBeInTheDocument()
    })
  })

  it("displays list of definitions", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "Preferred coffee order",
          icon: "coffee",
        },
        {
          id: "def-2",
          name: "Favorite Color",
          field_type: "text",
          description: null,
          icon: "palette",
        },
      ],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
      expect(screen.getByText("Favorite Color")).toBeInTheDocument()
    })
  })

  it("displays definition field type and icon", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: "coffee",
        },
      ],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText(/text.*coffee/, { exact: false })).toBeInTheDocument()
    })
  })

  it("displays definition description when present", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "How they like their coffee",
          icon: null,
        },
      ],
    })

    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("How they like their coffee")).toBeInTheDocument()
    })
  })

  it("opens add dialog when Add field button is clicked", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field definition")).toBeInTheDocument()
    })
  })

  it("renders form fields in add dialog", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Coffee preference")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("text")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("coffee")).toBeInTheDocument()
    })
  })

  it("validates that name is required in add form", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText("Add custom field definition")).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })
  })

  it("successfully creates new definition", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "How they like their coffee",
            icon: "coffee",
          },
        ],
      })

    const mockCreateFieldDefinition = vi.mocked(CustomFieldsService.createFieldDefinition)
    mockCreateFieldDefinition.mockResolvedValueOnce({
      id: "def-1",
      name: "Coffee Preference",
      field_type: "text",
      description: "How they like their coffee",
      icon: "coffee",
    })

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Coffee preference")).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText("Coffee preference")
    await user.type(nameInput, "Coffee Preference")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockCreateFieldDefinition).toHaveBeenCalledWith({
        requestBody: {
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: null,
        },
      })
    })

    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalledWith("Success!", {
        description: "Definition added",
      })
    })
  })

  it("closes dialog after successful creation", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: null,
            icon: null,
          },
        ],
      })

    vi.mocked(CustomFieldsService.createFieldDefinition).mockResolvedValueOnce({
      id: "def-1",
      name: "Coffee Preference",
      field_type: "text",
      description: null,
      icon: null,
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    const addButton = screen.getByRole("button", { name: /Add field/ })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Coffee preference")).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText("Coffee preference")
    await user.type(nameInput, "Coffee Preference")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.queryByText("Add custom field definition")).not.toBeInTheDocument()
    })
  })

  it("displays definition action menu", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: null,
        },
      ],
    })

    const user = userEvent.setup()
    const { container } = renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const menuButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg") && btn.className.includes("ghost")
    )
    expect(menuButtons.length).toBeGreaterThan(0)
  })

  it("opens edit dialog when Edit is clicked", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "Original description",
          icon: "coffee",
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const menuButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg") && btn.className.includes("ghost")
    )
    await user.click(menuButtons[0])

    const editMenuItem = screen.getAllByText("Edit")[0]
    await user.click(editMenuItem.closest("div") || editMenuItem)

    await waitFor(() => {
      expect(screen.getByText("Edit definition")).toBeInTheDocument()
    })
  })

  it("populates edit form with current values", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: "Original description",
          icon: "coffee",
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const menuButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg") && btn.className.includes("ghost")
    )
    await user.click(menuButtons[0])

    const editMenuItem = screen.getAllByText("Edit")[0]
    await user.click(editMenuItem.closest("div") || editMenuItem)

    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue("Coffee Preference")
      expect(inputs.length).toBeGreaterThan(0)
    })
  })

  it("successfully updates definition", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Original",
            icon: "coffee",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: "Updated",
            icon: "coffee",
          },
        ],
      })

    const mockUpdateFieldDefinition = vi.mocked(CustomFieldsService.updateFieldDefinition)
    mockUpdateFieldDefinition.mockResolvedValueOnce({
      id: "def-1",
      name: "Coffee Preference",
      field_type: "text",
      description: "Updated",
      icon: "coffee",
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const menuButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg") && btn.className.includes("ghost")
    )
    await user.click(menuButtons[0])

    const editMenuItem = screen.getAllByText("Edit")[0]
    await user.click(editMenuItem.closest("div") || editMenuItem)

    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue("Coffee Preference")
      expect(inputs.length).toBeGreaterThan(0)
    })

    const saveButton = screen.getAllByRole("button", { name: "Save" })[0]
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateFieldDefinition).toHaveBeenCalled()
    })
  })

  it("prompts for confirmation before deleting", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: "coffee",
        },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const originalConfirm = window.confirm
    const mockConfirm = vi.fn().mockReturnValue(true)
    window.confirm = mockConfirm as any

    const menuButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg") && btn.className.includes("ghost")
    )
    await user.click(menuButtons[0])

    const deleteMenuItem = screen.getAllByText("Delete")[0]
    await user.click(deleteMenuItem.closest("div") || deleteMenuItem)

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete this definition")
    )

    window.confirm = originalConfirm
  })

  it("deletes definition after confirmation", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions)
      .mockResolvedValueOnce({
        data: [
          {
            id: "def-1",
            name: "Coffee Preference",
            field_type: "text",
            description: null,
            icon: "coffee",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [],
      })

    const mockDeleteFieldDefinition = vi.mocked(CustomFieldsService.deleteFieldDefinition)
    mockDeleteFieldDefinition.mockResolvedValueOnce({})

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(true)

    const menuButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg") && btn.className.includes("ghost")
    )
    await user.click(menuButtons[0])

    const deleteMenuItem = screen.getAllByText("Delete")[0]
    await user.click(deleteMenuItem.closest("div") || deleteMenuItem)

    await waitFor(() => {
      expect(mockDeleteFieldDefinition).toHaveBeenCalledWith({
        defId: "def-1",
      })
    })

    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalledWith("Success!", {
        description: "Definition deleted",
      })
    })

    window.confirm = originalConfirm
  })

  it("cancels delete if user denies confirmation", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: "coffee",
        },
      ],
    })

    const mockDeleteFieldDefinition = vi.mocked(CustomFieldsService.deleteFieldDefinition)

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(false)

    const menuButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg") && btn.className.includes("ghost")
    )
    await user.click(menuButtons[0])

    const deleteMenuItem = screen.getAllByText("Delete")[0]
    await user.click(deleteMenuItem.closest("div") || deleteMenuItem)

    expect(mockDeleteFieldDefinition).not.toHaveBeenCalled()

    window.confirm = originalConfirm
  })

  it("shows error toast on delete failure", async () => {
    const { CustomFieldsService } = await import("@/client")
    vi.mocked(CustomFieldsService.listFieldDefinitions).mockResolvedValueOnce({
      data: [
        {
          id: "def-1",
          name: "Coffee Preference",
          field_type: "text",
          description: null,
          icon: "coffee",
        },
      ],
    })

    const mockError = new Error("Delete failed")
    vi.mocked(CustomFieldsService.deleteFieldDefinition).mockRejectedValueOnce(mockError)

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    renderWithProviders(<CustomFieldDefinitions />)

    await waitFor(() => {
      expect(screen.getByText("Coffee Preference")).toBeInTheDocument()
    })

    const originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(true)

    const menuButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg") && btn.className.includes("ghost")
    )
    await user.click(menuButtons[0])

    const deleteMenuItem = screen.getAllByText("Delete")[0]
    await user.click(deleteMenuItem.closest("div") || deleteMenuItem)

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })

    window.confirm = originalConfirm
  })
})
