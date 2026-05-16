import { createColumnHelper } from "@tanstack/react-table"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "@/components/Common/DataTable"

// Mock icons
vi.mock("@/lib/icons", () => ({
  ChevronLeft: ({ className }: { className?: string }) => (
    <div className={className} data-testid="chevron-left" />
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <div className={className} data-testid="chevron-right" />
  ),
  ChevronsLeft: ({ className }: { className?: string }) => (
    <div className={className} data-testid="chevrons-left" />
  ),
  ChevronsRight: ({ className }: { className?: string }) => (
    <div className={className} data-testid="chevrons-right" />
  ),
}))

interface TestData {
  id: string
  name: string
  email: string
}

const columnHelper = createColumnHelper<TestData>()

const mockColumns = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue(),
  }),
]

const mockData: TestData[] = [
  { id: "1", name: "Alice", email: "alice@example.com" },
  { id: "2", name: "Bob", email: "bob@example.com" },
  { id: "3", name: "Charlie", email: "charlie@example.com" },
]

describe("DataTable", () => {
  describe("rendering", () => {
    it("renders table headers", () => {
      render(<DataTable columns={mockColumns} data={mockData} />)
      expect(screen.getByText("ID")).toBeInTheDocument()
      expect(screen.getByText("Name")).toBeInTheDocument()
      expect(screen.getByText("Email")).toBeInTheDocument()
    })

    it("renders all data rows", () => {
      render(<DataTable columns={mockColumns} data={mockData} />)
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Bob")).toBeInTheDocument()
      expect(screen.getByText("Charlie")).toBeInTheDocument()
      expect(screen.getByText("alice@example.com")).toBeInTheDocument()
      expect(screen.getByText("bob@example.com")).toBeInTheDocument()
      expect(screen.getByText("charlie@example.com")).toBeInTheDocument()
    })

    it("renders empty state when no data", () => {
      render(<DataTable columns={mockColumns} data={[]} />)
      expect(screen.getByText("No results found.")).toBeInTheDocument()
    })

    it("applies cursor-pointer class to rows when onRowClick provided", () => {
      const onRowClick = vi.fn()
      const { container } = render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onRowClick={onRowClick}
        />,
      )
      const rows = container.querySelectorAll("tbody tr")
      expect(rows[0]).toHaveClass("cursor-pointer")
    })

    it("does not apply cursor-pointer class to rows when onRowClick not provided", () => {
      const { container } = render(
        <DataTable columns={mockColumns} data={mockData} />,
      )
      const rows = container.querySelectorAll("tbody tr")
      expect(rows[0]).not.toHaveClass("cursor-pointer")
    })
  })

  describe("row click handling", () => {
    it("calls onRowClick with row data when row is clicked", async () => {
      const onRowClick = vi.fn()
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          onRowClick={onRowClick}
        />,
      )

      const aliceRow = screen.getByText("Alice").closest("tr")
      if (aliceRow) {
        fireEvent.click(aliceRow)
      }

      expect(onRowClick).toHaveBeenCalledWith(mockData[0])
      expect(onRowClick).toHaveBeenCalledTimes(1)
    })

    it("does not call onRowClick when onRowClick not provided", async () => {
      const { container } = render(
        <DataTable columns={mockColumns} data={mockData} />,
      )
      const firstDataRow = container.querySelector("tbody tr")
      if (firstDataRow) {
        fireEvent.click(firstDataRow)
      }
      // No error should occur
      expect(true).toBe(true)
    })
  })

  describe("pagination", () => {
    it("does not render pagination when page count is 1", () => {
      render(<DataTable columns={mockColumns} data={mockData} />)
      expect(screen.queryByText(/Rows per page/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument()
    })

    it("renders pagination when data exceeds default page size", () => {
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)
      expect(screen.getByText("Rows per page")).toBeInTheDocument()
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument()
    })

    it("shows correct entry count in pagination info", () => {
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)
      expect(
        screen.getByText(/Showing 1 to 10 of 15 entries/),
      ).toBeInTheDocument()
    })

    it("changes page size when page size select is changed", async () => {
      const largeData = Array.from({ length: 30 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)

      const select = screen.getByRole("combobox")
      fireEvent.mouseDown(select)
      const option25 = screen.getByRole("option", { name: "25" })
      fireEvent.click(option25)

      expect(
        screen.getByText(/Showing 1 to 25 of 30 entries/),
      ).toBeInTheDocument()
    })

    it("disables first/previous buttons on first page", () => {
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)
      const buttons = screen.getAllByRole("button")
      const firstPageBtn = buttons.find(
        (btn) => btn.getAttribute("aria-label") === "Go to first page",
      )
      const prevPageBtn = buttons.find(
        (btn) => btn.getAttribute("aria-label") === "Go to previous page",
      )

      expect(firstPageBtn).toBeDisabled()
      expect(prevPageBtn).toBeDisabled()
    })

    it("enables next/last buttons when not on last page", () => {
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)
      const buttons = screen.getAllByRole("button")
      const nextPageBtn = buttons.find(
        (btn) => btn.getAttribute("aria-label") === "Go to next page",
      )
      const lastPageBtn = buttons.find(
        (btn) => btn.getAttribute("aria-label") === "Go to last page",
      )

      expect(nextPageBtn).not.toBeDisabled()
      expect(lastPageBtn).not.toBeDisabled()
    })

    it("navigates to next page when next button clicked", async () => {
      const largeData = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)
      expect(screen.getByText("User 1")).toBeInTheDocument()
      expect(screen.queryByText("User 11")).not.toBeInTheDocument()

      const buttons = screen.getAllByRole("button")
      const nextPageBtn = buttons.find(
        (btn) => btn.getAttribute("aria-label") === "Go to next page",
      )
      if (nextPageBtn) {
        fireEvent.click(nextPageBtn)
      }

      expect(screen.queryByText("User 1")).not.toBeInTheDocument()
      expect(screen.getByText("User 11")).toBeInTheDocument()
    })

    it("navigates to first page when first page button clicked", async () => {
      const largeData = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)

      const buttons = screen.getAllByRole("button")
      const nextPageBtn = buttons.find(
        (btn) => btn.getAttribute("aria-label") === "Go to next page",
      )
      if (nextPageBtn) {
        fireEvent.click(nextPageBtn)
      }

      expect(screen.queryByText("User 1")).not.toBeInTheDocument()

      const firstPageBtn = buttons.find(
        (btn) => btn.getAttribute("aria-label") === "Go to first page",
      )
      if (firstPageBtn) {
        fireEvent.click(firstPageBtn)
      }

      expect(screen.getByText("User 1")).toBeInTheDocument()
    })

    it("updates pagination info when navigating pages", async () => {
      const largeData = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument()

      const buttons = screen.getAllByRole("button")
      const nextPageBtn = buttons.find(
        (btn) => btn.getAttribute("aria-label") === "Go to next page",
      )
      if (nextPageBtn) {
        fireEvent.click(nextPageBtn)
      }

      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument()
      expect(
        screen.getByText(/Showing 11 to 20 of 25 entries/),
      ).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("renders table with proper semantic structure", () => {
      const { container } = render(
        <DataTable columns={mockColumns} data={mockData} />,
      )
      expect(container.querySelector("table")).toBeInTheDocument()
      expect(container.querySelector("thead")).toBeInTheDocument()
      expect(container.querySelector("tbody")).toBeInTheDocument()
    })

    it("includes sr-only text for pagination buttons", () => {
      const largeData = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }))

      render(<DataTable columns={mockColumns} data={largeData} />)
      expect(screen.getByText("Go to first page")).toBeInTheDocument()
      expect(screen.getByText("Go to previous page")).toBeInTheDocument()
      expect(screen.getByText("Go to next page")).toBeInTheDocument()
      expect(screen.getByText("Go to last page")).toBeInTheDocument()
    })
  })

  describe("edge cases", () => {
    it("handles single row of data", () => {
      render(<DataTable columns={mockColumns} data={[mockData[0]]} />)
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.queryByText("No results found.")).not.toBeInTheDocument()
    })

    it("handles data update", () => {
      const { rerender } = render(
        <DataTable columns={mockColumns} data={mockData} />,
      )
      expect(screen.getByText("Alice")).toBeInTheDocument()

      const newData = [
        { id: "4", name: "David", email: "david@example.com" },
        { id: "5", name: "Eve", email: "eve@example.com" },
      ]
      rerender(<DataTable columns={mockColumns} data={newData} />)

      expect(screen.queryByText("Alice")).not.toBeInTheDocument()
      expect(screen.getByText("David")).toBeInTheDocument()
      expect(screen.getByText("Eve")).toBeInTheDocument()
    })

    it("handles columns with custom cell renderers", () => {
      const customColumns = [
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => <strong>{info.getValue()}</strong>,
        }),
      ]

      render(<DataTable columns={customColumns} data={[mockData[0]]} />)
      const boldText = screen.getByText("Alice")
      expect(boldText.tagName).toBe("STRONG")
    })
  })
})
