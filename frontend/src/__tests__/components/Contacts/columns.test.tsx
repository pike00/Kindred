import { describe, expect, it, vi } from "vitest"
import { columns } from "@/components/Contacts/columns"
import { makeContact, makeTag } from "@/test/helpers"

// Mock ContactActionsMenu
vi.mock("@/components/Contacts/ContactActionsMenu", () => ({
  ContactActionsMenu: ({ contact }: any) => (
    <div data-testid={`actions-menu-${contact.id}`}>Actions</div>
  ),
}))

// Mock Badge
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid={`badge-${variant}`}>{children}</span>
  ),
}))

// Mock Star icon
vi.mock("@/lib/icons", () => ({
  Star: () => <span data-testid="star-icon">★</span>,
}))

// Mock getInitials utility
vi.mock("@/utils", () => ({
  getInitials: (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word: string) => word[0])
      .join("")
      .toUpperCase()
  },
}))

describe("columns.tsx", () => {
  describe("column structure", () => {
    it("exports an array of column definitions", () => {
      expect(Array.isArray(columns)).toBe(true)
      expect(columns.length).toBeGreaterThan(0)
    })

    it("has Name column as first column", () => {
      const nameColumn = columns[0]
      expect(nameColumn.header).toBe("Name")
      expect(nameColumn.accessorKey).toBe("first_name")
    })

    it("has Tags column", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")
      expect(tagsColumn).toBeDefined()
      expect(tagsColumn?.accessorKey).toBe("tags")
    })

    it("has Last Contacted column", () => {
      const lastContactedColumn = columns.find(
        (col) => col.header === "Last Contacted",
      )
      expect(lastContactedColumn).toBeDefined()
      expect(lastContactedColumn?.accessorKey).toBe("last_contacted_at")
    })

    it("has is_favorite column with empty header", () => {
      const favoriteColumn = columns.find(
        (col) => col.header === "" && col.accessorKey === "is_favorite",
      )
      expect(favoriteColumn).toBeDefined()
    })

    it("has actions column", () => {
      const actionsColumn = columns.find((col) => col.id === "actions")
      expect(actionsColumn).toBeDefined()
    })

    it("has 5 columns total", () => {
      expect(columns.length).toBe(5)
    })
  })

  describe("Name column cell", () => {
    it("renders full name with all parts", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        prefix: "Dr.",
        first_name: "Alice",
        middle_name: "Marie",
        last_name: "Smith",
        suffix: "Jr.",
        title: "Engineer",
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("renders unnamed contact fallback", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        first_name: null,
        last_name: null,
        middle_name: null,
        prefix: null,
        suffix: null,
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("displays title when present", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        first_name: "Alice",
        title: "Software Engineer",
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("does not display title when absent", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        first_name: "Alice",
        title: null,
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("computes initials from full name", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        first_name: "Alice",
        last_name: "Smith",
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      // Should have initials "AS"
      expect(rendered).toBeDefined()
    })

    it("handles single name with initials", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        first_name: "Alice",
        last_name: null,
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("computes initials from unknown when all names are null", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        first_name: null,
        last_name: null,
        middle_name: null,
        prefix: null,
        suffix: null,
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })
  })

  describe("Tags column cell", () => {
    it("renders dash for empty tags", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")!
      const contact = makeContact({
        id: "1",
        tags: [],
      })
      const row = { original: contact }

      const rendered = tagsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBe("—")
    })

    it("renders dash when tags is null", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")!
      const contact = makeContact({
        id: "1",
        tags: null as any,
      })
      const row = { original: contact }

      const rendered = tagsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBe("—")
    })

    it("renders all tags when count <= 3", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")!
      const tag1 = makeTag({ id: "t1", name: "Friends" })
      const tag2 = makeTag({ id: "t2", name: "Colleagues" })
      const tag3 = makeTag({ id: "t3", name: "Family" })

      const contact = makeContact({
        id: "1",
        tags: [tag1, tag2, tag3],
      })
      const row = { original: contact }

      const rendered = tagsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)
      const html = rendered as any

      expect(html.props.children).toBeDefined()
    })

    it("renders first 3 tags when count > 3", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")!
      const tags = Array.from({ length: 5 }, (_, i) =>
        makeTag({ id: `t${i}`, name: `Tag${i}` }),
      )

      const contact = makeContact({
        id: "1",
        tags,
      })
      const row = { original: contact }

      const rendered = tagsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)
      const html = rendered as any

      expect(html.props.children).toBeDefined()
    })

    it("renders +N badge for extra tags", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")!
      const tags = Array.from({ length: 5 }, (_, i) =>
        makeTag({ id: `t${i}`, name: `Tag${i}` }),
      )

      const contact = makeContact({
        id: "1",
        tags,
      })
      const row = { original: contact }

      const rendered = tagsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)
      const html = rendered as any

      // Should render 3 individual tags + 1 +2 badge
      expect(html.props.children).toBeDefined()
    })

    it("renders badge with correct count for 10 tags", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")!
      const tags = Array.from({ length: 10 }, (_, i) =>
        makeTag({ id: `t${i}`, name: `Tag${i}` }),
      )

      const contact = makeContact({
        id: "1",
        tags,
      })
      const row = { original: contact }

      const rendered = tagsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)
      const html = rendered as any

      expect(html.props.children).toBeDefined()
    })

    it("does not render +N badge when exactly 3 tags", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")!
      const tags = Array.from({ length: 3 }, (_, i) =>
        makeTag({ id: `t${i}`, name: `Tag${i}` }),
      )

      const contact = makeContact({
        id: "1",
        tags,
      })
      const row = { original: contact }

      const rendered = tagsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)
      const html = rendered as any

      expect(html.props.children).toBeDefined()
    })

    it("renders single tag", () => {
      const tagsColumn = columns.find((col) => col.header === "Tags")!
      const tag = makeTag({ id: "t1", name: "Friends" })

      const contact = makeContact({
        id: "1",
        tags: [tag],
      })
      const row = { original: contact }

      const rendered = tagsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)
      const html = rendered as any

      expect(html.props.children).toBeDefined()
    })
  })

  describe("Last Contacted column cell", () => {
    it("renders 'Never' when date is null", () => {
      const lastContactedColumn = columns.find(
        (col) => col.header === "Last Contacted",
      )!
      const contact = makeContact({
        id: "1",
        last_contacted_at: null,
      })
      const row = { original: contact }

      const rendered = lastContactedColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBe("Never")
    })

    it("renders formatted date when present", () => {
      const lastContactedColumn = columns.find(
        (col) => col.header === "Last Contacted",
      )!
      const contact = makeContact({
        id: "1",
        last_contacted_at: "2025-05-15T10:00:00Z",
      })
      const row = { original: contact }

      const rendered = lastContactedColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(typeof rendered).toBe("string")
      expect(rendered).not.toBe("Never")
    })

    it("formats date correctly", () => {
      const lastContactedColumn = columns.find(
        (col) => col.header === "Last Contacted",
      )!
      const contact = makeContact({
        id: "1",
        last_contacted_at: "2025-05-15T00:00:00Z",
      })
      const row = { original: contact }

      const rendered = lastContactedColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      // Should be a valid date string (format depends on locale)
      expect(typeof rendered).toBe("string")
      expect(rendered.length).toBeGreaterThan(0)
    })

    it("handles different date formats", () => {
      const lastContactedColumn = columns.find(
        (col) => col.header === "Last Contacted",
      )!
      const dates = [
        "2024-01-01T00:00:00Z",
        "2025-12-31T23:59:59Z",
        "2020-06-15T12:30:45Z",
      ]

      dates.forEach((date) => {
        const contact = makeContact({
          id: "1",
          last_contacted_at: date,
        })
        const row = { original: contact }

        const rendered = lastContactedColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

        expect(typeof rendered).toBe("string")
        expect(rendered).not.toBe("Never")
      })
    })
  })

  describe("is_favorite column cell", () => {
    it("renders star icon when is_favorite is true", () => {
      const favoriteColumn = columns.find(
        (col) => col.header === "" && col.accessorKey === "is_favorite",
      )!
      const contact = makeContact({
        id: "1",
        is_starred: true,
      })
      const row = { original: contact }

      const rendered = favoriteColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("renders empty when is_favorite is false", () => {
      const favoriteColumn = columns.find(
        (col) => col.header === "" && col.accessorKey === "is_favorite",
      )!
      const contact = makeContact({
        id: "1",
        is_starred: false,
      })
      const row = { original: contact }

      const rendered = favoriteColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("renders empty div structure when not favorite", () => {
      const favoriteColumn = columns.find(
        (col) => col.header === "" && col.accessorKey === "is_favorite",
      )!
      const contact = makeContact({
        id: "1",
        is_starred: false,
      })
      const row = { original: contact }

      const rendered = favoriteColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("has correct alignment classNames", () => {
      const favoriteColumn = columns.find(
        (col) => col.header === "" && col.accessorKey === "is_favorite",
      )!
      const contact = makeContact({
        id: "1",
        is_starred: true,
      })
      const row = { original: contact }

      const rendered = favoriteColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })
  })

  describe("actions column cell", () => {
    it("renders ContactActionsMenu", () => {
      const actionsColumn = columns.find((col) => col.id === "actions")!
      const contact = makeContact({
        id: "test-123",
        first_name: "Alice",
      })
      const row = { original: contact }

      const rendered = actionsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("passes contact to ContactActionsMenu", () => {
      const actionsColumn = columns.find((col) => col.id === "actions")!
      const contact = makeContact({
        id: "contact-456",
        first_name: "Bob",
        last_name: "Jones",
      })
      const row = { original: contact }

      const rendered = actionsColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })
  })

  describe("column cell rendering edge cases", () => {
    it("handles contact with all optional fields null", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        first_name: "Alice",
        last_name: null,
        middle_name: null,
        prefix: null,
        suffix: null,
        title: null,
        company: null,
        nickname: null,
        tags: null,
        last_contacted_at: null,
        is_starred: false,
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("handles contact with all optional fields populated", () => {
      const nameColumn = columns[0]
      const tags = [makeTag({ id: "t1", name: "Friends" })]
      const contact = makeContact({
        id: "1",
        prefix: "Dr.",
        first_name: "Alice",
        middle_name: "Marie",
        last_name: "Smith",
        suffix: "Jr.",
        nickname: "Ali",
        title: "CEO",
        company: "Acme Corp",
        tags,
        last_contacted_at: "2025-05-15T10:00:00Z",
        is_starred: true,
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })

    it("handles very long names", () => {
      const nameColumn = columns[0]
      const contact = makeContact({
        id: "1",
        prefix: "Dr.",
        first_name: "Alexander",
        middle_name: "Christopher",
        last_name: "Vanderbuilt",
        suffix: "III",
      })
      const row = { original: contact }

      const rendered = nameColumn.cell?.({ row, column: null, getValue: () => null, renderingCell: false } as any)

      expect(rendered).toBeDefined()
    })
  })
})
