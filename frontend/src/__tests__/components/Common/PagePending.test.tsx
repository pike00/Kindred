import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import PagePending from "@/components/Common/PagePending"

describe("PagePending", () => {
  it("renders pending skeleton layout", () => {
    render(<PagePending />)
    expect(screen.getByTestId("page-pending")).toBeInTheDocument()
  })
})
