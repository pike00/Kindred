import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ContactsService } from "@/client"
import type { ContactCreate } from "@/client"
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

const contactCreateSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
})

type ContactCreateFormData = z.infer<typeof contactCreateSchema>

export const AddContactDialog = () => {
  const [open, setOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<ContactCreateFormData>({
    resolver: zodResolver(contactCreateSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      company: "",
      notes: "",
    },
  })

  const addContactMutation = useMutation({
    mutationFn: (data: ContactCreate) =>
      ContactsService.createContact({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Contact created successfully")
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
    onError: () => {
      showErrorToast("Failed to create contact")
    },
  })

  const onSubmit = (data: ContactCreateFormData) => {
    addContactMutation.mutate(data as unknown as ContactCreate)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Contact</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Create a new contact to start tracking interactions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this contact..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={addContactMutation.isPending}
              className="w-full"
            >
              {addContactMutation.isPending ? "Creating..." : "Create Contact"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
