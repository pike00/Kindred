import { render, screen } from "@testing-library/react"
import { Heart } from "lucide-react"
import { describe, expect, it } from "vitest"
import { EmptyState } from "@/components/Common/EmptyState"

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState icon={Heart} title="No items" />)
    expect(screen.getByText("No items")).toBeInTheDocument()
  })

  it("renders the icon", () => {
    const { container } = render(<EmptyState icon={Heart} title="No items" />)
    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()
  })

  it("renders description when provided", () => {
    render(
      <EmptyState
        icon={Heart}
        title="No items"
        description="Add your first item to get started"
      />,
    )
    expect(
      screen.getByText("Add your first item to get started"),
    ).toBeInTheDocument()
  })

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyState icon={Heart} title="No items" />)
    const descriptions = container.querySelectorAll("p")
    expect(descriptions).toHaveLength(1) // Only title, no description
  })

  it("renders action when provided", () => {
    const action = <button>Create Item</button>
    render(<EmptyState icon={Heart} title="No items" action={action} />)
    expect(screen.getByText("Create Item")).toBeInTheDocument()
  })

  it("does not render action when not provided", () => {
    render(<EmptyState icon={Heart} title="No items" />)
    expect(screen.queryByText("Create Item")).not.toBeInTheDocument()
  })

  it("renders both description and action together", () => {
    const action = <button>Add Item</button>
    render(
      <EmptyState
        icon={Heart}
        title="No items"
        description="You have no items yet"
        action={action}
      />,
    )
    expect(screen.getByText("No items")).toBeInTheDocument()
    expect(screen.getByText("You have no items yet")).toBeInTheDocument()
    expect(screen.getByText("Add Item")).toBeInTheDocument()
  })

  it("applies base styling classes", () => {
    const { container } = render(<EmptyState icon={Heart} title="No items" />)
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass(
      "flex",
      "flex-col",
      "items-center",
      "rounded-xl",
      "border",
      "border-dashed",
      "bg-card",
      "text-center",
    )
  })

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState icon={Heart} title="No items" className="custom-class" />,
    )
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass("custom-class")
  })

  it("merges custom className with base classes", () => {
    const { container } = render(
      <EmptyState icon={Heart} title="No items" className="my-custom" />,
    )
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass("my-custom", "rounded-xl", "bg-card")
  })

  it("renders icon with correct styling", () => {
    const { container } = render(<EmptyState icon={Heart} title="No items" />)
    // The main wrapper is the first div, and the icon wrapper is the first child div
    const mainWrapper = container.querySelector("div")
    const iconWrapper = mainWrapper?.querySelector("div")
    expect(iconWrapper).toHaveClass(
      "flex",
      "items-center",
      "justify-center",
      "rounded-lg",
      "bg-muted",
      "size-11",
      "mb-3",
    )
  })

  it("renders title with correct styling", () => {
    render(<EmptyState icon={Heart} title="No items" />)
    const titleElement = screen.getByText("No items")
    expect(titleElement).toHaveClass("text-sm", "font-medium")
  })

  it("renders description with correct styling", () => {
    render(
      <EmptyState
        icon={Heart}
        title="No items"
        description="Test description"
      />,
    )
    const descriptionElement = screen.getByText("Test description")
    expect(descriptionElement).toHaveClass(
      "text-xs",
      "text-muted-foreground",
      "max-w-sm",
    )
  })

  it("renders action in correctly positioned container", () => {
    const action = <button>Create</button>
    const { container } = render(
      <EmptyState icon={Heart} title="No items" action={action} />,
    )
    // The action is the last child within the main wrapper
    const mainWrapper = container.querySelector("div")
    const actionContainer = mainWrapper?.querySelector("div:last-child")
    expect(actionContainer).toHaveClass("mt-4")
  })

  it("renders description with correct margin spacing", () => {
    render(
      <EmptyState
        icon={Heart}
        title="No items"
        description="Test description"
      />,
    )
    const descriptionElement = screen.getByText("Test description")
    expect(descriptionElement).toHaveClass("mt-1")
  })

  it("renders complex action elements", () => {
    const action = (
      <div>
        <button>Option 1</button>
        <button>Option 2</button>
      </div>
    )
    render(<EmptyState icon={Heart} title="No items" action={action} />)
    expect(screen.getByText("Option 1")).toBeInTheDocument()
    expect(screen.getByText("Option 2")).toBeInTheDocument()
  })

  it("handles empty title gracefully", () => {
    const { container } = render(<EmptyState icon={Heart} title="" />)
    const titleElement = container.querySelector("p")
    expect(titleElement).toBeInTheDocument()
    expect(titleElement?.textContent).toBe("")
  })

  it("handles long description text", () => {
    const longDescription =
      "This is a very long description that should be constrained with max-width"
    render(
      <EmptyState
        icon={Heart}
        title="No items"
        description={longDescription}
      />,
    )
    const descriptionElement = screen.getByText(longDescription)
    expect(descriptionElement).toHaveClass("max-w-sm")
  })

  it("icon div has correct size", () => {
    const { container } = render(<EmptyState icon={Heart} title="No items" />)
    const mainWrapper = container.querySelector("div")
    const iconWrapper = mainWrapper?.querySelector("div")
    expect(iconWrapper).toHaveClass("size-11")
  })

  it("icon SVG has correct size", () => {
    const { container } = render(<EmptyState icon={Heart} title="No items" />)
    const icon = container.querySelector("svg")
    expect(icon).toHaveClass("size-5")
  })
})
