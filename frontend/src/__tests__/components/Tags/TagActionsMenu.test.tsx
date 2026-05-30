import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TagActionsMenu } from "@/components/Tags/TagActionsMenu"
import { makeTag, renderWithProviders } from "@/test/helpers"

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
    deleteTag: vi.fn(),
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

// Mock RowActionsMenu
vi.mock("@/components/Common/RowActionsMenu", () => ({
  RowActionsMenu: ({ items }: any) => (
    <div data-testid="row-actions-menu">
      {items.map((item: any, idx: number) => (
        <button key={idx} onClick={() => item.onSelect()}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  Trash2: () => null,
  Share2: () => null,
}))

describe("TagActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders menu", () => {
    const tag = makeTag()
    renderWithProviders(<TagActionsMenu tag={tag} />)

    expect(screen.getByTestId("row-actions-menu")).toBeInTheDocument()
  })

  it("renders delete action", () => {
    const tag = makeTag()
    renderWithProviders(<TagActionsMenu tag={tag} />)

    expect(screen.getByText("Delete")).toBeInTheDocument()
  })

  it("calls deleteTag mutation on Delete click", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockResolvedValue({})

    const tag = makeTag({ id: "tag-123" })
    const user = userEvent.setup()

    renderWithProviders(<TagActionsMenu tag={tag} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteTag).toHaveBeenCalledWith({ tagId: "tag-123" })
    })
  })

  it("shows success toast on successful deletion", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockResolvedValue({})

    const tag = makeTag()
    const user = userEvent.setup()

    renderWithProviders(<TagActionsMenu tag={tag} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Tag deleted")
    })
  })

  it("invalidates tags query on successful deletion", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockResolvedValue({})

    const tag = makeTag()
    const user = userEvent.setup()

    const { queryClient } = renderWithProviders(<TagActionsMenu tag={tag} />)
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tags"] })
    })
  })

  it("shows error toast on deletion failure", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockRejectedValue(new Error("API error"))

    const tag = makeTag()
    const user = userEvent.setup()

    renderWithProviders(<TagActionsMenu tag={tag} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Failed to delete tag")
    })
  })

  it("does not show success toast on deletion failure", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockRejectedValue(new Error("API error"))

    const tag = makeTag()
    const user = userEvent.setup()

    renderWithProviders(<TagActionsMenu tag={tag} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).not.toHaveBeenCalled()
    })
  })

  it("handles deletion with different tag IDs", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockResolvedValue({})

    const tags = [
      makeTag({ id: "id-1", name: "Friends" }),
      makeTag({ id: "id-2", name: "Colleagues" }),
      makeTag({ id: "id-3", name: "Family" }),
    ]

    const user = userEvent.setup()

    for (const tag of tags) {
      vi.clearAllMocks()
      mockDeleteTag.mockResolvedValue({})

      const { unmount } = renderWithProviders(<TagActionsMenu tag={tag} />)

      const deleteButton = screen.getByText("Delete")
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteTag).toHaveBeenCalledWith({ tagId: tag.id })
      })

      unmount()
    }
  })

  it("renders with tag data passed as prop", () => {
    const tag = makeTag({
      id: "specific-tag-id",
      name: "Urgent",
      color: "#ef4444",
    })

    renderWithProviders(<TagActionsMenu tag={tag} />)

    // Component doesn't directly display tag info, but should render without errors
    expect(screen.getByTestId("row-actions-menu")).toBeInTheDocument()
  })

  it("handles null color in tag", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockResolvedValue({})

    const tag = makeTag({ color: null })
    const user = userEvent.setup()

    renderWithProviders(<TagActionsMenu tag={tag} />)

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteTag).toHaveBeenCalled()
    })
  })

  it("only renders delete action (not edit or view)", () => {
    const tag = makeTag()
    renderWithProviders(<TagActionsMenu tag={tag} />)

    expect(screen.getByText("Delete")).toBeInTheDocument()
    expect(screen.queryByText("Edit")).not.toBeInTheDocument()
    expect(screen.queryByText("View")).not.toBeInTheDocument()
  })

  it("does not invalidate tags query on deletion error", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockRejectedValue(new Error("API error"))

    const tag = makeTag()
    const user = userEvent.setup()

    const { queryClient } = renderWithProviders(<TagActionsMenu tag={tag} />)
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const deleteButton = screen.getByText("Delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(invalidateSpy).not.toHaveBeenCalled()
    })
  })

  it("can handle multiple delete attempts", async () => {
    const { TagsService } = await import("@/client")
    const mockDeleteTag = vi.mocked(TagsService.deleteTag)
    mockDeleteTag.mockResolvedValue({})

    const tag = makeTag({ id: "tag-multi" })
    const user = userEvent.setup()

    renderWithProviders(<TagActionsMenu tag={tag} />)

    const deleteButton = screen.getByText("Delete")

    // First delete
    await user.click(deleteButton)
    await waitFor(() => {
      expect(mockDeleteTag).toHaveBeenCalledWith({ tagId: "tag-multi" })
    })

    // Second delete (simulating component reuse/rerender)
    vi.clearAllMocks()
    mockDeleteTag.mockResolvedValue({})

    await user.click(deleteButton)
    await waitFor(() => {
      expect(mockDeleteTag).toHaveBeenCalledWith({ tagId: "tag-multi" })
    })
  })
})
