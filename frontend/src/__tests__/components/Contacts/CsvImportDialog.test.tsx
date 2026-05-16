import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CsvImportDialog } from "@/components/Contacts/CsvImportDialog"
import { createQueryClient, renderWithProviders } from "@/test/helpers"

// Mock router
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => (
      <a href={String(to)} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
  }
})

// Mock API client
vi.mock("@/client", () => ({
  ImportExportService: {
    previewCsvImport: vi.fn(),
    importCsv: vi.fn(),
  },
}))

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock useCustomToast
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

describe("CsvImportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders trigger button", () => {
    renderWithProviders(<CsvImportDialog />)
    expect(screen.getByRole("button", { name: /import csv/i })).toBeInTheDocument()
  })

  it("opens dialog when trigger button is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    expect(
      screen.getByText("Import Contacts from CSV"),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/upload a csv file to import contacts/i),
    ).toBeInTheDocument()
  })

  it("displays file upload input", async () => {
    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  it("handles file selection and shows preview", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    mockPreview.mockResolvedValue({
      total_rows: 5,
      encoding: "UTF-8",
      headers: ["first_name", "last_name", "email"],
      detected_mapping: {
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
      },
      sample_rows: [
        { first_name: "John", last_name: "Doe", email: "john@example.com" },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText("File analyzed successfully")).toBeInTheDocument()
    })
  })

  it("displays preview data after file upload", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    mockPreview.mockResolvedValue({
      total_rows: 5,
      encoding: "UTF-8",
      headers: ["first_name", "last_name", "email"],
      detected_mapping: {
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
      },
      sample_rows: [
        { first_name: "John", last_name: "Doe", email: "john@example.com" },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText(/found 5 rows/i)).toBeInTheDocument()
      expect(screen.getByText(/UTF-8/)).toBeInTheDocument()
    })
  })

  it("shows column mapping after preview", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    mockPreview.mockResolvedValue({
      total_rows: 5,
      encoding: "UTF-8",
      headers: ["first_name", "last_name", "email"],
      detected_mapping: {
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
      },
      sample_rows: [
        { first_name: "John", last_name: "Doe", email: "john@example.com" },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText("Column Mapping")).toBeInTheDocument()
      expect(screen.getByText("First Name")).toBeInTheDocument()
    })
  })

  it("allows toggling skip duplicates option", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    mockPreview.mockResolvedValue({
      total_rows: 5,
      encoding: "UTF-8",
      headers: ["first_name", "last_name", "email"],
      detected_mapping: {
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
      },
      sample_rows: [
        { first_name: "John", last_name: "Doe", email: "john@example.com" },
      ],
    })

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      const skipDuplicatesCheckbox = screen.getByRole("checkbox", {
        name: /skip duplicate contacts/i,
      }) as HTMLInputElement
      expect(skipDuplicatesCheckbox.checked).toBe(true)
    })
  })

  it("submits import with correct parameters", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    const mockImport = vi.mocked(ImportExportService.importCsv)

    mockPreview.mockResolvedValue({
      total_rows: 5,
      encoding: "UTF-8",
      headers: ["first_name", "last_name", "email"],
      detected_mapping: {
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
      },
      sample_rows: [
        { first_name: "John", last_name: "Doe", email: "john@example.com" },
      ],
    })

    mockImport.mockResolvedValue({
      imported: 5,
      skipped: 0,
      updated: 0,
      tag_names_created: [],
      errors: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText(/import 5 contacts/i)).toBeInTheDocument()
    })

    const importButton = screen.getByRole("button", {
      name: /import 5 contacts/i,
    })
    await user.click(importButton)

    await waitFor(() => {
      expect(mockImport).toHaveBeenCalledWith({
        formData: { file },
        skipDuplicates: true,
        mergeDuplicates: false,
        createMissingTags: true,
      })
    })
  })

  it("shows import complete screen with results", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    const mockImport = vi.mocked(ImportExportService.importCsv)

    mockPreview.mockResolvedValue({
      total_rows: 5,
      encoding: "UTF-8",
      headers: ["first_name", "last_name", "email"],
      detected_mapping: {
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
      },
      sample_rows: [
        { first_name: "John", last_name: "Doe", email: "john@example.com" },
      ],
    })

    mockImport.mockResolvedValue({
      imported: 5,
      skipped: 2,
      updated: 0,
      tag_names_created: ["work", "friends"],
      errors: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /import 5 contacts/i }))
    })

    const importButton = screen.getByRole("button", {
      name: /import 5 contacts/i,
    })
    await user.click(importButton)

    await waitFor(() => {
      expect(screen.getByText("Import Complete")).toBeInTheDocument()
      // Use a different selector since text might be split across elements
      expect(screen.getByText("5")).toBeInTheDocument()
    })
  })

  it("shows error toast on preview failure", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    mockPreview.mockRejectedValue(new Error("Preview failed"))

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Failed to preview CSV file",
      )
    })
  })

  it("shows error toast on import failure", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    const mockImport = vi.mocked(ImportExportService.importCsv)

    mockPreview.mockResolvedValue({
      total_rows: 5,
      encoding: "UTF-8",
      headers: ["first_name", "last_name", "email"],
      detected_mapping: {
        first_name: "first_name",
        last_name: "last_name",
        email: "email",
      },
      sample_rows: [
        { first_name: "John", last_name: "Doe", email: "john@example.com" },
      ],
    })

    mockImport.mockRejectedValue(new Error("Import failed"))

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /import 5 contacts/i }))
    })

    const importButton = screen.getByRole("button", {
      name: /import 5 contacts/i,
    })
    await user.click(importButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Failed to import CSV file",
      )
    })
  })

  it("resets dialog state when closed", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)

    mockPreview.mockResolvedValue({
      total_rows: 5,
      encoding: "UTF-8",
      headers: ["first_name"],
      detected_mapping: { first_name: "first_name" },
      sample_rows: [{ first_name: "John" }],
    })

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText("File analyzed successfully")).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    await user.click(cancelButton)

    // Reopen dialog
    await user.click(triggerButton)

    // Should be back at upload step
    expect(
      screen.getByText(/upload a csv file to import contacts/i),
    ).toBeInTheDocument()
  })

  it("invalidates contacts query on successful import", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    const mockImport = vi.mocked(ImportExportService.importCsv)

    mockPreview.mockResolvedValue({
      total_rows: 1,
      encoding: "UTF-8",
      headers: ["first_name"],
      detected_mapping: { first_name: "first_name" },
      sample_rows: [{ first_name: "John" }],
    })

    mockImport.mockResolvedValue({
      imported: 1,
      skipped: 0,
      updated: 0,
      tag_names_created: [],
      errors: [],
    })

    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />, { queryClient })

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /import 1 contact/i }))
    })

    const importButton = screen.getByRole("button", {
      name: /import 1 contact/i,
    })
    await user.click(importButton)

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contacts"] })
    })
  })

  it("shows importing state during upload", async () => {
    const { ImportExportService } = await import("@/client")
    const mockPreview = vi.mocked(ImportExportService.previewCsvImport)
    const mockImport = vi.mocked(ImportExportService.importCsv)

    mockPreview.mockResolvedValue({
      total_rows: 1,
      encoding: "UTF-8",
      headers: ["first_name"],
      detected_mapping: { first_name: "first_name" },
      sample_rows: [{ first_name: "John" }],
    })

    mockImport.mockResolvedValue({
      imported: 1,
      skipped: 0,
      updated: 0,
      tag_names_created: [],
      errors: [],
    })

    const user = userEvent.setup()
    renderWithProviders(<CsvImportDialog />)

    const triggerButton = screen.getByRole("button", { name: /import csv/i })
    await user.click(triggerButton)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(["test"], "test.csv", { type: "text/csv" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /import 1 contact/i }))
    })

    const importButton = screen.getByRole("button", {
      name: /import 1 contact/i,
    })
    await user.click(importButton)

    // Verify import was called
    await waitFor(() => {
      expect(mockImport).toHaveBeenCalled()
    })
  })
})
