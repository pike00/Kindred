import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { TagsService } from "@/client"
import type { TagCreate } from "@/client"
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
import useCustomToast from "@/hooks/useCustomToast"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const tagCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional(),
})

type TagCreateFormData = z.infer<typeof tagCreateSchema>

export const AddTagDialog = () => {
  const [open, setOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<TagCreateFormData>({
    resolver: zodResolver(tagCreateSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6",
    },
  })

  const addTagMutation = useMutation({
    mutationFn: (data: TagCreate) =>
      TagsService.createTagRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Tag created successfully")
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["tags"] })
    },
    onError: () => {
      showErrorToast("Failed to create tag")
    },
  })

  const onSubmit = (data: TagCreateFormData) => {
    addTagMutation.mutate(data as unknown as TagCreate)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Tag</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Tag</DialogTitle>
          <DialogDescription>
            Create a new tag to organize your contacts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Close Friend, Colleague" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={addTagMutation.isPending}
              className="w-full"
            >
              {addTagMutation.isPending ? "Creating..." : "Create Tag"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
