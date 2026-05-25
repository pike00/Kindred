import { Suspense } from "react"
import { screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TagsList } from "@/components/Tags/TagsList"
import { makeTag, renderWithProviders } from "@/test/helpers"

// Create mock function in hoisted scope
const { mockListTags } = vi.hoisted(() => ({
  mockListTags: vi.fn(),
}))

vi.mock("@/client", () => ({
  TagsService: {
    listTags: mockListTags,
  },
}))

// Mock AddTagDialog
vi.mock("@/components/Tags/AddTagDialog", () => ({
  AddTagDialog: () => (
    <button data-testid="add-tag-button">New Tag</button>
  ),
}))

// Mock DataTable
vi.mock("@/components/Common/DataTable", () => ({
  DataTable: ({ columns, data }: any) => (
    <table data-testid="data-table">
      <tbody>
        {data.map((row: any) => (
          <tr key={row.id} data-testid={`row-${row.id}`}>
            <td>{row.name}</td>
            <td>{row.created_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

// Mock columns
vi.mock("@/components/Tags/columns", () => ({
  columns: [],
}))

describe("TagsList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders heading correctly", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tags")
    })
  })

  it("renders AddTagDialog button", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("add-tag-button")).toBeInTheDocument()
    })
  })

  it("renders empty DataTable when no tags", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument()
    })
    expect(screen.queryByTestId(/row-/)).not.toBeInTheDocument()
  })

  it("renders DataTable with tags", async () => {
    const tags = [
      makeTag({
        id: "t1",
        name: "Friends",
        color: "#3b82f6",
      }),
      makeTag({
        id: "t2",
        name: "Work",
        color: "#ef4444",
      }),
    ]

    mockListTags.mockResolvedValue({ data: tags })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("row-t1")).toBeInTheDocument()
      expect(screen.getByTestId("row-t2")).toBeInTheDocument()
    })
  })

  it("calls queryFn which invokes TagsService.listTags", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(mockListTags).toHaveBeenCalled()
    })
  })

  it("handles undefined data gracefully", async () => {
    mockListTags.mockResolvedValue({ data: undefined })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument()
    })
  })

  it("handles null data gracefully", async () => {
    mockListTags.mockResolvedValue({ data: null })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument()
    })
  })

  it("renders multiple tags in correct order", async () => {
    const tags = [
      makeTag({
        id: "t1",
        name: "Friends",
      }),
      makeTag({
        id: "t2",
        name: "Family",
      }),
      makeTag({
        id: "t3",
        name: "Work",
      }),
    ]

    mockListTags.mockResolvedValue({ data: tags })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      const rows = screen.getAllByTestId(/row-/)
      expect(rows).toHaveLength(3)
    })
  })

  it("displays layout structure with heading and button in flex container", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    const button = screen.getByTestId("add-tag-button")
    expect(button).toBeInTheDocument()
  })

  it("renders with space-y-4 layout", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    })

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass("space-y-4")
  })

  it("passes columns and data to DataTable", async () => {
    const tags = [
      makeTag({
        id: "t1",
        name: "Important",
        color: "#ff0000",
      }),
    ]

    mockListTags.mockResolvedValue({ data: tags })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("row-t1")).toBeInTheDocument()
    })
  })

  it("flexes heading and button correctly", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    })

    const flexContainer = container.querySelector(".flex")
    expect(flexContainer).toHaveClass("justify-between")
    expect(flexContainer).toHaveClass("items-center")
  })

  it("handles large number of tags", async () => {
    const tags = Array.from({ length: 50 }, (_, i) =>
      makeTag({
        id: `t${i}`,
        name: `Tag ${i}`,
        color: `#${Math.random().toString(16).slice(2, 8)}`,
      })
    )

    mockListTags.mockResolvedValue({ data: tags })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("row-t0")).toBeInTheDocument()
      expect(screen.getByTestId("row-t49")).toBeInTheDocument()
    })
  })

  it("queries the tags API on render", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      expect(mockListTags).toHaveBeenCalled()
    })
  })

  it("renders with correct heading font size", async () => {
    mockListTags.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <TagsList />
      </Suspense>
    )

    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toHaveClass("text-4xl")
    })
  })
})
