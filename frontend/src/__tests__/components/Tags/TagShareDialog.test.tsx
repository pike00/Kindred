import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TagShareDialog } from "@/components/Tags/TagShareDialog"
import { makeTag, renderWithProviders } from "@/test/helpers"

const {
  mockPreviewTagShare,
  mockCreateTagShare,
  mockShowSuccessToast,
  mockShowErrorToast,
} = vi.hoisted(() => ({
  mockPreviewTagShare: vi.fn(),
  mockCreateTagShare: vi.fn(),
  mockShowSuccessToast: vi.fn(),
  mockShowErrorToast: vi.fn(),
}))

vi.mock("@/client", () => ({
  TagSharesService: {
    previewTagShare: mockPreviewTagShare,
    createTagShare: mockCreateTagShare,
  },
}))

vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

describe("TagShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sends the entered email as grantee_email when the share is confirmed", async () => {
    mockPreviewTagShare.mockResolvedValue({
      contact_count: 2,
      total_related_rows: 5,
      sample_contacts: ["Ada Lovelace", "Grace Hopper"],
      entities: [],
    })
    mockCreateTagShare.mockResolvedValue({
      tag_id: "tag-123",
      grantee_id: "user-2",
      grantee_email: "person@example.com",
      created_at: "2026-08-03T00:00:00Z",
    })

    const user = userEvent.setup()
    const tag = makeTag({ id: "tag-123", name: "Friends" })

    renderWithProviders(<TagShareDialog tag={tag} />)

    await user.click(screen.getByRole("button", { name: "Share" }))
    await user.type(
      screen.getByPlaceholderText("Enter the email of the user to share with"),
      "person@example.com",
    )
    await user.click(
      screen.getByRole("button", { name: "Continue to Preview" }),
    )

    await user.click(
      screen.getByRole("button", { name: "Continue to Confirm" }),
    )
    await user.click(screen.getByLabelText(/I understand/i))
    await user.click(screen.getByRole("button", { name: "Confirm Share" }))

    await waitFor(() => {
      expect(mockCreateTagShare).toHaveBeenCalledWith({
        requestBody: {
          tag_id: "tag-123",
          grantee_email: "person@example.com",
        },
      })
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        'Tag "Friends" shared successfully',
      )
    })
  })

  it("loads the preview before any grant is created", async () => {
    mockPreviewTagShare.mockResolvedValue({
      contact_count: 1,
      total_related_rows: 3,
      sample_contacts: ["Ada Lovelace"],
      entities: [],
    })

    const user = userEvent.setup()
    const tag = makeTag({ id: "tag-456", name: "Work" })

    renderWithProviders(<TagShareDialog tag={tag} />)

    await user.click(screen.getByRole("button", { name: "Share" }))
    await user.type(
      screen.getByPlaceholderText("Enter the email of the user to share with"),
      "person@example.com",
    )
    await user.click(
      screen.getByRole("button", { name: "Continue to Preview" }),
    )

    await waitFor(() => {
      expect(mockPreviewTagShare).toHaveBeenCalledWith({ tagId: "tag-456" })
      expect(mockCreateTagShare).not.toHaveBeenCalled()
    })

    await user.click(
      screen.getByRole("button", { name: "Continue to Confirm" }),
    )

    expect(
      within(screen.getByRole("dialog")).getByText(
        /I understand I am sharing 1 contacts and 3 related rows/,
      ),
    ).toBeInTheDocument()
    expect(mockCreateTagShare).not.toHaveBeenCalled()
  })
})
