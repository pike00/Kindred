import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddTagDialog } from "@/components/Tags/AddTagDialog"
import { createQueryClient, renderWithProviders } from "@/test/helpers"

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
  TagsService: {
    createTagRoute: vi.fn(),
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

describe("AddTagDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders trigger button", () => {
    renderWithProviders(<AddTagDialog />)
    expect(screen.getByRole("button", { name: /add tag/i })).toBeInTheDocument()
  })

  it("opens dialog when trigger button is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    expect(screen.getByText("Add New Tag")).toBeInTheDocument()
    expect(
      screen.getByText("Create a new tag to organize your contacts."),
    ).toBeInTheDocument()
  })

  it("displays form fields when dialog is open", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/color/i)).toBeInTheDocument()
  })

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it("sets default color value", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const colorInput = screen.getByLabelText(/color/i) as HTMLInputElement
    expect(colorInput.value).toBe("#3b82f6")
  })

  it("submits form with valid name only", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockResolvedValue({
      id: "tag-1",
      name: "Work",
      color: "#3b82f6",
    })

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith({
        requestBody: {
          name: "Work",
          color: "#3b82f6",
        },
      })
    })
  })

  it("submits form with custom color", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockResolvedValue({
      id: "tag-1",
      name: "Friends",
      color: "#ef4444",
    })

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Friends")

    const colorInput = screen.getByLabelText(/color/i)
    await user.clear(colorInput)
    await user.type(colorInput, "#ef4444")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith({
        requestBody: {
          name: "Friends",
          color: "#ef4444",
        },
      })
    })
  })

  it("shows success toast on successful creation", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockResolvedValue({
      id: "tag-1",
      name: "Work",
      color: "#3b82f6",
    })

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        "Tag created successfully",
      )
    })
  })

  it("closes dialog on successful creation", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockResolvedValue({
      id: "tag-1",
      name: "Work",
      color: "#3b82f6",
    })

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText("Add New Tag")).not.toBeInTheDocument()
    })
  })

  it("resets form after successful submission", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockResolvedValue({
      id: "tag-1",
      name: "Work",
      color: "#3b82f6",
    })

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(
      /e.g., Close Friend/i,
    ) as HTMLInputElement
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(nameInput.value).toBe("")
    })
  })

  it("resets color to default after successful submission", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockResolvedValue({
      id: "tag-1",
      name: "Work",
      color: "#ef4444",
    })

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const colorInput = screen.getByLabelText(/color/i) as HTMLInputElement
    await user.clear(colorInput)
    await user.type(colorInput, "#ef4444")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(colorInput.value).toBe("#3b82f6")
    })
  })

  it("invalidates tags query on successful creation", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockResolvedValue({
      id: "tag-1",
      name: "Work",
      color: "#3b82f6",
    })

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />, { queryClient })

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tags"] })
    })
  })

  it("shows error toast on API error", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockRejectedValue(new Error("API error"))

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Failed to create tag")
    })
  })

  it("does not show success toast on API error", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockRejectedValue(new Error("API error"))

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).not.toHaveBeenCalled()
    })
  })

  it("disables submit button while creating", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockImplementation(
      () => new Promise((r) => setTimeout(r, 1000)),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", {
      name: /create tag/i,
    }) as HTMLButtonElement
    await user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it("shows creating text while submission is pending", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockImplementation(
      () => new Promise((r) => setTimeout(r, 1000)),
    )

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    const triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeInTheDocument()
    })
  })

  it("allows reopening dialog after closing", async () => {
    const { TagsService } = await import("@/client")
    const mockCreateTag = vi.mocked(TagsService.createTagRoute)
    mockCreateTag.mockResolvedValue({
      id: "tag-1",
      name: "Work",
      color: "#3b82f6",
    })

    const user = userEvent.setup()
    renderWithProviders(<AddTagDialog />)

    // First open and close
    let triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    const nameInput = screen.getByPlaceholderText(/e.g., Close Friend/i)
    await user.type(nameInput, "Work")

    const submitButton = screen.getByRole("button", { name: /create tag/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByText("Add New Tag")).not.toBeInTheDocument()
    })

    // Second open
    triggerButton = screen.getByRole("button", { name: /add tag/i })
    await user.click(triggerButton)

    expect(screen.getByText("Add New Tag")).toBeInTheDocument()
  })
})
