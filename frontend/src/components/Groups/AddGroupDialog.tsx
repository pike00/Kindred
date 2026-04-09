import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { GroupsService } from "@/client"
import type { GroupCreate } from "@/client"
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
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const groupCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
})

type GroupCreateFormData = z.infer<typeof groupCreateSchema>

export const AddGroupDialog = () => {
  const [open, setOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<GroupCreateFormData>({
    resolver: zodResolver(groupCreateSchema),
    defaultValues: {
      name: "",
      description: undefined,
    },
  })

  const addGroupMutation = useMutation({
    mutationFn: (data: GroupCreate) =>
      GroupsService.createGroupRoute({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Group created successfully")
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["groups"] })
    },
    onError: () => {
      showErrorToast("Failed to create group")
    },
  })

  const onSubmit = (data: GroupCreateFormData) => {
    addGroupMutation.mutate(data as unknown as GroupCreate)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Group</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Group</DialogTitle>
          <DialogDescription>
            Create a new group to organize your contacts.
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
                    <Input placeholder="e.g., Team, Friends, Family" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description for this group..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={addGroupMutation.isPending}
              className="w-full"
            >
              {addGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
