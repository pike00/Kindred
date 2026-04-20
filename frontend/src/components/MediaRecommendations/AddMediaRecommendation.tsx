import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  type MediaRecommendationCreate,
  MediaRecommendationsService,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { LoadingButton } from "@/components/ui/loading-button"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { Plus } from "@/lib/icons"

const schema = z.object({
  category: z.enum([
    "movie",
    "tv_show",
    "podcast",
    "musician",
    "book",
    "other",
  ]),
  title: z.string().min(1, { message: "Title is required" }),
  creator: z.string().optional(),
  note: z.string().optional(),
  recommended_at: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddMediaRecommendationProps {
  contactId: string
}

export function AddMediaRecommendation({
  contactId,
}: AddMediaRecommendationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      category: "movie",
      title: "",
      creator: "",
      note: "",
      recommended_at: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: MediaRecommendationCreate) =>
      MediaRecommendationsService.createMediaRecommendationRoute({
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Recommendation added")
      form.reset()
      setIsOpen(false)
    },
    onError: (error) =>
      showErrorToast(
        error instanceof Error ? error.message : "Failed to add recommendation",
      ),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["media-recommendations", contactId],
      })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      contact_id: contactId,
      category: data.category,
      title: data.title,
      creator: data.creator || undefined,
      note: data.note || undefined,
      recommended_at: data.recommended_at || undefined,
    } as MediaRecommendationCreate)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 size-3.5" /> Add Recommendation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Media Recommendation</DialogTitle>
          <DialogDescription>
            Track a movie, show, podcast, musician, or book this contact
            recommended (or one you want to share with them).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => {
                  const categories: {
                    value: FormData["category"]
                    label: string
                  }[] = [
                    { value: "movie", label: "Movie" },
                    { value: "tv_show", label: "TV Show" },
                    { value: "podcast", label: "Podcast" },
                    { value: "musician", label: "Musician" },
                    { value: "book", label: "Book" },
                    { value: "other", label: "Other" },
                  ]
                  return (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <div className="flex flex-wrap gap-1">
                        {categories.map((cat) => (
                          <Button
                            key={cat.value}
                            type="button"
                            size="sm"
                            variant={
                              field.value === cat.value ? "default" : "outline"
                            }
                            onClick={() => field.onChange(cat.value)}
                          >
                            {cat.label}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. The Bear" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creator / Author / Artist</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Christopher Storer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recommended_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context / Note</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Why was it recommended? What did they say about it?"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
