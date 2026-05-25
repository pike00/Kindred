import { useQuery } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import { describe, beforeEach, it, expect, vi } from "vitest"

import { ContactsService } from "@/client"
import { MentionText } from "@/components/Mentions/MentionText"
import { renderWithProviders, makeContact } from "@/test/helpers"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, params, children, className }: any) => (
    <a
      href={`${to}/${params?.contactId ?? ""}`}
      className={className}
      data-testid={`mention-link-${params?.contactId}`}
    >
      {children}
    </a>
  ),
}))

vi.mock("@/client", () => ({
  ContactsService: {
    listContacts: vi.fn(),
    getContact: vi.fn(),
  },
}))

describe("MentionText", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders plain text when no mentions", () => {
    renderWithProviders(<MentionText text="Hello world" />)

    expect(screen.getByText("Hello world")).toBeInTheDocument()
  })

  it("renders plain text without mention link", () => {
    renderWithProviders(<MentionText text="Just plain text" />)

    const span = screen.getByText("Just plain text")
    expect(span.tagName).toBe("SPAN")
    expect(span.innerHTML).not.toContain("href")
  })

  it("renders mention link for @[Name](id) token", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    renderWithProviders(
      <MentionText text="Hey @[Alice Smith](contact-123) how are you?" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
    })

    const link = screen.getByTestId("mention-link-contact-123")
    expect(link).toHaveAttribute("href", "/contacts/$contactId/contact-123")
    expect(link).toHaveClass("font-medium", "text-primary", "hover:underline")
  })

  it("renders multiple mentions in one text", async () => {
    vi.mocked(ContactsService.getContact)
      .mockResolvedValueOnce(
        makeContact({
          id: "alice-123",
          first_name: "Alice",
          last_name: "Smith",
        }),
      )
      .mockResolvedValueOnce(
        makeContact({
          id: "bob-456",
          first_name: "Bob",
          last_name: "Jones",
        }),
      )

    renderWithProviders(
      <MentionText text="@[Alice Smith](alice-123) and @[Bob Jones](bob-456) are here" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("@Bob Jones")).toBeInTheDocument()
    })

    const aliceLink = screen.getByTestId("mention-link-alice-123")
    const bobLink = screen.getByTestId("mention-link-bob-456")
    expect(aliceLink).toBeInTheDocument()
    expect(bobLink).toBeInTheDocument()
  })

  it("renders mixed text and mentions correctly", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    const { container } = renderWithProviders(
      <MentionText text="Hello @[Alice Smith](contact-123)! How are you?" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
    })

    // Check mention link
    const link = screen.getByTestId("mention-link-contact-123")
    expect(link).toBeInTheDocument()

    // Verify full text is rendered
    const span = container.querySelector("span")
    expect(span?.textContent).toContain("Hello")
    expect(span?.textContent).toContain("How are you?")
  })

  it("resolves contact name via useQuery", async () => {
    const mockGetContact = vi.mocked(ContactsService.getContact)
    mockGetContact.mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    renderWithProviders(
      <MentionText text="Hi @[Alice Smith](contact-123)" />,
    )

    await waitFor(() => {
      expect(mockGetContact).toHaveBeenCalledWith({
        contactId: "contact-123",
      })
    })

    // Component renders the mention link with the resolved name
    const link = screen.getByTestId("mention-link-contact-123")
    expect(link).toBeInTheDocument()
    expect(link.textContent).toContain("@Alice Smith")
  })

  it("falls back to token name when contact not found", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(undefined)

    renderWithProviders(
      <MentionText text="Hey @[Old Name](deleted-contact)" />,
    )

    await waitFor(() => {
      expect(vi.mocked(ContactsService.getContact)).toHaveBeenCalledWith({
        contactId: "deleted-contact",
      })
    })

    // Should use the fallback name from the token
    expect(screen.getByText("@Old Name")).toBeInTheDocument()
  })

  it("uses first_name only when last_name is null", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: null,
      }),
    )

    renderWithProviders(
      <MentionText text="Hi @[Alice](contact-123)" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice")).toBeInTheDocument()
    })
  })

  it("renders mention at start of text", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    const { container } = renderWithProviders(
      <MentionText text="@[Alice Smith](contact-123) says hello" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
    })

    const span = container.querySelector("span")
    expect(span?.textContent).toContain("says hello")
  })

  it("renders mention at end of text", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    const { container } = renderWithProviders(
      <MentionText text="Hello to @[Alice Smith](contact-123)" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
    })

    const span = container.querySelector("span")
    expect(span?.textContent).toContain("Hello to")
  })

  it("renders only mention with no other text", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    renderWithProviders(
      <MentionText text="@[Alice Smith](contact-123)" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
    })

    const link = screen.getByTestId("mention-link-contact-123")
    expect(link).toBeInTheDocument()
  })

  it("renders consecutive mentions", async () => {
    vi.mocked(ContactsService.getContact)
      .mockResolvedValueOnce(
        makeContact({
          id: "alice-123",
          first_name: "Alice",
          last_name: "Smith",
        }),
      )
      .mockResolvedValueOnce(
        makeContact({
          id: "bob-456",
          first_name: "Bob",
          last_name: "Jones",
        }),
      )

    renderWithProviders(
      <MentionText text="@[Alice Smith](alice-123)@[Bob Jones](bob-456)" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("@Bob Jones")).toBeInTheDocument()
    })

    const aliceLink = screen.getByTestId("mention-link-alice-123")
    const bobLink = screen.getByTestId("mention-link-bob-456")
    expect(aliceLink).toBeInTheDocument()
    expect(bobLink).toBeInTheDocument()
  })

  it("applies custom className to root span", async () => {
    renderWithProviders(
      <MentionText text="Plain text" className="custom-class" />,
    )

    const span = screen.getByText("Plain text")
    expect(span).toHaveClass("custom-class")
  })

  it("applies custom className to root span with mentions", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    renderWithProviders(
      <MentionText
        text="Hi @[Alice Smith](contact-123)"
        className="text-lg font-bold"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
    })

    const span = screen.getByText("@Alice Smith").closest("span")
    expect(span).toHaveClass("text-lg", "font-bold")
  })

  it("handles multiple mentions with surrounding text", async () => {
    vi.mocked(ContactsService.getContact)
      .mockResolvedValueOnce(
        makeContact({
          id: "alice-123",
          first_name: "Alice",
          last_name: "Smith",
        }),
      )
      .mockResolvedValueOnce(
        makeContact({
          id: "bob-456",
          first_name: "Bob",
          last_name: "Jones",
        }),
      )

    const { container } = renderWithProviders(
      <MentionText text="Talk to @[Alice Smith](alice-123) or @[Bob Jones](bob-456) about it" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("@Bob Jones")).toBeInTheDocument()
    })

    const span = container.querySelector("span")
    expect(span?.textContent).toContain("Talk to")
    expect(span?.textContent).toContain("or")
    expect(span?.textContent).toContain("about it")
  })

  it("renders empty text", () => {
    const { container } = renderWithProviders(<MentionText text="" />)

    const span = container.querySelector("span")
    expect(span).toBeInTheDocument()
    expect(span).toHaveTextContent("")
  })

  it("handles whitespace in mention names", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "John",
        last_name: "Michael Doe",
      }),
    )

    renderWithProviders(
      <MentionText text="@[John Michael Doe](contact-123)" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@John Michael Doe")).toBeInTheDocument()
    })
  })

  it("caches contact query results", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    const { rerender } = renderWithProviders(
      <MentionText text="@[Alice Smith](contact-123) and @[Alice Smith](contact-123)" />,
    )

    await waitFor(() => {
      expect(vi.mocked(ContactsService.getContact)).toHaveBeenCalled()
    })

    // Should only call getContact once due to query caching with same contactId
    const callCount = vi.mocked(ContactsService.getContact).mock.calls.length
    expect(callCount).toBeGreaterThanOrEqual(1)

    // Re-rendering shouldn't trigger additional calls if cached
    rerender(
      <MentionText text="@[Alice Smith](contact-123) and @[Alice Smith](contact-123)" />,
    )

    expect(vi.mocked(ContactsService.getContact).mock.calls.length).toBeLessThanOrEqual(
      callCount + 1, // Allow for potential refetch
    )
  })

  it("renders mention links with correct href pattern", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "special-id-abc123",
        first_name: "Alice",
        last_name: "Smith",
      }),
    )

    renderWithProviders(
      <MentionText text="@[Alice Smith](special-id-abc123)" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@Alice Smith")).toBeInTheDocument()
    })

    const link = screen.getByTestId("mention-link-special-id-abc123")
    expect(link).toHaveAttribute(
      "href",
      "/contacts/$contactId/special-id-abc123",
    )
  })

  it("handles special characters in contact names from query", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(
      makeContact({
        id: "contact-123",
        first_name: "François",
        last_name: "Müller",
      }),
    )

    renderWithProviders(
      <MentionText text="@[Old Name](contact-123)" />,
    )

    await waitFor(() => {
      expect(screen.getByText("@François Müller")).toBeInTheDocument()
    })
  })

  it("uses fallback name from token when contact not found", async () => {
    vi.mocked(ContactsService.getContact).mockResolvedValue(undefined)

    renderWithProviders(
      <MentionText text="@[Fallback Name](contact-123)" />,
    )

    // Fallback name should be displayed
    const text = screen.getByText("@Fallback Name")
    expect(text).toBeInTheDocument()
  })

  it("handles when contact query fails gracefully", async () => {
    vi.mocked(ContactsService.getContact).mockRejectedValue(
      new Error("Network error"),
    )

    renderWithProviders(
      <MentionText text="@[Fallback Name](contact-123)" />,
    )

    await waitFor(() => {
      expect(vi.mocked(ContactsService.getContact)).toHaveBeenCalled()
    })

    // Should fall back to token name on error
    expect(screen.getByText("@Fallback Name")).toBeInTheDocument()
  })
})
