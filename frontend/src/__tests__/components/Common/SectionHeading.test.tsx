import { render, screen } from "@testing-library/react"
import { Heart } from "lucide-react"
import { describe, expect, it } from "vitest"
import { SectionHeading } from "@/components/Common/SectionHeading"

describe("SectionHeading", () => {
  it("renders the title", () => {
    render(<SectionHeading icon={Heart} title="Contacts" />)
    expect(screen.getByText("Contacts")).toBeInTheDocument()
  })

  it("renders the icon", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" />,
    )
    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()
  })

  it("renders count when provided", () => {
    render(<SectionHeading icon={Heart} title="Contacts" count={42} />)
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("does not render count when not provided", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" />,
    )
    const spans = container.querySelectorAll("span")
    // Should be 0 spans since icon doesn't create span elements and no count
    expect(
      Array.from(spans).filter((s) => s.textContent === "42"),
    ).toHaveLength(0)
  })

  it("does not render count when count is null", () => {
    render(<SectionHeading icon={Heart} title="Contacts" count={null} />)
    const countElements = screen.queryAllByText(/^\d+$/)
    // Filter to ensure we're not matching the count
    const counts = countElements.filter((el) => el.textContent?.match(/^\d+$/))
    expect(counts).toHaveLength(0)
  })

  it("renders count of zero", () => {
    render(<SectionHeading icon={Heart} title="Contacts" count={0} />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("renders action when provided", () => {
    const action = <button>Add Contact</button>
    render(<SectionHeading icon={Heart} title="Contacts" action={action} />)
    expect(screen.getByText("Add Contact")).toBeInTheDocument()
  })

  it("does not render action when not provided", () => {
    render(<SectionHeading icon={Heart} title="Contacts" />)
    expect(screen.queryByText("Add Contact")).not.toBeInTheDocument()
  })

  it("does not render action when action is null", () => {
    render(<SectionHeading icon={Heart} title="Contacts" action={null} />)
    expect(screen.queryByText("Add Contact")).not.toBeInTheDocument()
  })

  it("renders with all props provided", () => {
    const action = <button>Add</button>
    render(
      <SectionHeading
        icon={Heart}
        title="Contacts"
        count={15}
        action={action}
      />,
    )
    expect(screen.getByText("Contacts")).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("Add")).toBeInTheDocument()
  })

  it("applies base container classes", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" />,
    )
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass("flex", "items-center", "gap-2")
  })

  it("applies custom className", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" className="custom-class" />,
    )
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass("custom-class")
  })

  it("merges custom className with base classes", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" className="custom-class" />,
    )
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass("custom-class", "flex", "items-center", "gap-2")
  })

  it("applies icon styling classes", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" />,
    )
    const icon = container.querySelector("svg")
    expect(icon).toHaveClass("size-4", "text-primary")
  })

  it("applies title styling classes", () => {
    render(<SectionHeading icon={Heart} title="Contacts" />)
    const title = screen.getByText("Contacts")
    expect(title).toHaveClass("text-base", "font-semibold", "tracking-tight")
  })

  it("applies count styling classes", () => {
    render(<SectionHeading icon={Heart} title="Contacts" count={42} />)
    const count = screen.getByText("42")
    expect(count).toHaveClass("text-sm", "text-muted-foreground")
  })

  it("positions action on the right with ml-auto", () => {
    const action = <button>Add</button>
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" action={action} />,
    )
    // Find the div with ml-auto class that wraps the action
    const actionContainer = container.querySelector("div[class*='ml-auto']")
    expect(actionContainer).toHaveClass("ml-auto")
  })

  it("renders title as h2", () => {
    render(<SectionHeading icon={Heart} title="Contacts" />)
    const title = screen.getByRole("heading", { level: 2 })
    expect(title).toBeInTheDocument()
  })

  it("renders complex action elements", () => {
    const action = (
      <div>
        <button>Option 1</button>
        <button>Option 2</button>
      </div>
    )
    render(<SectionHeading icon={Heart} title="Contacts" action={action} />)
    expect(screen.getByText("Option 1")).toBeInTheDocument()
    expect(screen.getByText("Option 2")).toBeInTheDocument()
  })

  it("handles large count numbers", () => {
    render(<SectionHeading icon={Heart} title="Contacts" count={1000000} />)
    expect(screen.getByText("1000000")).toBeInTheDocument()
  })

  it("handles undefined action prop", () => {
    render(<SectionHeading icon={Heart} title="Contacts" action={undefined} />)
    const title = screen.getByText("Contacts")
    expect(title).toBeInTheDocument()
  })

  it("handles undefined count prop", () => {
    render(<SectionHeading icon={Heart} title="Contacts" count={undefined} />)
    const title = screen.getByText("Contacts")
    expect(title).toBeInTheDocument()
  })

  it("title has correct tag", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" />,
    )
    const heading = container.querySelector("h2")
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent("Contacts")
  })

  it("gap between icon and title", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" />,
    )
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass("gap-2")
  })

  it("container uses flex layout", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" />,
    )
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass("flex")
  })

  it("items are vertically centered", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" />,
    )
    const wrapper = container.querySelector("div")
    expect(wrapper).toHaveClass("items-center")
  })

  it("renders with empty title string", () => {
    const { container } = render(<SectionHeading icon={Heart} title="" />)
    const heading = container.querySelector("h2")
    expect(heading).toBeInTheDocument()
    expect(heading?.textContent).toBe("")
  })

  it("does not conditionally render count when count is undefined", () => {
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" count={undefined} />,
    )
    const spans = container.querySelectorAll("span")
    // Only the icon should be rendered, no count span
    const countSpans = Array.from(spans).filter((s) =>
      s.className.includes("text-muted-foreground"),
    )
    expect(countSpans).toHaveLength(0)
  })

  it("renders action in a separate div wrapper", () => {
    const action = <button>Add</button>
    const { container } = render(
      <SectionHeading icon={Heart} title="Contacts" action={action} />,
    )
    const actionDiv = container.querySelector("div > div:last-child")
    expect(actionDiv).toBeInTheDocument()
    expect(actionDiv?.textContent).toContain("Add")
  })
})
