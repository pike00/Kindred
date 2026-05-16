import { fireEvent, render, screen } from "@testing-library/react"
import { Edit, Trash2 } from "lucide-react"
import { describe, expect, it, vi } from "vitest"
import {
  type RowActionItem,
  RowActionsMenu,
} from "@/components/Common/RowActionsMenu"

// Mock icons
vi.mock("@/lib/icons", () => ({
  MoreHorizontal: ({ className }: { className?: string }) => (
    <div data-testid="more-horizontal" className={className} />
  ),
}))

describe("RowActionsMenu", () => {
  describe("rendering", () => {
    it("renders trigger button with MoreHorizontal icon", () => {
      const items: RowActionItem[] = []
      render(<RowActionsMenu items={items} />)

      const button = screen.getByRole("button", { name: "Open actions menu" })
      expect(button).toBeInTheDocument()
      expect(screen.getByTestId("more-horizontal")).toBeInTheDocument()
    })

    it("renders custom aria-label on trigger", () => {
      const items: RowActionItem[] = []
      render(<RowActionsMenu items={items} ariaLabel="Custom menu label" />)

      const button = screen.getByRole("button", { name: "Custom menu label" })
      expect(button).toBeInTheDocument()
    })

    it("renders all action items in dropdown", async () => {
      const items: RowActionItem[] = [
        { label: "Edit", onSelect: vi.fn() },
        { label: "Delete", onSelect: vi.fn() },
        { label: "Archive", onSelect: vi.fn() },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      expect(screen.getByText("Edit")).toBeInTheDocument()
      expect(screen.getByText("Delete")).toBeInTheDocument()
      expect(screen.getByText("Archive")).toBeInTheDocument()
    })

    it("renders empty menu when no items provided", () => {
      render(<RowActionsMenu items={[]} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      // Menu content area should be empty
      const menuContent = screen.getByRole("menu")
      expect(menuContent).toBeInTheDocument()
    })
  })

  describe("menu interaction", () => {
    it("opens dropdown when trigger is clicked", () => {
      const items: RowActionItem[] = [{ label: "Edit", onSelect: vi.fn() }]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      expect(screen.queryByText("Edit")).not.toBeInTheDocument()

      fireEvent.click(trigger)
      expect(screen.getByText("Edit")).toBeInTheDocument()
    })

    it("stops click propagation on trigger button", () => {
      const items: RowActionItem[] = [{ label: "Edit", onSelect: vi.fn() }]
      const parentClick = vi.fn()

      const { container } = render(
        <div onClick={parentClick}>
          <RowActionsMenu items={items} />
        </div>,
      )

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      expect(parentClick).not.toHaveBeenCalled()
    })

    it("calls onSelect when menu item is clicked", () => {
      const onSelect1 = vi.fn()
      const onSelect2 = vi.fn()

      const items: RowActionItem[] = [
        { label: "Edit", onSelect: onSelect1 },
        { label: "Delete", onSelect: onSelect2 },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      const editItem = screen.getByText("Edit")
      fireEvent.click(editItem)

      expect(onSelect1).toHaveBeenCalledTimes(1)
      expect(onSelect2).not.toHaveBeenCalled()
    })

    it("calls correct onSelect for multiple items", () => {
      const callbacks = {
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onArchive: vi.fn(),
      }

      const items: RowActionItem[] = [
        { label: "Edit", onSelect: callbacks.onEdit },
        { label: "Delete", onSelect: callbacks.onDelete },
        { label: "Archive", onSelect: callbacks.onArchive },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      fireEvent.click(screen.getByText("Delete"))
      expect(callbacks.onDelete).toHaveBeenCalledTimes(1)
      expect(callbacks.onEdit).not.toHaveBeenCalled()
      expect(callbacks.onArchive).not.toHaveBeenCalled()
    })
  })

  describe("item variants", () => {
    it("renders items with icons", () => {
      const items: RowActionItem[] = [
        { label: "Edit", icon: Edit, onSelect: vi.fn() },
        { label: "Delete", icon: Trash2, onSelect: vi.fn() },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      // Icons are rendered (SVG elements from lucide-react)
      expect(screen.getByText("Edit")).toBeInTheDocument()
      expect(screen.getByText("Delete")).toBeInTheDocument()
    })

    it("renders items without icons", () => {
      const items: RowActionItem[] = [
        { label: "Action 1", onSelect: vi.fn() },
        { label: "Action 2", onSelect: vi.fn() },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      expect(screen.getByText("Action 1")).toBeInTheDocument()
      expect(screen.getByText("Action 2")).toBeInTheDocument()
    })

    it("renders disabled items as non-clickable", () => {
      const onSelect = vi.fn()
      const items: RowActionItem[] = [
        { label: "Disabled Action", onSelect, disabled: true },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      const menuItem = screen.getByRole("menuitem", { name: /Disabled Action/ })
      expect(menuItem).toHaveAttribute("aria-disabled", "true")
    })

    it("does not call onSelect for disabled items", () => {
      const onSelect = vi.fn()
      const items: RowActionItem[] = [
        { label: "Disabled Action", onSelect, disabled: true },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      const menuItem = screen.getByRole("menuitem", { name: /Disabled Action/ })
      fireEvent.click(menuItem)

      expect(onSelect).not.toHaveBeenCalled()
    })

    it("renders destructive items with destructive styling", () => {
      const items: RowActionItem[] = [
        { label: "Delete", onSelect: vi.fn(), variant: "destructive" },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      const deleteItem = screen.getByText("Delete").closest("[role='menuitem']")
      expect(deleteItem).toHaveClass("text-destructive")
      expect(deleteItem).toHaveClass("focus:text-destructive")
    })

    it("renders default variant items without destructive styling", () => {
      const items: RowActionItem[] = [
        { label: "Edit", onSelect: vi.fn(), variant: "default" },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      const editItem = screen.getByText("Edit").closest("[role='menuitem']")
      expect(editItem).not.toHaveClass("text-destructive")
    })
  })

  describe("styling and className", () => {
    it("applies custom trigger className", () => {
      const items: RowActionItem[] = [{ label: "Edit", onSelect: vi.fn() }]

      const { container } = render(
        <RowActionsMenu items={items} triggerClassName="custom-class" />,
      )

      const trigger = container.querySelector("button")
      expect(trigger).toHaveClass("custom-class")
    })

    it("includes default trigger classes", () => {
      const items: RowActionItem[] = [{ label: "Edit", onSelect: vi.fn() }]

      const { container } = render(<RowActionsMenu items={items} />)

      const trigger = container.querySelector("button")
      expect(trigger).toHaveClass("size-8")
      expect(trigger).toHaveClass("p-0")
    })
  })

  describe("accessibility", () => {
    it("has accessible trigger button", () => {
      const items: RowActionItem[] = [{ label: "Edit", onSelect: vi.fn() }]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute("aria-label", "Open actions menu")
    })

    it("renders menu items as menu items role", () => {
      const items: RowActionItem[] = [
        { label: "Edit", onSelect: vi.fn() },
        { label: "Delete", onSelect: vi.fn() },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      const menuItems = screen.getAllByRole("menuitem")
      expect(menuItems).toHaveLength(2)
    })
  })

  describe("edge cases", () => {
    it("handles rapid clicks on trigger", () => {
      const items: RowActionItem[] = [{ label: "Edit", onSelect: vi.fn() }]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })

      fireEvent.click(trigger)
      fireEvent.click(trigger)
      fireEvent.click(trigger)

      // Should handle multiple clicks without errors
      expect(trigger).toBeInTheDocument()
    })

    it("handles items with long labels", () => {
      const items: RowActionItem[] = [
        {
          label:
            "This is a very long action label that should wrap or be handled gracefully",
          onSelect: vi.fn(),
        },
      ]

      render(<RowActionsMenu items={items} />)

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)

      expect(
        screen.getByText(/This is a very long action label/),
      ).toBeInTheDocument()
    })

    it("handles updating items", () => {
      const onSelect1 = vi.fn()
      const onSelect2 = vi.fn()

      const { rerender } = render(
        <RowActionsMenu items={[{ label: "Edit", onSelect: onSelect1 }]} />,
      )

      const trigger = screen.getByRole("button", { name: "Open actions menu" })
      fireEvent.click(trigger)
      expect(screen.getByText("Edit")).toBeInTheDocument()

      rerender(
        <RowActionsMenu items={[{ label: "Delete", onSelect: onSelect2 }]} />,
      )

      fireEvent.click(trigger)
      expect(screen.queryByText("Edit")).not.toBeInTheDocument()
      expect(screen.getByText("Delete")).toBeInTheDocument()
    })
  })
})
