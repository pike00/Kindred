import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import type { CSVImportResponse, CSVPreviewResponse } from "@/client"
import { ImportExportService } from "@/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from "@/lib/icons"

type ImportStep = "upload" | "preview" | "importing" | "complete"

export const CsvImportDialog = () => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<ImportStep>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVPreviewResponse | null>(null)
  const [result, setResult] = useState<CSVImportResponse | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [createMissingTags, setCreateMissingTags] = useState(true)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const resetState = useCallback(() => {
    setStep("upload")
    setFile(null)
    setPreview(null)
    setResult(null)
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetState()
    }
  }

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      return ImportExportService.previewCsvImport({
        formData: { file: file as unknown as string },
      })
    },
    onSuccess: (data) => {
      setPreview(data)
      setStep("preview")
    },
    onError: () => {
      showErrorToast("Failed to preview CSV file")
    },
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected")
      setStep("importing")
      return ImportExportService.importCsv({
        formData: { file: file as unknown as string },
        skipDuplicates: skipDuplicates,
        mergeDuplicates: false,
        createMissingTags: createMissingTags,
      })
    },
    onSuccess: (data) => {
      setResult(data)
      setStep("complete")
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      if (data.imported > 0) {
        showSuccessToast(
          `Imported ${data.imported} contact${data.imported === 1 ? "" : "s"}`,
        )
      }
      if (data.skipped > 0) {
        showSuccessToast(
          `Skipped ${data.skipped} duplicate${data.skipped === 1 ? "" : "s"}`,
        )
      }
    },
    onError: () => {
      showErrorToast("Failed to import CSV file")
      setStep("preview")
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      previewMutation.mutate(selectedFile)
    }
  }

  const handleImport = () => {
    importMutation.mutate()
  }

  const getFieldLabel = (field: string | null) => {
    if (!field) return <Badge variant="outline">Skip</Badge>
    const labels: Record<string, string> = {
      first_name: "First Name",
      last_name: "Last Name",
      middle_name: "Middle Name",
      prefix: "Prefix",
      suffix: "Suffix",
      nickname: "Nickname",
      company: "Company",
      department: "Department",
      title: "Title",
      birthday: "Birthday",
      how_we_met: "How We Met",
      is_favorite: "Favorite",
      is_archived: "Archived",
      contact_frequency_days: "Contact Frequency",
      stage: "Stage",
      email: "Email",
      phone: "Phone",
      address: "Address",
      city: "City",
      region: "Region",
      postal_code: "Postal Code",
      country: "Country",
      tag_names: "Tags",
      group_names: "Groups",
      notes: "Notes",
    }
    return <Badge variant="default">{labels[field] || field}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="mr-2 size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import contacts. The system will automatically
            detect column mappings.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <Upload className="mx-auto size-12 text-muted-foreground" />
              <div>
                <label htmlFor="csv-file" className="cursor-pointer">
                  <span className="text-primary font-semibold hover:underline">
                    Click to upload
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    or drag and drop
                  </span>
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                CSV files only. UTF-8, ISO-8859-1, and Windows-1252 encodings
                supported.
              </p>
            </div>
            {previewMutation.isPending && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-6 animate-spin" />
                <span className="ml-2">Analyzing file...</span>
              </div>
            )}
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4 py-4">
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>File analyzed successfully</AlertTitle>
              <AlertDescription>
                Found {preview.total_rows} row
                {preview.total_rows === 1 ? "" : "s"} in the CSV file. Detected
                encoding: <Badge variant="outline">{preview.encoding}</Badge>
              </AlertDescription>
            </Alert>

            <div>
              <h4 className="text-sm font-semibold mb-2">Column Mapping</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(preview.detected_mapping).map(
                  ([header, field]) => (
                    <div
                      key={header}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-muted-foreground min-w-[120px] truncate">
                        {header}:
                      </span>
                      {getFieldLabel(field)}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">
                Preview (first 5 rows)
              </h4>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.headers.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.sample_rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {preview.headers.map((header) => (
                          <TableCell key={header} className="whitespace-nowrap">
                            {row[header] || ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Import Options</h4>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded"
                />
                Skip duplicate contacts (matched by email)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createMissingTags}
                  onChange={(e) => setCreateMissingTags(e.target.checked)}
                  className="rounded"
                />
                Auto-create missing tags
              </label>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="size-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Importing contacts...</p>
          </div>
        )}

        {step === "complete" && result && (
          <div className="space-y-4 py-4">
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>Import Complete</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p>
                    <strong>{result.imported}</strong> contact
                    {result.imported === 1 ? "" : "s"} imported
                  </p>
                  {result.skipped > 0 && (
                    <p>
                      <strong>{result.skipped}</strong> duplicate
                      {result.skipped === 1 ? "" : "s"} skipped
                    </p>
                  )}
                  {result.updated > 0 && (
                    <p>
                      <strong>{result.updated}</strong> contact
                      {result.updated === 1 ? "" : "s"} updated
                    </p>
                  )}
                  {result.tag_names_created &&
                    result.tag_names_created.length > 0 && (
                      <p>
                        <strong>{result.tag_names_created.length}</strong> tag
                        {result.tag_names_created.length === 1 ? "" : "s"}{" "}
                        created: {result.tag_names_created.join(", ")}
                      </p>
                    )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold text-destructive">
                        Errors ({result.errors.length}):
                      </p>
                      <ul className="list-disc list-inside text-sm">
                        {result.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx} className="text-destructive">
                            {err}
                          </li>
                        ))}
                        {result.errors.length > 5 && (
                          <li className="text-muted-foreground">
                            ...and {result.errors.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  resetState()
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 size-4" />
                    Import {preview?.total_rows} Contact
                    {preview?.total_rows === 1 ? "" : "s"}
                  </>
                )}
              </Button>
            </>
          )}
          {step === "complete" && (
            <Button
              onClick={() => {
                resetState()
                setStep("upload")
              }}
            >
              Import Another File
            </Button>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {step === "complete" ? "Close" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
