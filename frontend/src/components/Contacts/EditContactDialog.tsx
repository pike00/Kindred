import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { ContactPublic, ContactUpdate } from "@/client"
import { ContactsService } from "@/client"
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
import { Pencil } from "@/lib/icons"

const contactUpdateSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  nickname: z.string().optional(),
  title: z.string().optional(),
  how_we_met: z.string().optional(),
  contact_frequency_days: z.number().optional(),
  is_favorite: z.boolean().optional(),
  is_archived: z.boolean().optional(),
})

type ContactUpdateFormData = z.infer<typeof contactUpdateSchema>

interface EditContactDialogProps {
  contact: ContactPublic
}

export const EditContactDialog = ({ contact }: EditContactDialogProps) => {
  const [open, setOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<ContactUpdateFormData>({
    resolver: zodResolver(contactUpdateSchema),
    defaultValues: {
      first_name: contact.first_name,
      last_name: contact.last_name || "",
      company: contact.company || "",
      notes: contact.notes || "",
      nickname: contact.nickname || "",
      title: contact.title || "",
      how_we_met: contact.how_we_met || "",
      contact_frequency_days: contact.contact_frequency_days || 0,
      is_favorite: contact.is_favorite,
      is_archived: contact.is_archived,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        first_name: contact.first_name,
        last_name: contact.last_name || "",
        company: contact.company || "",
        notes: contact.notes || "",
        nickname: contact.nickname || "",
        title: contact.title || "",
        how_we_met: contact.how_we_met || "",
        contact_frequency_days: contact.contact_frequency_days || 0,
        is_favorite: contact.is_favorite,
        is_archived: contact.is_archived,
      })
    }
  }, [open, contact, form])

  const updateContactMutation = useMutation({
    mutationFn: (data: ContactUpdate) =>
      ContactsService.updateContact({
        contactId: contact.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Contact updated successfully")
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      queryClient.invalidateQueries({ queryKey: ["contacts", contact.id] })
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to update contact")
    },
  })

  const onSubmit = (data: ContactUpdateFormData) => {
    const updateData: ContactUpdate = {
      first_name: data.first_name,
      last_name: data.last_name || null,
      company: data.company || null,
      notes: data.notes || null,
      nickname: data.nickname || null,
      title: data.title || null,
      how_we_met: data.how_we_met || null,
      contact_frequency_days: data.contact_frequency_days || null,
      is_favorite: data.is_favorite,
      is_archived: data.is_archived,
    }
    updateContactMutation.mutate(updateData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update the contact information.</DialogDescription>
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
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="Johnny" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Software Engineer" {...field} />
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
              name="how_we_met"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How We Met</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell the story..." {...field} />
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
            <FormField
              control={form.control}
              name="contact_frequency_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Frequency (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="30"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register("is_favorite")}
                  className="rounded border-gray-300"
                />
                <span>Favorite</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register("is_archived")}
                  className="rounded border-gray-300"
                />
                <span>Archived</span>
              </label>
            </div>
            <Button
              type="submit"
              disabled={updateContactMutation.isPending}
              className="w-full"
            >
              {updateContactMutation.isPending
                ? "Updating..."
                : "Update Contact"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
