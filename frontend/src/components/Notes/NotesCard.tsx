import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import type { NotePublic } from "@/client"
import { NotesService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import { MentionText } from "@/components/Mentions/MentionText"
import { MentionTextarea } from "@/components/Mentions/MentionTextarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingButton } from "@/components/ui/loading-button"
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import { NotebookPen, Pencil, Trash2 } from "@/lib/icons"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function QuickCapture({ contactId }: { contactId: string }) {
  const [body, setBody] = useState("")
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (text: string) =>
      NotesService.createNoteRoute({
        requestBody: { contact_id: contactId, body: text },
      }),
    onSuccess: () => {
      setBody("")
      queryClient.invalidateQueries({ queryKey: ["notes", contactId] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to save note",
      ),
  })

  const trimmed = body.trim()
  const canSave = trimmed.length > 0 && !mutation.isPending

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSave) mutation.mutate(trimmed)
      }}
      className="space-y-2"
    >
      <MentionTextarea
        value={body}
        onChange={setBody}
        placeholder="Jot a quick note about this person… (type @ to mention)"
        rows={3}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSave) {
            e.preventDefault()
            mutation.mutate(trimmed)
          }
        }}
      />
      <div className="flex justify-end">
        <LoadingButton
          type="submit"
          size="sm"
          loading={mutation.isPending}
          disabled={!canSave}
        >
          Save note
        </LoadingButton>
      </div>
    </form>
  )
}

function EditNoteDialog({
  note,
  open,
  onOpenChange,
}: {
  note: NotePublic
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [body, setBody] = useState(note.body)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  useEffect(() => {
    if (open) setBody(note.body)
  }, [open, note.body])

  const mutation = useMutation({
    mutationFn: (text: string) =>
      NotesService.updateNote({
        noteId: note.id,
        requestBody: { body: text },
      }),
    onSuccess: () => {
      showSuccessToast("Note updated")
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["notes", note.contact_id] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update note",
      ),
  })

  const trimmed = body.trim()
  const canSave = trimmed.length > 0 && !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
        </DialogHeader>
        <MentionTextarea value={body} onChange={setBody} rows={6} autoFocus />
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={mutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <LoadingButton
            onClick={() => canSave && mutation.mutate(trimmed)}
            loading={mutation.isPending}
            disabled={!canSave}
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NoteItem({ note }: { note: NotePublic }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => NotesService.deleteNote({ noteId: note.id }),
    onSuccess: () => {
      showSuccessToast("Note deleted")
      queryClient.invalidateQueries({ queryKey: ["notes", note.contact_id] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete note",
      ),
  })

  const edited = note.updated_at !== note.created_at

  return (
    <>
      <div className="group flex items-start justify-between gap-2 border-t pt-3 first:border-t-0 first:pt-0">
        <div className="min-w-0 flex-1">
          <MentionText
            text={note.body}
            className="text-sm whitespace-pre-wrap"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(note.created_at)}
            {edited && ` · edited ${formatDate(note.updated_at)}`}
          </p>
        </div>
        <RowActionsMenu
          items={[
            {
              label: "Edit",
              icon: Pencil,
              onSelect: () => setEditOpen(true),
            },
            {
              label: "Delete",
              icon: Trash2,
              variant: "destructive",
              onSelect: () => {
                if (window.confirm("Delete this note?")) deleteMutation.mutate()
              },
            },
          ]}
        />
      </div>
      <EditNoteDialog note={note} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}

export function NotesCard({ contactId }: { contactId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["notes", contactId],
    queryFn: () => NotesService.listNotes({ contactId }),
  })
  const notes = data?.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="size-4" /> Notes
          {!isLoading && notes.length > 0 && (
            <span className="text-muted-foreground font-normal">
              ({notes.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <QuickCapture contactId={contactId} />
        {isLoading ? (
          <Skeleton className="h-4 w-2/3" />
        ) : notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((n) => (
              <NoteItem key={n.id} note={n} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={NotebookPen}
            title="No notes yet"
            description="Capture quick observations or context about this contact."
          />
        )}
      </CardContent>
    </Card>
  )
}
