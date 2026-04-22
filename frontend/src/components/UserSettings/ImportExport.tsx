import { useMutation } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { ImportExportService, OpenAPI } from "@/client"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"

type ImportResult = {
  imported: number
  errors: string[]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function downloadAuthed(path: string, filename: string, accept: string) {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await (OpenAPI.TOKEN as () => Promise<string>)()
      : OpenAPI.TOKEN || ""
  const res = await fetch(`${OpenAPI.BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: accept,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`)
  }
  downloadBlob(await res.blob(), filename)
}

export default function ImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const importMutation = useMutation({
    mutationFn: (file: File) =>
      ImportExportService.importVcard({ formData: { file } }),
    onSuccess: (res) => {
      const r = res as ImportResult
      setResult(r)
      showSuccessToast(`Imported ${r.imported} contact(s)`)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    onError: (err) =>
      showErrorToast(err instanceof Error ? err.message : "Import failed"),
  })

  const vcardExport = useMutation({
    mutationFn: () =>
      downloadAuthed(
        "/api/v1/import-export/export/vcard",
        `contacts-${new Date().toISOString().slice(0, 10)}.vcf`,
        "text/vcard",
      ),
    onSuccess: () => showSuccessToast("vCard export downloaded"),
    onError: (err) =>
      showErrorToast(err instanceof Error ? err.message : "Export failed"),
  })

  const jsonExport = useMutation({
    mutationFn: () =>
      downloadAuthed(
        "/api/v1/import-export/export/json",
        `contacts-${new Date().toISOString().slice(0, 10)}.json`,
        "application/json",
      ),
    onSuccess: () => showSuccessToast("JSON export downloaded"),
    onError: (err) =>
      showErrorToast(err instanceof Error ? err.message : "Export failed"),
  })

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Import contacts</h2>
          <p className="text-sm text-muted-foreground">
            Upload a vCard (<code>.vcf</code>) file to add contacts in bulk.
            Multi-entry vCards are supported; entries with a UID already in your
            account are skipped.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".vcf,text/vcard,text/directory"
            onChange={(e) => {
              setResult(null)
              setSelectedFile(e.target.files?.[0] ?? null)
            }}
            className="text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedFile
                ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                : "No file selected"}
            </span>
            <LoadingButton
              size="sm"
              disabled={!selectedFile}
              loading={importMutation.isPending}
              onClick={() => {
                if (selectedFile) importMutation.mutate(selectedFile)
              }}
            >
              Import
            </LoadingButton>
          </div>
        </div>
        {result && (
          <div className="rounded-md border p-3 text-sm">
            <div>
              Imported <span className="font-medium">{result.imported}</span>{" "}
              contact{result.imported === 1 ? "" : "s"}.
            </div>
            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {result.errors.length} issue
                  {result.errors.length === 1 ? "" : "s"} (click to expand)
                </summary>
                <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Export contacts</h2>
          <p className="text-sm text-muted-foreground">
            Download a copy of your contacts. vCard is suitable for importing
            into phones and other address books; JSON is a lossless dump of the
            stored fields.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LoadingButton
            variant="outline"
            loading={vcardExport.isPending}
            onClick={() => vcardExport.mutate()}
          >
            Download vCard (.vcf)
          </LoadingButton>
          <LoadingButton
            variant="outline"
            loading={jsonExport.isPending}
            onClick={() => jsonExport.mutate()}
          >
            Download JSON (.json)
          </LoadingButton>
        </div>
      </section>
    </div>
  )
}
