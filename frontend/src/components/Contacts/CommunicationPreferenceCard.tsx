import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  CommunicationPreferencePublic,
  CommunicationPreferenceUpdate,
  ContactPublic,
} from "@/client"
import { CommunicationPreferencesService } from "@/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import {
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Users,
  Video,
} from "@/lib/icons"

const CHANNELS = [
  { value: "call", label: "Call", icon: Phone },
  { value: "in_person", label: "In Person", icon: Users },
  { value: "text", label: "Text", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "video", label: "Video", icon: Video },
  { value: "social", label: "Social", icon: Users },
  { value: "other", label: "Other", icon: Pencil },
] as const

const channelIconMap: Record<string, React.ReactNode> = Object.fromEntries(
  CHANNELS.map((c) => [c.value, <c.icon key={c.value} className="size-4" />]),
)

const schema = z.object({
  preferred_channel: z.string().nullable().optional(),
  best_time_local: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/,
      "Must be HH:MM-HH:MM",
    )
    .nullable()
    .optional(),
  do_not_contact: z.boolean().optional(),
  do_not_contact_reason: z.string().max(500).nullable().optional(),
})

type FormData = z.infer<typeof schema>

interface CommunicationPreferenceCardProps {
  contact: ContactPublic
}

export function CommunicationPreferenceCard({
  contact,
}: CommunicationPreferenceCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const { data: pref, isLoading } = useQuery({
    queryKey: ["communication-preference", contact.id],
    queryFn: () =>
      CommunicationPreferencesService.getCommunicationPreference({
        contactId: contact.id,
      }).then((r) => r as CommunicationPreferencePublic | null | undefined),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      preferred_channel: pref?.preferred_channel ?? null,
      best_time_local: pref?.best_time_local ?? null,
      do_not_contact: pref?.do_not_contact ?? false,
      do_not_contact_reason: pref?.do_not_contact_reason ?? null,
    },
  })

  useEffect(() => {
    if (pref) {
      form.reset({
        preferred_channel: pref.preferred_channel ?? null,
        best_time_local: pref.best_time_local ?? null,
        do_not_contact: pref.do_not_contact ?? false,
        do_not_contact_reason: pref.do_not_contact_reason ?? null,
      })
    }
  }, [pref, form])

  const mutation = useMutation({
    mutationFn: (data: CommunicationPreferenceUpdate) =>
      CommunicationPreferencesService.upsertCommunicationPreference({
        contactId: contact.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Communication preferences updated")
      setIsEditing(false)
      queryClient.invalidateQueries({
        queryKey: ["communication-preference", contact.id],
      })
      queryClient.invalidateQueries({ queryKey: ["contacts", contact.id] })
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to update preferences")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      CommunicationPreferencesService.deleteCommunicationPreference({
        contactId: contact.id,
      }),
    onSuccess: () => {
      showSuccessToast("Communication preferences removed")
      setIsEditing(false)
      queryClient.invalidateQueries({
        queryKey: ["communication-preference", contact.id],
      })
      queryClient.invalidateQueries({ queryKey: ["contacts", contact.id] })
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to remove preferences")
    },
  })

  const onSubmit = (data: FormData) => {
    const updateData: CommunicationPreferenceUpdate = {
      preferred_channel: data.preferred_channel,
      best_time_local: data.best_time_local,
      do_not_contact: data.do_not_contact,
      do_not_contact_reason: data.do_not_contact_reason,
    }
    mutation.mutate(updateData)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Communication Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Communication Preferences</span>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              {pref ? "Edit" : "Add"}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="preferred_channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Channel</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNELS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <span className="flex items-center gap-2">
                              {channelIconMap[c.value]}
                              {c.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="best_time_local"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Best Time (Local)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="09:00-17:00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="do_not_contact"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Do Not Contact</FormLabel>
                  </FormItem>
                )}
              />
              {form.watch("do_not_contact") && (
                <FormField
                  control={form.control}
                  name="do_not_contact_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Reason for do-not-contact..."
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    form.reset()
                  }}
                >
                  Cancel
                </Button>
                {pref && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-2 text-sm">
            {pref?.preferred_channel && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  Preferred channel:
                </span>
                <span className="flex items-center gap-1">
                  {channelIconMap[pref.preferred_channel]}
                  {CHANNELS.find((c) => c.value === pref.preferred_channel)
                    ?.label ?? pref.preferred_channel}
                </span>
              </div>
            )}
            {pref?.best_time_local && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Best time:</span>
                <span>{pref.best_time_local}</span>
              </div>
            )}
            {pref?.do_not_contact && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2">
                <p className="font-medium text-destructive">Do Not Contact</p>
                {pref.do_not_contact_reason && (
                  <p className="text-sm text-muted-foreground">
                    Reason: {pref.do_not_contact_reason}
                  </p>
                )}
              </div>
            )}
            {!pref && (
              <p className="text-muted-foreground">
                No communication preferences set.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
