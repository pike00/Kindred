import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddMediaRecommendation } from "@/components/MediaRecommendations/AddMediaRecommendation"
import { renderWithProviders } from "@/test/helpers"
import React from "react"

// Mock dialog to render inline (wraps Radix primitives)
vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react")
  const radixDialog = await import("@radix-ui/react-dialog")

  return {
    Dialog: ({ children, ...props }: any) =>
      React.createElement(radixDialog.Root, props, children),
    DialogTrigger: ({ children, ...props }: any) =>
      React.createElement(radixDialog.Trigger, props, children),
    DialogContent: ({ children, ...props }: any) =>
      React.createElement(
        radixDialog.Content,
        { ...props, role: "dialog" },
        children,
      ),
    DialogHeader: ({ children }: any) =>
      React.createElement("div", null, children),
    DialogTitle: ({ children }: any) =>
      React.createElement(radixDialog.Title, null, children),
    DialogDescription: ({ children }: any) =>
      React.createElement(radixDialog.Description, null, children),
    DialogFooter: ({ children }: any) =>
      React.createElement("div", null, children),
    DialogClose: ({ children, ...props }: any) =>
      React.createElement(radixDialog.Close, props, children),
  }
})

// Mock API
const mockCreateMediaRecommendation = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  MediaRecommendationsService: {
    createMediaRecommendationRoute: mockCreateMediaRecommendation,
  },
}))

// Mock custom hook
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

describe("AddMediaRecommendation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateMediaRecommendation.mockResolvedValue({
      id: "rec-1",
      contact_id: "contact-1",
      title: "Test",
      category: "movie",
    })
  })

  it("renders trigger button", () => {
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)
    expect(
      screen.getByRole("button", { name: /add recommendation/i }),
    ).toBeInTheDocument()
  })

  it("opens dialog when trigger clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    const trigger = screen.getByRole("button", { name: /add recommendation/i })
    await user.click(trigger)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Add Media Recommendation")).toBeInTheDocument()
  })

  it("shows all form fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    expect(screen.getByText("Category")).toBeInTheDocument()
    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Creator / Author / Artist")).toBeInTheDocument()
    expect(screen.getByText("Date")).toBeInTheDocument()
    expect(screen.getByText("Context / Note")).toBeInTheDocument()
  })

  it("displays all category buttons", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    expect(screen.getByRole("button", { name: "Movie" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "TV Show" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Podcast" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Musician" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Book" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument()
  })

  it("displays validation error on empty title submit", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const submitButton = screen.getByRole("button", { name: /save/i })
    await user.click(submitButton)

    // Validation should prevent API call
    await waitFor(
      () => {
        expect(mockCreateMediaRecommendation).not.toHaveBeenCalled()
      },
      { timeout: 1000 },
    )
  })

  it("allows submission with only required fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: "contact-1",
            title: "The Bear",
            category: "movie",
          }),
        }),
      )
    })
  })

  it("allows changing category to tv_show", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const tvShowButton = screen.getByRole("button", { name: "TV Show" })
    await user.click(tvShowButton)

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "Breaking Bad")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            category: "tv_show",
          }),
        }),
      )
    })
  })

  it("allows changing category to podcast", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const podcastButton = screen.getByRole("button", { name: "Podcast" })
    await user.click(podcastButton)

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "Serial")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            category: "podcast",
          }),
        }),
      )
    })
  })

  it("allows changing category to musician", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const musicianButton = screen.getByRole("button", { name: "Musician" })
    await user.click(musicianButton)

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Beatles")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            category: "musician",
          }),
        }),
      )
    })
  })

  it("allows changing category to book", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const bookButton = screen.getByRole("button", { name: "Book" })
    await user.click(bookButton)

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "1984")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            category: "book",
          }),
        }),
      )
    })
  })

  it("allows changing category to other", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const otherButton = screen.getByRole("button", { name: "Other" })
    await user.click(otherButton)

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "Video Game")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            category: "other",
          }),
        }),
      )
    })
  })

  it("allows optional creator", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const creatorInput = screen.getByPlaceholderText("e.g. Christopher Storer")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    await user.type(creatorInput, "Christopher Storer")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            creator: "Christopher Storer",
          }),
        }),
      )
    })
  })

  it("allows optional date", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const dateInputs = screen.getAllByDisplayValue("")
    const dateInput = dateInputs.find((el) => (el as HTMLInputElement).type === "date")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    if (dateInput) {
      await user.type(dateInput, "2024-12-25")
    }
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            recommended_at: "2024-12-25",
          }),
        }),
      )
    })
  })

  it("allows optional note", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const noteInput = screen.getByPlaceholderText(
      "Why was it recommended? What did they say about it?",
    )
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    await user.type(noteInput, "Amazing show about chefs")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            note: "Amazing show about chefs",
          }),
        }),
      )
    })
  })

  it("closes dialog on successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("keeps dialog open on API error", async () => {
    const user = userEvent.setup()
    mockCreateMediaRecommendation.mockRejectedValue(new Error("API Error"))

    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  it("shows loading state while submitting", async () => {
    const user = userEvent.setup()
    mockCreateMediaRecommendation.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
    )

    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it("resets form after successful submission", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    // First submission
    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear") as HTMLInputElement
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    // Reopen and verify reset
    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const newTitleInput = screen.getByPlaceholderText("e.g. The Bear") as HTMLInputElement
    expect(newTitleInput.value).toBe("")
  })

  it("default category is movie", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const movieButton = screen.getByRole("button", { name: "Movie" })
    // Movie button should have primary variant (default)
    expect(movieButton).toHaveClass("bg-primary")
  })

  it("selects correct contact ID", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-789" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.type(titleInput, "The Bear")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: "contact-789",
          }),
        }),
      )
    })
  })

  it("handles all fields together", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddMediaRecommendation contactId="contact-1" />)

    await user.click(screen.getByRole("button", { name: /add recommendation/i }))

    const tvShowButton = screen.getByRole("button", { name: "TV Show" })
    const titleInput = screen.getByPlaceholderText("e.g. The Bear")
    const creatorInput = screen.getByPlaceholderText("e.g. Christopher Storer")
    const noteInput = screen.getByPlaceholderText(
      "Why was it recommended? What did they say about it?",
    )
    const submitButton = screen.getByRole("button", { name: /save/i })

    await user.click(tvShowButton)
    await user.type(titleInput, "Breaking Bad")
    await user.type(creatorInput, "Vince Gilligan")
    await user.type(noteInput, "Best TV show ever made")
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateMediaRecommendation).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            contact_id: "contact-1",
            category: "tv_show",
            title: "Breaking Bad",
            creator: "Vince Gilligan",
            note: "Best TV show ever made",
          }),
        }),
      )
    })
  })
})
