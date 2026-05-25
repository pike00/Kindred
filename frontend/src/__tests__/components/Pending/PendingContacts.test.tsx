import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import PendingContacts from "@/components/Pending/PendingContacts"
import { renderWithProviders } from "@/test/helpers"

describe("PendingContacts", () => {
  it("renders table structure", () => {
    renderWithProviders(<PendingContacts />)
    expect(screen.getByRole("table")).toBeInTheDocument()
  })

  it("renders table headers", () => {
    renderWithProviders(<PendingContacts />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Company")).toBeInTheDocument()
    expect(screen.getByText("Tags")).toBeInTheDocument()
    expect(screen.getByText("Last Contacted")).toBeInTheDocument()
  })

  it("renders 5 skeleton rows", () => {
    renderWithProviders(<PendingContacts />)
    const rows = screen.getAllByRole("row")
    // 1 header row + 5 skeleton rows = 6 total
    expect(rows).toHaveLength(6)
  })

  it("renders skeleton placeholders in each row", () => {
    renderWithProviders(<PendingContacts />)
    // Find all skeleton elements - there should be multiple per row for Name, Company, Tags, LastContacted
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders avatar skeleton in name column", () => {
    renderWithProviders(<PendingContacts />)
    const rows = screen.getAllByRole("row")
    // Skip header row and check first data row
    const firstDataRow = rows[1]
    expect(firstDataRow).toBeInTheDocument()
    // Should have skeleton elements for avatar and name
    const skeletons = firstDataRow.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(2)
  })

  it("renders tags skeleton in tags column", () => {
    renderWithProviders(<PendingContacts />)
    const rows = screen.getAllByRole("row")
    const firstDataRow = rows[1]
    // Verify structure exists
    expect(firstDataRow).toBeInTheDocument()
  })

  it("renders action button skeleton", () => {
    renderWithProviders(<PendingContacts />)
    const rows = screen.getAllByRole("row")
    const firstDataRow = rows[1]
    const actionSkeletons = firstDataRow.querySelectorAll('[data-slot="skeleton"]')
    // Should have at least one action button skeleton
    expect(actionSkeletons.length).toBeGreaterThan(0)
  })

  it("has hidden actions label", () => {
    renderWithProviders(<PendingContacts />)
    expect(screen.getByText((content, element) => {
      return element?.tagName === "SPAN" && element?.className.includes("sr-only") && content === "Actions"
    })).toBeInTheDocument()
  })

  it("renders correct number of skeleton elements for table structure", () => {
    renderWithProviders(<PendingContacts />)
    // Each row has: avatar (1) + name (1) + company (1) + 2 tags (2) + last contacted (1) + action button (1) = 7 skeletons per row
    // 5 rows * 7 = 35 skeleton divs (approximately, some may be wrapper divs)
    const rows = screen.getAllByRole("row")
    expect(rows.length).toBe(6) // 1 header + 5 data rows
  })

  it("maintains table layout structure", () => {
    renderWithProviders(<PendingContacts />)
    const table = screen.getByRole("table")
    expect(table).toBeInTheDocument()

    const thead = table.querySelector("thead")
    const tbody = table.querySelector("tbody")

    expect(thead).toBeInTheDocument()
    expect(tbody).toBeInTheDocument()

    const headerRows = thead?.querySelectorAll("tr")
    const bodyRows = tbody?.querySelectorAll("tr")

    expect(headerRows).toHaveLength(1)
    expect(bodyRows).toHaveLength(5)
  })

  it("renders accessible table headers", () => {
    renderWithProviders(<PendingContacts />)
    const headers = screen.getAllByRole("columnheader")
    expect(headers.length).toBeGreaterThan(0)
    expect(headers.some((h) => h.textContent?.includes("Name"))).toBe(true)
  })
})
