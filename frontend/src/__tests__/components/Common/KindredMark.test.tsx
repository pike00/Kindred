import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import React from "react"
import { KindredMark } from "@/components/Common/KindredMark"

describe("KindredMark", () => {
  it("renders a span element", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toBeInTheDocument()
  })

  it("has img role", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toHaveAttribute("role", "img")
  })

  it("has aria-label attribute", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toHaveAttribute("aria-label", "Kindred")
  })

  it("applies base styling classes", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toHaveClass("inline-block", "h-full", "w-auto", "aspect-square")
  })

  it("applies custom className", () => {
    const { container } = render(<KindredMark className="custom-class" />)
    const span = container.querySelector("span")
    expect(span).toHaveClass("custom-class")
  })

  it("merges custom className with base classes", () => {
    const { container } = render(<KindredMark className="text-primary" />)
    const span = container.querySelector("span")
    expect(span).toHaveClass("text-primary", "inline-block", "aspect-square")
  })

  it("sets WebkitMaskImage style property", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.WebkitMaskImage).toBe("url(/assets/icons/kindred-mark.svg)")
  })

  it("sets maskImage style property", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.maskImage).toBe("url(/assets/icons/kindred-mark.svg)")
  })

  it("sets WebkitMaskRepeat style property", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.WebkitMaskRepeat).toBe("no-repeat")
  })

  it("sets maskRepeat style property", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.maskRepeat).toBe("no-repeat")
  })

  it("sets WebkitMaskPosition style property", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.WebkitMaskPosition).toBe("center")
  })

  it("sets maskPosition style property", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.maskPosition).toBe("center")
  })

  it("sets WebkitMaskSize style property", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.WebkitMaskSize).toBe("contain")
  })

  it("sets maskSize style property", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.maskSize).toBe("contain")
  })

  it("sets backgroundColor using currentColor", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.backgroundColor).toBe("currentcolor")
  })

  it("accepts and applies custom HTML attributes", () => {
    const { container } = render(
      <KindredMark data-testid="kindred-icon" title="Kindred Logo" />
    )
    const span = container.querySelector("span")
    expect(span).toHaveAttribute("data-testid", "kindred-icon")
    expect(span).toHaveAttribute("title", "Kindred Logo")
  })

  it("renders without any props", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toBeInTheDocument()
  })

  it("accepts multiple custom classes", () => {
    const { container } = render(
      <KindredMark className="text-white text-2xl opacity-80" />
    )
    const span = container.querySelector("span")
    expect(span).toHaveClass("text-white", "text-2xl", "opacity-80")
  })

  it("preserves mask image URL exactly", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.maskImage).toBe("url(/assets/icons/kindred-mark.svg)")
  })

  it("mask is centered with contain sizing", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.maskPosition).toBe("center")
    expect(span.style.maskSize).toBe("contain")
  })

  it("does not repeat mask", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.maskRepeat).toBe("no-repeat")
    expect(span.style.WebkitMaskRepeat).toBe("no-repeat")
  })

  it("color is inherited from currentColor", () => {
    const { container } = render(
      <KindredMark className="text-blue-500" />
    )
    const span = container.querySelector("span") as HTMLSpanElement
    expect(span.style.backgroundColor).toBe("currentcolor")
  })

  it("supports aria-hidden when passed", () => {
    const { container } = render(<KindredMark aria-hidden="true" />)
    const span = container.querySelector("span")
    expect(span).toHaveAttribute("aria-hidden", "true")
  })

  it("h-full stretches to full height of parent", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toHaveClass("h-full")
  })

  it("w-auto allows width to adapt", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toHaveClass("w-auto")
  })

  it("aspect-square maintains square proportions", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toHaveClass("aspect-square")
  })

  it("inline-block allows width/height styling", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span")
    expect(span).toHaveClass("inline-block")
  })

  it("can be used within other elements", () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <KindredMark className="size-6" />
        <span>Kindred</span>
      </div>
    )
    const mark = container.querySelector("span[role='img']")
    expect(mark).toBeInTheDocument()
    expect(container.textContent).toContain("Kindred")
  })

  it("respects className prop along with HTML attributes", () => {
    const { container } = render(
      <KindredMark className="text-lg" data-id="mark" />
    )
    const span = container.querySelector("span")
    expect(span).toHaveClass("text-lg")
    expect(span).toHaveAttribute("data-id", "mark")
  })

  it("all mask properties are set consistently", () => {
    const { container } = render(<KindredMark />)
    const span = container.querySelector("span") as HTMLSpanElement

    // Webkit versions
    expect(span.style.WebkitMaskImage).toBe("url(/assets/icons/kindred-mark.svg)")
    expect(span.style.WebkitMaskRepeat).toBe("no-repeat")
    expect(span.style.WebkitMaskPosition).toBe("center")
    expect(span.style.WebkitMaskSize).toBe("contain")

    // Standard versions
    expect(span.style.maskImage).toBe("url(/assets/icons/kindred-mark.svg)")
    expect(span.style.maskRepeat).toBe("no-repeat")
    expect(span.style.maskPosition).toBe("center")
    expect(span.style.maskSize).toBe("contain")
  })
})
