import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/helpers"
import ImportExport from "@/components/UserSettings/ImportExport"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/client", () => ({
  ImportExportService: {
    importVcard: vi.fn(),
  },
  OpenAPI: {
    BASE: "http://localhost",
    TOKEN: "test-token",
  },
}))

describe("ImportExport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders import section heading", () => {
    renderWithProviders(<ImportExport />)

    expect(screen.getByText("Import contacts")).toBeInTheDocument()
  })

  it("renders export section heading", () => {
    renderWithProviders(<ImportExport />)

    expect(screen.getByText("Export contacts")).toBeInTheDocument()
  })

  it("renders file input with correct accept types", () => {
    const { container } = renderWithProviders(<ImportExport />)

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

    expect(fileInput).toBeInTheDocument()
    expect(fileInput.accept).toContain(".vcf")
  })

  it("renders import button initially disabled", () => {
    renderWithProviders(<ImportExport />)

    const importButton = screen.getByRole("button", { name: "Import" })
    expect(importButton).toBeDisabled()
  })

  it("enables import button when file is selected", async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<ImportExport />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(["contact data"], "contacts.vcf", { type: "text/vcard" })
    await user.upload(input, file)

    const importButton = screen.getByRole("button", { name: "Import" })

    await waitFor(() => {
      expect(importButton).not.toBeDisabled()
    })
  })

  it("displays selected filename and size", async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<ImportExport />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(["contact data"], "contacts.vcf", { type: "text/vcard" })
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/contacts\.vcf/)).toBeInTheDocument()
    })
  })

  it("displays 'No file selected' initially", () => {
    renderWithProviders(<ImportExport />)

    expect(screen.getByText("No file selected")).toBeInTheDocument()
  })

  it("calls importVcard when import button is clicked", async () => {
    const { ImportExportService } = await import("@/client")
    const mockImportVcard = vi.mocked(ImportExportService.importVcard)
    mockImportVcard.mockResolvedValueOnce({ imported: 3, errors: [] })

    const user = userEvent.setup()
    const { container } = renderWithProviders(<ImportExport />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(["contact data"], "contacts.vcf", { type: "text/vcard" })
    await user.upload(input, file)

    const importButton = screen.getByRole("button", { name: "Import" })

    await waitFor(() => {
      expect(importButton).not.toBeDisabled()
    })

    await user.click(importButton)

    await waitFor(() => {
      expect(mockImportVcard).toHaveBeenCalled()
    })
  })

  it("shows success toast after import", async () => {
    const { ImportExportService } = await import("@/client")
    vi.mocked(ImportExportService.importVcard).mockResolvedValueOnce({
      imported: 3,
      errors: [],
    })

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    const user = userEvent.setup()
    const { container } = renderWithProviders(<ImportExport />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(["contact data"], "contacts.vcf", { type: "text/vcard" })
    await user.upload(input, file)

    const importButton = screen.getByRole("button", { name: "Import" })
    await user.click(importButton)

    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalledWith("Success!", {
        description: "Imported 3 contact(s)",
      })
    })
  })

  it("displays import result summary", async () => {
    const { ImportExportService } = await import("@/client")
    vi.mocked(ImportExportService.importVcard).mockResolvedValueOnce({
      imported: 3,
      errors: [],
    })

    const user = userEvent.setup()
    const { container } = renderWithProviders(<ImportExport />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(["contact data"], "contacts.vcf", { type: "text/vcard" })
    await user.upload(input, file)

    const importButton = screen.getByRole("button", { name: "Import" })
    await user.click(importButton)

    await waitFor(
      () => {
        expect(screen.getByText(/Imported 3 contacts/)).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it("displays import errors when present", async () => {
    const { ImportExportService } = await import("@/client")
    vi.mocked(ImportExportService.importVcard).mockResolvedValueOnce({
      imported: 2,
      errors: ["Invalid UID format", "Missing required field"],
    })

    const user = userEvent.setup()
    const { container } = renderWithProviders(<ImportExport />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(["contact data"], "contacts.vcf", { type: "text/vcard" })
    await user.upload(input, file)

    const importButton = screen.getByRole("button", { name: "Import" })
    await user.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/2 issues/)).toBeInTheDocument()
    })
  })

  it("clears file after successful import", async () => {
    const { ImportExportService } = await import("@/client")
    vi.mocked(ImportExportService.importVcard).mockResolvedValueOnce({
      imported: 3,
      errors: [],
    })

    const user = userEvent.setup()
    const { container } = renderWithProviders(<ImportExport />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(["contact data"], "contacts.vcf", { type: "text/vcard" })
    await user.upload(input, file)

    const importButton = screen.getByRole("button", { name: "Import" })
    await user.click(importButton)

    await waitFor(() => {
      expect(screen.getByText("No file selected")).toBeInTheDocument()
    })
  })

  it("shows error toast on import failure", async () => {
    const { ImportExportService } = await import("@/client")
    const mockError = new Error("Import failed")
    vi.mocked(ImportExportService.importVcard).mockRejectedValueOnce(mockError)

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    const user = userEvent.setup()
    const { container } = renderWithProviders(<ImportExport />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(["contact data"], "contacts.vcf", { type: "text/vcard" })
    await user.upload(input, file)

    const importButton = screen.getByRole("button", { name: "Import" })
    await user.click(importButton)

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("renders vCard export button", () => {
    renderWithProviders(<ImportExport />)

    expect(screen.getByRole("button", { name: /Download vCard/ })).toBeInTheDocument()
  })

  it("renders JSON export button", () => {
    renderWithProviders(<ImportExport />)

    expect(screen.getByRole("button", { name: /Download JSON/ })).toBeInTheDocument()
  })

  it("triggers download when vCard export is clicked", async () => {
    const user = userEvent.setup()

    const mockBlob = new Blob(["vcard data"], { type: "text/vcard" })
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValueOnce(mockBlob),
    })

    renderWithProviders(<ImportExport />)

    const vcardButton = screen.getByRole("button", { name: /Download vCard/ })
    await user.click(vcardButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/import-export/export/vcard"),
        expect.any(Object)
      )
    })
  })

  it("triggers download when JSON export is clicked", async () => {
    const user = userEvent.setup()

    const mockBlob = new Blob(["json data"], { type: "application/json" })
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValueOnce(mockBlob),
    })

    renderWithProviders(<ImportExport />)

    const jsonButton = screen.getByRole("button", { name: /Download JSON/ })
    await user.click(jsonButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/import-export/export/json"),
        expect.any(Object)
      )
    })
  })

  it("shows success toast for vCard export", async () => {
    const user = userEvent.setup()

    const mockBlob = new Blob(["vcard data"], { type: "text/vcard" })
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValueOnce(mockBlob),
    })

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    renderWithProviders(<ImportExport />)

    const vcardButton = screen.getByRole("button", { name: /Download vCard/ })
    await user.click(vcardButton)

    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalledWith("Success!", {
        description: "vCard export downloaded",
      })
    })
  })

  it("shows success toast for JSON export", async () => {
    const user = userEvent.setup()

    const mockBlob = new Blob(["json data"], { type: "application/json" })
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValueOnce(mockBlob),
    })

    const { toast } = await import("sonner")
    const mockSuccessToast = vi.mocked(toast.success)

    renderWithProviders(<ImportExport />)

    const jsonButton = screen.getByRole("button", { name: /Download JSON/ })
    await user.click(jsonButton)

    await waitFor(() => {
      expect(mockSuccessToast).toHaveBeenCalledWith("Success!", {
        description: "JSON export downloaded",
      })
    })
  })

  it("shows error toast when export fails", async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValueOnce("Error"),
    })

    const { toast } = await import("sonner")
    const mockErrorToast = vi.mocked(toast.error)

    renderWithProviders(<ImportExport />)

    const vcardButton = screen.getByRole("button", { name: /Download vCard/ })
    await user.click(vcardButton)

    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalled()
    })
  })

  it("includes vCard format description text", () => {
    renderWithProviders(<ImportExport />)

    expect(
      screen.getByText(/vCard is suitable for importing into phones/, {
        exact: false,
      })
    ).toBeInTheDocument()
  })

  it("includes JSON format description text", () => {
    renderWithProviders(<ImportExport />)

    expect(
      screen.getByText(/JSON is a lossless dump/, {
        exact: false,
      })
    ).toBeInTheDocument()
  })
})
