import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { ContactCreate } from "@/client"
import { ContactsService } from "@/client"
import { BirthdayInput } from "@/components/Contacts/BirthdayInput"
import { TimezoneInput } from "@/components/Contacts/TimezoneInput"
import { TagMultiSelect } from "@/components/Tags/TagMultiSelect"
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
import { Separator } from "@/components/ui/separator"
import useCustomToast from "@/hooks/useCustomToast"

const contactCreateSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(255),

  last_name: z.string().optional(),
  nickname: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  title: z.string().max(255).optional(),
  birthday: z.string().nullable().optional(),
  pronouns: z.string().max(100).optional(),
  timezone: z.string().optional(),
  tag_ids: z.array(z.string()),
})

type ContactCreateFormData = z.infer<typeof contactCreateSchema>

/** A titled, divided section so the form reads as grouped fields, not a flat list. */
function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

export const AddContactDialog = () => {
  const [open, setOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const form = useForm<ContactCreateFormData>({
    resolver: zodResolver(contactCreateSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      nickname: "",
      company: "",
      title: "",
      birthday: "",
      pronouns: "",
      timezone: "",
      tag_ids: [],
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
    const payload: ContactCreate = {
      first_name: data.first_name,
      last_name: data.last_name || null,
      nickname: data.nickname || null,
      company: data.company || null,
      title: data.title || null,
      birthday: data.birthday ? data.birthday : null,
      pronouns: data.pronouns || null,
      timezone: data.timezone || null,
      tag_ids: data.tag_ids.length > 0 ? data.tag_ids : null,
    }
    addContactMutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Contact</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Add any details you know now and fill in the rest later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Section title="Name">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
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
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
            </Section>

            <Separator />

            <Section title="Work">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Inc." {...field} />
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
                        <Input placeholder="Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>

            <Separator />

            <Section title="Details">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birthday</FormLabel>
                      <FormControl>
                        <BirthdayInput
                          value={field.value}
                          onChange={field.onChange}
                          disabled={field.disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pronouns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pronouns</FormLabel>
                      <FormControl>
                        <Input placeholder="they/them" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <TimezoneInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>

            <Separator />

            <Section
              title="Tags"
              hint="Group this contact for quick filtering."
            >
              <FormField
                control={form.control}
                name="tag_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TagMultiSelect
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>

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
