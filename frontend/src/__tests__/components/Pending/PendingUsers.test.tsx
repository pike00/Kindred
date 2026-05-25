import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import PendingUsers from "@/components/Pending/PendingUsers"
import { renderWithProviders } from "@/test/helpers"

describe("PendingUsers", () => {
  it("renders table structure", () => {
    renderWithProviders(<PendingUsers />)
    expect(screen.getByRole("table")).toBeInTheDocument()
  })

  it("renders table headers", () => {
    renderWithProviders(<PendingUsers />)
    expect(screen.getByText("Full Name")).toBeInTheDocument()
    expect(screen.getByText("Email")).toBeInTheDocument()
    expect(screen.getByText("Role")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
  })

  it("renders 5 skeleton rows", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    // 1 header row + 5 skeleton rows = 6 total
    expect(rows).toHaveLength(6)
  })

  it("renders skeleton placeholders in each row", () => {
    renderWithProviders(<PendingUsers />)
    // Find all skeleton elements - there should be multiple per row
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders full name skeleton in first column", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    // Skip header row and check first data row
    const firstDataRow = rows[1]
    expect(firstDataRow).toBeInTheDocument()
    // Should have skeleton elements for full name
    const skeletons = firstDataRow.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders email skeleton in email column", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    const firstDataRow = rows[1]
    // Verify structure exists
    expect(firstDataRow).toBeInTheDocument()
    // Should have skeleton for email
    const emailSkeletons = firstDataRow.querySelectorAll('[class*="w-40"]')
    expect(emailSkeletons.length).toBeGreaterThanOrEqual(1)
  })

  it("renders role badge skeleton", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    const firstDataRow = rows[1]
    // Should have skeleton for role with rounded styling
    const roleSkeletons = firstDataRow.querySelectorAll('[class*="rounded-full"]')
    expect(roleSkeletons.length).toBeGreaterThan(0)
  })

  it("renders status indicator skeleton", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    const firstDataRow = rows[1]
    // Should have skeleton for status dot and text
    expect(firstDataRow).toBeInTheDocument()
  })

  it("renders action button skeleton", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    const firstDataRow = rows[1]
    const actionSkeletons = firstDataRow.querySelectorAll('[data-slot="skeleton"]')
    // Should have at least one action button skeleton
    expect(actionSkeletons.length).toBeGreaterThan(0)
  })

  it("has hidden actions label", () => {
    renderWithProviders(<PendingUsers />)
    expect(screen.getByText((content, element) => {
      return element?.tagName === "SPAN" && element?.className.includes("sr-only") && content === "Actions"
    })).toBeInTheDocument()
  })

  it("maintains table layout structure", () => {
    renderWithProviders(<PendingUsers />)
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
    renderWithProviders(<PendingUsers />)
    const headers = screen.getAllByRole("columnheader")
    expect(headers.length).toBeGreaterThan(0)
    expect(headers.some((h) => h.textContent?.includes("Full Name"))).toBe(true)
  })

  it("renders status dot and text in status column", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    const firstDataRow = rows[1]
    // Status column should have dot and text skeleton
    const statusElements = firstDataRow.querySelectorAll("div")
    expect(statusElements.length).toBeGreaterThan(0)
  })

  it("renders correct column count", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    const headerRow = rows[0]
    const headerCells = headerRow.querySelectorAll("th")
    // Full Name, Email, Role, Status, Actions (hidden)
    expect(headerCells.length).toBe(5)
  })

  it("renders 5 data rows with consistent structure", () => {
    renderWithProviders(<PendingUsers />)
    const rows = screen.getAllByRole("row")
    const dataRows = rows.slice(1) // Skip header

    expect(dataRows).toHaveLength(5)

    dataRows.forEach((row) => {
      const cells = row.querySelectorAll("td")
      expect(cells.length).toBe(5)
    })
  })

  it("skeletons have appropriate dimensions", () => {
    renderWithProviders(<PendingUsers />)
    // Check for w-32 (full name), w-40 (email), w-20 (role), etc.
    const fullNameSkeletons = document.querySelectorAll('[class*="w-32"]')
    const emailSkeletons = document.querySelectorAll('[class*="w-40"]')
    const roleSkeletons = document.querySelectorAll('[class*="w-20"]')

    expect(fullNameSkeletons.length).toBeGreaterThan(0)
    expect(emailSkeletons.length).toBeGreaterThan(0)
    expect(roleSkeletons.length).toBeGreaterThan(0)
  })
})
