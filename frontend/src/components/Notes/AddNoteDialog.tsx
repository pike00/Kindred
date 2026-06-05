import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { NotesService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"

interface AddNoteDialogProps {
  contactId: string
  /** Controlled-open mode (e.g. from a dropdown). */
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** A minimal controlled dialog for adding a note to a contact. */
export function AddNoteDialog({
  contactId,
  open,
  onOpenChange,
}: AddNoteDialogProps) {
  const [body, setBody] = useState("")
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (text: string) =>
      NotesService.createNoteRoute({
        requestBody: { contact_id: contactId, body: text },
      }),
    onSuccess: () => {
      showSuccessToast("Note added")
      setBody("")
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["notes", contactId] })
    },
    onError: () => showErrorToast("Failed to add note"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add note</DialogTitle>
          <DialogDescription>
            Jot down something about this contact.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's on your mind?"
          rows={5}
          autoFocus
        />
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate(body)}
            disabled={!body.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Add note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
