import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { JournalEntryCreate } from "@/client"
import { JournalService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"

const journalCreateSchema = z.object({
  body: z.string().min(1, "Entry content is required"),
  mood: z.string().optional(),
  entry_date: z.string().min(1, "Date is required"),
})

type JournalCreateFormData = z.infer<typeof journalCreateSchema>

export const AddJournalDialog = () => {
  const [open, setOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<JournalCreateFormData>({
    resolver: zodResolver(journalCreateSchema),
    defaultValues: {
      body: "",
      mood: "",
      entry_date: new Date().toISOString().split("T")[0],
    },
  })

  const addJournalMutation = useMutation({
    mutationFn: (data: JournalEntryCreate) =>
      JournalService.createJournalEntryRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Journal entry created successfully")
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["journal"] })
    },
    onError: () => {
      showErrorToast("Failed to create journal entry")
    },
  })

  const onSubmit = (data: JournalCreateFormData) => {
    addJournalMutation.mutate(data as unknown as JournalEntryCreate)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Entry</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Write Journal Entry</DialogTitle>
          <DialogDescription>
            Capture your thoughts and reflections about your relationships.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="entry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What's on your mind? Write freely..."
                      className="min-h-48"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mood</FormLabel>
                  <FormControl>
                    <Input placeholder="How are you feeling?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={addJournalMutation.isPending}
              className="w-full"
            >
              {addJournalMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
