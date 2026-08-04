import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PeopleAndPetsCard } from "@/components/Contacts/PeopleAndPetsCard"

vi.mock("@/components/Contacts/RelationshipsCard", () => ({
  RelationshipsCard: ({ embedded }: { embedded?: boolean }) => (
    <section aria-label="People" data-embedded={embedded} />
  ),
}))

vi.mock("@/components/Contacts/PetsCard", () => ({
  PetsCard: ({ embedded }: { embedded?: boolean }) => (
    <section aria-label="Pets" data-embedded={embedded} />
  ),
}))

describe("PeopleAndPetsCard", () => {
  it("groups labeled People and Pets sections in one card", () => {
    render(<PeopleAndPetsCard contactId="contact-1" contactName="Jamie" />)

    const title = screen.getByText("People & Pets")
    const card = title.closest('[data-slot="card"]')

    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).getByRole("region", { name: "People" }))
      .toHaveAttribute("data-embedded", "true")
    expect(within(card as HTMLElement).getByRole("region", { name: "Pets" }))
      .toHaveAttribute("data-embedded", "true")
  })
})
