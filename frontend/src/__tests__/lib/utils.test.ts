import { describe, expect, it } from "vitest"
import { cn } from "../../lib/utils"

describe("cn", () => {
  it("merges simple class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1")
  })

  it("merges conditional classes", () => {
    expect(cn("px-2", true && "py-1", false && "hidden")).toBe("px-2 py-1")
  })

  it("handles tailwind class conflicts with twMerge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("handles nested arrays", () => {
    expect(cn(["px-2", "py-1"], "margin-auto")).toBe("px-2 py-1 margin-auto")
  })

  it("handles objects with conditional classes", () => {
    expect(
      cn({
        "px-2": true,
        "py-1": true,
        hidden: false,
      }),
    ).toBe("px-2 py-1")
  })

  it("handles empty inputs", () => {
    expect(cn()).toBe("")
  })

  it("handles undefined and null", () => {
    expect(cn("px-2", undefined, null, "py-1")).toBe("px-2 py-1")
  })

  it("handles complex tailwind color overrides", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500")
  })

  it("handles spacing conflicts", () => {
    expect(cn("mt-4", "mt-8")).toBe("mt-8")
  })

  it("preserves non-conflicting classes", () => {
    expect(cn("px-4 py-2", "text-lg")).toBe("px-4 py-2 text-lg")
  })

  it("handles multiple conflicting classes", () => {
    expect(cn("w-full", "w-1/2", "h-32", "h-64")).toBe("w-1/2 h-64")
  })

  it("handles mixed truthy falsy values", () => {
    expect(cn("px-2", 0 && "py-1", "" && "hidden", "margin-auto")).toBe(
      "px-2 margin-auto",
    )
  })

  it("handles complex class combinations", () => {
    const result = cn(
      "inline-flex items-center justify-center",
      "px-3 py-2",
      "text-sm font-medium",
      false && "opacity-50",
      true && "text-white",
    )
    expect(result).toContain("inline-flex")
    expect(result).toContain("items-center")
    expect(result).toContain("px-3")
    expect(result).toContain("text-white")
  })
})
