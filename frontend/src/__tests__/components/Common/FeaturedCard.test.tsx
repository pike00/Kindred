import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FeaturedCard } from "@/components/Common/FeaturedCard"

describe("FeaturedCard", () => {
  it("renders children", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Test Content</div>
      </FeaturedCard>,
    )
    expect(container.textContent).toContain("Test Content")
  })

  it("renders multiple children", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content 1</div>
        <div>Content 2</div>
      </FeaturedCard>,
    )
    expect(container.textContent).toContain("Content 1")
    expect(container.textContent).toContain("Content 2")
  })

  it("applies default amber tone", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("border-accent-amber")
  })

  it("applies amber tone border", () => {
    const { container } = render(
      <FeaturedCard tone="amber">
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("border-accent-amber")
  })

  it("applies blue tone border", () => {
    const { container } = render(
      <FeaturedCard tone="blue">
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("border-accent-blue")
  })

  it("applies green tone border", () => {
    const { container } = render(
      <FeaturedCard tone="green">
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("border-accent-green")
  })

  it("applies rose tone border", () => {
    const { container } = render(
      <FeaturedCard tone="rose">
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("border-accent-rose")
  })

  it("applies amber tone gradient", () => {
    const { container } = render(
      <FeaturedCard tone="amber">
        <div>Content</div>
      </FeaturedCard>,
    )
    const gradient = container.querySelector("div > div > div:first-child")
    expect(gradient).toHaveClass(
      "bg-[radial-gradient(circle_at_top_right,var(--accent-amber),transparent_65%)]",
    )
  })

  it("applies blue tone gradient", () => {
    const { container } = render(
      <FeaturedCard tone="blue">
        <div>Content</div>
      </FeaturedCard>,
    )
    const gradient = container.querySelector("div > div > div:first-child")
    expect(gradient).toHaveClass(
      "bg-[radial-gradient(circle_at_top_right,var(--accent-blue),transparent_65%)]",
    )
  })

  it("applies green tone gradient", () => {
    const { container } = render(
      <FeaturedCard tone="green">
        <div>Content</div>
      </FeaturedCard>,
    )
    const gradient = container.querySelector("div > div > div:first-child")
    expect(gradient).toHaveClass(
      "bg-[radial-gradient(circle_at_top_right,var(--accent-green),transparent_65%)]",
    )
  })

  it("applies rose tone gradient", () => {
    const { container } = render(
      <FeaturedCard tone="rose">
        <div>Content</div>
      </FeaturedCard>,
    )
    const gradient = container.querySelector("div > div > div:first-child")
    expect(gradient).toHaveClass(
      "bg-[radial-gradient(circle_at_top_right,var(--accent-rose),transparent_65%)]",
    )
  })

  it("applies base container classes", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass(
      "bg-card",
      "relative",
      "overflow-hidden",
      "rounded-[18px]",
      "border",
      "p-6",
      "shadow-xs",
      "transition-shadow",
    )
  })

  it("applies hover shadow on card", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("hover:shadow-sm")
  })

  it("applies custom className", () => {
    const { container } = render(
      <FeaturedCard className="custom-class">
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("custom-class")
  })

  it("merges custom className with base classes", () => {
    const { container } = render(
      <FeaturedCard className="custom-class">
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("custom-class", "rounded-[18px]", "bg-card")
  })

  it("gradient has aria-hidden attribute", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const gradient = container.querySelector("div > div > div:first-child")
    expect(gradient).toHaveAttribute("aria-hidden", "true")
  })

  it("gradient has pointer-events-none class", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const gradient = container.querySelector("div > div > div:first-child")
    expect(gradient).toHaveClass("pointer-events-none")
  })

  it("gradient is absolutely positioned", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const gradient = container.querySelector("div > div > div:first-child")
    expect(gradient).toHaveClass("absolute", "inset-0")
  })

  it("gradient has opacity class", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const gradient = container.querySelector("div > div > div:first-child")
    expect(gradient).toHaveClass("opacity-70")
  })

  it("children wrapper has relative positioning", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const childrenWrapper = container.querySelector("div > div > div:last-child")
    expect(childrenWrapper).toHaveClass("relative")
  })

  it("children are rendered in relative wrapper", () => {
    const { container } = render(
      <FeaturedCard>
        <div data-testid="child-content">Content</div>
      </FeaturedCard>,
    )
    const childWrapper = container.querySelector("div > div:last-child")
    expect(childWrapper).toBeInTheDocument()
    expect(childWrapper?.textContent).toContain("Content")
  })

  it("handles complex JSX children", () => {
    const { container } = render(
      <FeaturedCard>
        <h1>Title</h1>
        <p>Description</p>
        <button>Action</button>
      </FeaturedCard>,
    )
    expect(container.textContent).toContain("Title")
    expect(container.textContent).toContain("Description")
    expect(container.textContent).toContain("Action")
  })

  it("renders text children directly", () => {
    const { container } = render(
      <FeaturedCard>Plain text content</FeaturedCard>,
    )
    expect(container.textContent).toContain("Plain text content")
  })

  it("card is container for overflow-hidden", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div.relative")
    expect(card).toHaveClass("overflow-hidden")
  })

  it("default tone is applied when not specified", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("border-accent-amber")
  })

  it("tone prop overrides default", () => {
    const { container } = render(
      <FeaturedCard tone="blue">
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).not.toHaveClass("border-accent-amber")
    expect(card).toHaveClass("border-accent-blue")
  })

  it("renders with all tone options", () => {
    const tones: Array<"amber" | "blue" | "green" | "rose"> = [
      "amber",
      "blue",
      "green",
      "rose",
    ]
    tones.forEach((tone) => {
      const { container } = render(
        <FeaturedCard tone={tone}>
          <div>Content</div>
        </FeaturedCard>,
      )
      const card = container.querySelector("div")
      expect(card).toHaveClass(`border-accent-${tone}`)
    })
  })

  it("padding is applied correctly", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("p-6")
  })

  it("border radius is applied correctly", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("rounded-[18px]")
  })

  it("shadow classes are applied", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("shadow-xs")
  })

  it("transition is applied to card", () => {
    const { container } = render(
      <FeaturedCard>
        <div>Content</div>
      </FeaturedCard>,
    )
    const card = container.querySelector("div")
    expect(card).toHaveClass("transition-shadow")
  })
})
