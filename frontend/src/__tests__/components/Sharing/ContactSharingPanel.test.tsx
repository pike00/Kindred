import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ContactSharingPanel } from "@/components/Sharing/ContactSharingPanel"
import { renderWithProviders } from "@/test/helpers"

const {
  mockListContactShares,
  mockCreateContactShare,
  mockDeleteContactShare,
  mockShowSuccessToast,
  mockShowErrorToast,
} = vi.hoisted(() => ({
  mockListContactShares: vi.fn(),
  mockCreateContactShare: vi.fn(),
  mockDeleteContactShare: vi.fn(),
  mockShowSuccessToast: vi.fn(),
  mockShowErrorToast: vi.fn(),
}))

vi.mock("@/client", () => ({
  ContactSharesService: {
    listContactShares: mockListContactShares,
    createContactShare: mockCreateContactShare,
    deleteContactShare: mockDeleteContactShare,
  },
}))

vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react")

  return {
    Dialog: ({ children, open }: any) =>
      React.createElement("div", null, open ? children : null),
    DialogContent: ({ children }: any) =>
      React.createElement("div", { role: "dialog" }, children),
    DialogHeader: ({ children }: any) => React.createElement("div", null, children),
    DialogTitle: ({ children }: any) => React.createElement("h2", null, children),
    DialogDescription: ({ children }: any) =>
      React.createElement("p", null, children),
    DialogFooter: ({ children }: any) => React.createElement("div", null, children),
  }
})

describe("ContactSharingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("renders the empty state when there are no active grants", async () => {
    mockListContactShares.mockResolvedValue({ data: [], count: 0 })

    renderWithProviders(<ContactSharingPanel />)

    await waitFor(() => {
      expect(
        screen.getByText(/No broad contact shares yet/),
      ).toBeInTheDocument()
    })
  })

  it("renders an existing shared grantee row", async () => {
    mockListContactShares.mockResolvedValue({
      data: [
        {
          grantee_id: "user-2",
          grantee_email: "bob@example.com",
          created_at: "2026-07-01T00:00:00Z",
        },
      ],
      count: 1,
    })

    renderWithProviders(<ContactSharingPanel />)

    await waitFor(() => {
      expect(screen.getByText("bob@example.com")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Revoke access" }),
      ).toBeInTheDocument()
    })
  })

  it("submits a valid email and invalidates the contact-share query", async () => {
    mockListContactShares
      .mockResolvedValueOnce({ data: [], count: 0 })
      .mockResolvedValueOnce({
        data: [
          {
            grantee_id: "user-3",
            grantee_email: "friend@example.com",
            created_at: "2026-08-01T00:00:00Z",
          },
        ],
        count: 1,
      })
    mockCreateContactShare.mockResolvedValue({
      grantee_id: "user-3",
      grantee_email: "friend@example.com",
      created_at: "2026-08-01T00:00:00Z",
    })

    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(<ContactSharingPanel />)
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await user.click(
      await screen.findByRole("button", { name: "Share all contacts" }),
    )

    const dialog = screen.getByRole("dialog")

    await user.type(
      within(dialog).getByPlaceholderText("person@example.com"),
      "friend@example.com",
    )
    await user.click(within(dialog).getByRole("checkbox"))
    await user.click(
      within(dialog).getByRole("button", { name: /^Share all contacts$/ }),
    )

    await waitFor(() => {
      expect(mockCreateContactShare).toHaveBeenCalledWith({
        requestBody: { grantee_email: "friend@example.com" },
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["contact-shares"],
      })
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        "Shared all contacts with friend@example.com",
      )
    })
  })

  it("shows the full scope warning in the share dialog", async () => {
    mockListContactShares.mockResolvedValue({ data: [], count: 0 })

    const user = userEvent.setup()
    renderWithProviders(<ContactSharingPanel />)

    await user.click(
      await screen.findByRole("button", { name: "Share all contacts" }),
    )

    expect(
      within(screen.getByRole("dialog")).getByText("Sharing scope"),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole("dialog")).getByText(
        /I understand this grants read and write access/,
      ),
    ).toBeInTheDocument()
  })

  it("requires revoke confirmation before deleting a grant", async () => {
    mockListContactShares.mockResolvedValue({
      data: [
        {
          grantee_id: "user-9",
          grantee_email: "remove-me@example.com",
          created_at: "2026-06-15T00:00:00Z",
        },
      ],
      count: 1,
    })
    mockDeleteContactShare.mockResolvedValue({ message: "Share removed" })

    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(<ContactSharingPanel />)
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(true)

    await user.click(
      await screen.findByRole("button", { name: "Revoke access" }),
    )

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        "Revoke all-contact sharing for remove-me@example.com? They will lose access immediately.",
      )
      expect(mockDeleteContactShare).toHaveBeenCalledWith({
        granteeId: "user-9",
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["contact-shares"],
      })
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        "Removed access for remove-me@example.com",
      )
    })
  })
})
