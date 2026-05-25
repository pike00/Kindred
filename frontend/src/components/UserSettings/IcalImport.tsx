import { useMutation } from "@tanstack/react-query"
import { format } from "date-fns"
import { CalendarIcon, CheckIcon, InfoIcon, UploadIcon } from "lucide-react"
import { useRef, useState } from "react"
import { IcalService } from "@/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"

interface Proposal {
  [key: string]: unknown
  uid: string | null
  summary: string
  description: string | null
  occurred_at: string | null
  already_imported?: boolean
  attendees: Array<{
    attendee: { email: string | null; cn: string | null; role: string | null }
    matches: Array<{
      contact_id: string
      contact_name: string
      confidence: number
      match_method: string
    }>
  }>
  classification: string
  event_type: string
  channel: string | null
  skipped: boolean
}

interface UploadResponse {
  proposals: Proposal[]
  skipped_future: number
  parse_errors: string[]
  total_contacts: number
  already_imported: boolean
}

interface ConfirmResponse {
  created_interactions: number
  created_life_events: number
  skipped_duplicates: number
  errors: string[]
}

export default function IcalImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(
    null,
  )
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const uploadMutation = useMutation({
    mutationFn: (file: File) => IcalService.uploadIcal({ formData: { file } }),
    onSuccess: (data) => {
      const result = data as unknown as UploadResponse
      setUploadResult(result)
      setProposals(result.proposals)
      // Pre-select all rows by default
      setSelectedRows(new Set(result.proposals.map((_, i) => i)))
      setConfirmResult(null)
      showSuccessToast(`Parsed ${result.proposals.length} event(s)`)
    },
    onError: (err) =>
      showErrorToast(err instanceof Error ? err.message : "Upload failed"),
  })

  const confirmMutation = useMutation({
    mutationFn: (selectedProposals: Proposal[]) =>
      IcalService.confirmIcalImport({ requestBody: selectedProposals }),
    onSuccess: (data) => {
      const result = data as unknown as ConfirmResponse
      setConfirmResult(result)
      showSuccessToast(
        `Created ${result.created_interactions} interaction(s) and ${result.created_life_events} life event(s)`,
      )
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Confirmation failed",
      ),
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setProposals([])
    setUploadResult(null)
    setConfirmResult(null)
  }

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    }
  }

  const handleConfirm = () => {
    const selectedProposals = Array.from(selectedRows).map((i) => proposals[i])
    confirmMutation.mutate(selectedProposals)
  }

  const toggleRow = (index: number) => {
    const newSet = new Set(selectedRows)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedRows(newSet)
  }

  const toggleAll = () => {
    if (selectedRows.size === proposals.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(proposals.map((_, i) => i)))
    }
  }

  const getClassificationBadge = (
    classification: string,
    _eventType: string,
  ) => {
    if (classification === "interaction") {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800">
          Interaction
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Life Event
      </Badge>
    )
  }

  const _formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown"
    try {
      return format(new Date(dateStr), "yyyy-MM-dd HH:mm")
    } catch {
      return dateStr
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Import iCal File</h2>
          <p className="text-sm text-muted-foreground">
            Upload a <code>.ics</code> calendar export file to backfill
            historical interactions and life events. Events are matched to your
            contacts and require confirmation before importing.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Calendar File</CardTitle>
            <CardDescription>
              Select an <code>.ics</code> file exported from your calendar app
              (Google Calendar, Outlook, Apple Calendar, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <button
              type="button"
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors w-full"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const file = e.dataTransfer.files?.[0]
                if (file) {
                  setSelectedFile(file)
                  setProposals([])
                  setUploadResult(null)
                }
              }}
            >
              <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your <code>.ics</code> file here, or click to
                browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,text/calendar"
                onChange={handleFileSelect}
                className="hidden"
              />
            </button>

            {selectedFile && (
              <div className="flex items-center justify-between gap-2 p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <LoadingButton
                  size="sm"
                  loading={uploadMutation.isPending}
                  onClick={handleUpload}
                >
                  Parse File
                </LoadingButton>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {uploadResult && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review Proposals</h2>
              <p className="text-sm text-muted-foreground">
                {uploadResult.proposals.length} event(s) parsed,{" "}
                {uploadResult.skipped_future} future event(s) skipped.
                {uploadResult.total_contacts === 0 && (
                  <span className="text-yellow-600">
                    {" "}
                    No contacts found for matching.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedRows.size === proposals.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <LoadingButton
                size="sm"
                disabled={selectedRows.size === 0}
                loading={confirmMutation.isPending}
                onClick={handleConfirm}
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Import Selected ({selectedRows.size})
              </LoadingButton>
            </div>
          </div>

          {uploadResult.skipped_future > 0 && (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Future Events Skipped</AlertTitle>
              <AlertDescription>
                {uploadResult.skipped_future} event(s) in the future were
                skipped (backfill only imports past events).
              </AlertDescription>
            </Alert>
          )}

          {uploadResult.parse_errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Parse Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5">
                  {uploadResult.parse_errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {proposals.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRows.size === proposals.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Matched Contacts</TableHead>
                    <TableHead>Channel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((prop, index) => (
                    <TableRow
                      key={index}
                      className={!selectedRows.has(index) ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(index)}
                          onCheckedChange={() => toggleRow(index)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {prop.summary || "Untitled Event"}
                          </div>
                          {prop.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {prop.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getClassificationBadge(
                          prop.classification,
                          prop.event_type,
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {prop.event_type}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {_formatDate(prop.occurred_at)}
                      </TableCell>
                      <TableCell>
                        {prop.already_imported && (
                          <Badge variant="outline" className="text-yellow-600">
                            Already imported
                          </Badge>
                        )}
                        {prop.attendees.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No attendees
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {prop.attendees.map((att, i) => (
                              <div key={i} className="text-sm">
                                {att.matches.length > 0 ? (
                                  <div>
                                    <span className="font-medium">
                                      {att.matches[0].contact_name}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({Math.round(att.matches[0].confidence)}%
                                      match)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {att.attendee.cn ||
                                      att.attendee.email ||
                                      "Unknown"}{" "}
                                    <span className="text-yellow-600">
                                      (no match)
                                    </span>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {prop.channel && (
                          <Badge variant="outline">{prop.channel}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertTitle>No Events Found</AlertTitle>
              <AlertDescription>
                No past events were found in the uploaded file. Future events
                are skipped during backfill.
              </AlertDescription>
            </Alert>
          )}
        </section>
      )}

      {confirmResult && (
        <section>
          <Alert>
            <CheckIcon className="h-4 w-4" />
            <AlertTitle>Import Complete</AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-1 mt-2">
                <div>
                  Created{" "}
                  <span className="font-medium">
                    {confirmResult.created_interactions}
                  </span>{" "}
                  interaction(s) and{" "}
                  <span className="font-medium">
                    {confirmResult.created_life_events}
                  </span>{" "}
                  life event(s).
                </div>
                {confirmResult.skipped_duplicates > 0 && (
                  <div>
                    Skipped{" "}
                    <span className="font-medium">
                      {confirmResult.skipped_duplicates}
                    </span>{" "}
                    duplicate(s).
                  </div>
                )}
                {confirmResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-destructive">Errors:</p>
                    <ul className="list-disc pl-5">
                      {confirmResult.errors.map((err, i) => (
                        <li key={i} className="text-destructive">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setProposals([])
                setUploadResult(null)
                setConfirmResult(null)
                setSelectedFile(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}
            >
              Import Another File
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
