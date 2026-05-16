import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import React from "react"
import { Heart } from "lucide-react"
import { StatTile } from "@/components/Common/StatTile"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@tanstack/react-router")
  >()
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children: React.ReactNode
      to: string
      [key: string]: unknown
    }) => (
      <a href={String(to)} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
  }
})

describe("StatTile", () => {
  it("renders label and value", () => {
    render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    expect(screen.getByText("Contacts")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("renders string value", () => {
    render(
      <StatTile
        icon={Heart}
        label="Status"
        value="Active"
        tone="green"
      />
    )
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("renders icon", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()
  })

  it("renders as div when no 'to' prop", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const wrapper = container.querySelector("div.rounded-xl")
    expect(wrapper?.tagName).toBe("DIV")
  })

  it("renders as Link when 'to' prop provided", () => {
    const { container } = render(
      <StatTile
        icon={Heart}
        label="Contacts"
        value={42}
        tone="blue"
        to="/contacts"
      />
    )
    const link = container.querySelector("a")
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute("href", "/contacts")
  })

  it("applies blue tone classes", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const iconContainer = container.querySelector("div > div > div:last-child")
    expect(iconContainer).toHaveClass("bg-accent-blue", "text-accent-blue-fg")
  })

  it("applies amber tone classes", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="amber" />
    )
    const iconContainer = container.querySelector("div > div > div:last-child")
    expect(iconContainer).toHaveClass(
      "bg-accent-amber",
      "text-accent-amber-fg"
    )
  })

  it("applies green tone classes", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="green" />
    )
    const iconContainer = container.querySelector("div > div > div:last-child")
    expect(iconContainer).toHaveClass("bg-accent-green", "text-accent-green-fg")
  })

  it("applies purple tone classes", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="purple" />
    )
    const iconContainer = container.querySelector("div > div > div:last-child")
    expect(iconContainer).toHaveClass(
      "bg-accent-purple",
      "text-accent-purple-fg"
    )
  })

  it("applies rose tone classes", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="rose" />
    )
    const iconContainer = container.querySelector("div > div > div:last-child")
    expect(iconContainer).toHaveClass("bg-accent-rose", "text-accent-rose-fg")
  })

  it("applies teal tone classes", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="teal" />
    )
    const iconContainer = container.querySelector("div > div > div:last-child")
    expect(iconContainer).toHaveClass("bg-accent-teal", "text-accent-teal-fg")
  })

  it("applies base container classes without link", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const wrapper = container.querySelector("div.rounded-xl")
    expect(wrapper).toHaveClass(
      "rounded-xl",
      "border",
      "bg-card",
      "p-4",
      "shadow-xs",
      "transition-colors"
    )
  })

  it("applies hover classes when link provided", () => {
    const { container } = render(
      <StatTile
        icon={Heart}
        label="Contacts"
        value={42}
        tone="blue"
        to="/contacts"
      />
    )
    const link = container.querySelector("a.rounded-xl")
    expect(link).toHaveClass("hover:bg-accent/50")
  })

  it("does not apply hover classes when no link", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const wrapper = container.querySelector("div.rounded-xl")
    expect(wrapper).not.toHaveClass("hover:bg-accent/50")
  })

  it("applies custom className", () => {
    const { container } = render(
      <StatTile
        icon={Heart}
        label="Contacts"
        value={42}
        tone="blue"
        className="custom-class"
      />
    )
    const wrapper = container.querySelector("div.rounded-xl")
    expect(wrapper).toHaveClass("custom-class")
  })

  it("merges custom className with base classes", () => {
    const { container } = render(
      <StatTile
        icon={Heart}
        label="Contacts"
        value={42}
        tone="blue"
        className="custom-class"
      />
    )
    const wrapper = container.querySelector("div.rounded-xl")
    expect(wrapper).toHaveClass("custom-class", "rounded-xl", "bg-card")
  })

  it("renders label with correct styling", () => {
    render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const label = screen.getByText("Contacts")
    expect(label).toHaveClass("text-sm", "text-muted-foreground")
  })

  it("renders value with correct styling", () => {
    render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const value = screen.getByText("42")
    expect(value).toHaveClass("text-2xl", "font-semibold", "tracking-tight", "tabular-nums")
  })

  it("icon container has correct size", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const iconContainer = container.querySelector("div > div > div:last-child")
    expect(iconContainer).toHaveClass("size-10")
  })

  it("icon SVG has correct size", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const icon = container.querySelector("svg")
    expect(icon).toHaveClass("size-5")
  })

  it("icon container is centered", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const iconContainer = container.querySelector("div > div > div:last-child")
    expect(iconContainer).toHaveClass("flex", "items-center", "justify-center")
  })

  it("layout container uses flex and gap", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const layoutContainer = container.querySelector("div > div")
    expect(layoutContainer).toHaveClass("flex", "items-center", "justify-between", "gap-3")
  })

  it("text container prevents overflow", () => {
    render(
      <StatTile
        icon={Heart}
        label="Very long label text"
        value="Very long value"
        tone="blue"
      />
    )
    const textContainer = screen.getByText("Very long label text").parentElement
    expect(textContainer).toHaveClass("min-w-0")
  })

  it("value spacing uses margin", () => {
    const { container } = render(
      <StatTile icon={Heart} label="Contacts" value={42} tone="blue" />
    )
    const value = screen.getByText("42")
    expect(value.parentElement).toHaveClass("mt-1")
  })

  it("passes through to prop to Link", () => {
    const { container } = render(
      <StatTile
        icon={Heart}
        label="Contacts"
        value={42}
        tone="blue"
        to="/custom/path"
      />
    )
    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "/custom/path")
  })

  it("renders zero value correctly", () => {
    render(<StatTile icon={Heart} label="Empty" value={0} tone="blue" />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("renders large numbers correctly", () => {
    render(
      <StatTile
        icon={Heart}
        label="Large"
        value={999999}
        tone="blue"
      />
    )
    expect(screen.getByText("999999")).toBeInTheDocument()
  })

  it("renders percentage string values", () => {
    render(
      <StatTile
        icon={Heart}
        label="Rate"
        value="95%"
        tone="green"
      />
    )
    expect(screen.getByText("95%")).toBeInTheDocument()
  })
})
