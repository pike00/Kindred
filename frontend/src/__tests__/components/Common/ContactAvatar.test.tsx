import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ContactAvatar } from "@/components/Common/ContactAvatar"

describe("ContactAvatar", () => {
  const mockContact = {
    id: "123",
    first_name: "John",
    last_name: "Doe",
  }

  it("renders the avatar container", () => {
    const { container } = render(<ContactAvatar contact={mockContact} />)
    expect(container.querySelector("div")).toBeInTheDocument()
  })

  it("computes initials for first and last name", () => {
    render(<ContactAvatar contact={mockContact} />)
    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("computes initials for first name only", () => {
    const contact = { id: "1", first_name: "Alice" }
    render(<ContactAvatar contact={contact} />)
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("returns ? when no first name", () => {
    const contact = { id: "1", first_name: null, last_name: null }
    render(<ContactAvatar contact={contact} />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("returns ? when first_name is undefined", () => {
    const contact = { id: "1" }
    render(<ContactAvatar contact={contact} />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("trims whitespace from names before computing initials", () => {
    const contact = { id: "1", first_name: "  Bob  ", last_name: "  Smith  " }
    render(<ContactAvatar contact={contact} />)
    expect(screen.getByText("BS")).toBeInTheDocument()
  })

  it("uppercases initials", () => {
    const contact = { id: "1", first_name: "john", last_name: "doe" }
    render(<ContactAvatar contact={contact} />)
    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("applies sm size class", () => {
    const { container } = render(
      <ContactAvatar contact={mockContact} size="sm" />,
    )
    const avatar = container.querySelector("div")
    expect(avatar).toHaveClass("size-8", "text-xs")
  })

  it("applies md size class by default", () => {
    const { container } = render(<ContactAvatar contact={mockContact} />)
    const avatar = container.querySelector("div")
    expect(avatar).toHaveClass("size-10", "text-sm")
  })

  it("applies lg size class", () => {
    const { container } = render(
      <ContactAvatar contact={mockContact} size="lg" />,
    )
    const avatar = container.querySelector("div")
    expect(avatar).toHaveClass("size-14", "text-lg")
  })

  it("sets background gradient using hashed contact ID", () => {
    const { container } = render(<ContactAvatar contact={mockContact} />)
    const avatar = container.querySelector("div") as HTMLDivElement
    expect(avatar.style.backgroundImage).toContain("linear-gradient")
    expect(avatar.style.backgroundImage).toContain("--avatar-")
    expect(avatar.style.backgroundImage).toContain("-from")
    expect(avatar.style.backgroundImage).toContain("-to")
  })

  it("uses different gradient slots for different IDs", () => {
    const contact1 = { id: "aaaaa", first_name: "A", last_name: "A" }
    const contact2 = { id: "bbbbb", first_name: "B", last_name: "B" }

    const { container: container1 } = render(
      <ContactAvatar contact={contact1} />,
    )
    const { container: container2 } = render(
      <ContactAvatar contact={contact2} />,
    )

    const avatar1 = container1.querySelector("div") as HTMLDivElement
    const avatar2 = container2.querySelector("div") as HTMLDivElement

    expect(avatar1.style.backgroundImage).not.toBe(
      avatar2.style.backgroundImage,
    )
  })

  it("applies custom className", () => {
    const { container } = render(
      <ContactAvatar contact={mockContact} className="custom-class" />,
    )
    const avatar = container.querySelector("div")
    expect(avatar).toHaveClass("custom-class")
  })

  it("merges custom className with base classes", () => {
    const { container } = render(
      <ContactAvatar contact={mockContact} className="custom-class" />,
    )
    const avatar = container.querySelector("div")
    expect(avatar).toHaveClass("custom-class", "rounded-full", "font-semibold")
  })

  it("has aria-hidden attribute", () => {
    const { container } = render(<ContactAvatar contact={mockContact} />)
    const avatar = container.querySelector("div")
    expect(avatar).toHaveAttribute("aria-hidden", "true")
  })

  it("applies base styling classes", () => {
    const { container } = render(<ContactAvatar contact={mockContact} />)
    const avatar = container.querySelector("div")
    expect(avatar).toHaveClass(
      "inline-flex",
      "items-center",
      "justify-center",
      "rounded-full",
      "text-white",
      "font-semibold",
    )
  })

  it("handles empty string names", () => {
    const contact = { id: "1", first_name: "", last_name: "" }
    render(<ContactAvatar contact={contact} />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("handles whitespace-only names", () => {
    const contact = { id: "1", first_name: "   ", last_name: "   " }
    render(<ContactAvatar contact={contact} />)
    expect(screen.getByText("?")).toBeInTheDocument()
  })

  it("prioritizes first name when last name is null", () => {
    const contact = { id: "1", first_name: "Carol", last_name: null }
    render(<ContactAvatar contact={contact} />)
    expect(screen.getByText("C")).toBeInTheDocument()
  })

  it("hash function produces consistent results for same ID", () => {
    const contact = { id: "test-id", first_name: "Test", last_name: "User" }

    const { container: container1 } = render(
      <ContactAvatar contact={contact} />,
    )
    const { container: container2 } = render(
      <ContactAvatar contact={contact} />,
    )

    const avatar1 = container1.querySelector("div") as HTMLDivElement
    const avatar2 = container2.querySelector("div") as HTMLDivElement

    expect(avatar1.style.backgroundImage).toBe(avatar2.style.backgroundImage)
  })

  it("hash function produces value between 1 and 12", () => {
    // Test various IDs to ensure hash is in the correct range
    const testIds = ["a", "abc", "xyz123", "!@#$%", "verylongidstring"]

    testIds.forEach((id) => {
      const contact = { id, first_name: "T", last_name: "U" }
      const { container } = render(<ContactAvatar contact={contact} />)
      const avatar = container.querySelector("div") as HTMLDivElement
      const bgImage = avatar.style.backgroundImage

      // Extract the slot number from the background image
      const match = bgImage.match(/--avatar-(\d+)-/)
      expect(match).not.toBeNull()
      const slot = parseInt(match![1], 10)
      expect(slot).toBeGreaterThanOrEqual(1)
      expect(slot).toBeLessThanOrEqual(12)
    })
  })
})
