import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ContactPublic, ContactUpdate } from "@/client"
import { ContactsService } from "@/client"
import { InlineBirthday } from "@/components/Contacts/BirthdayInput"
import { TimezoneInput } from "@/components/Contacts/TimezoneInput"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InlineText,
  InlineTextarea,
} from "@/components/ui/inline-edit"
import { Switch } from "@/components/ui/switch"
import useCustomToast from "@/hooks/useCustomToast"
import {
  BellOff,
  Cake,
  Clock,
  Globe,
  Mail,
  UserRoundSearch,
  Users,
} from "@/lib/icons"

interface InlineContactDetailsCardProps {
  contact: ContactPublic
}

export function InlineContactDetailsCard({
  contact,
}: InlineContactDetailsCardProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const updateMutation = useMutation({
    mutationFn: (data: ContactUpdate) =>
      ContactsService.updateContact({
        contactId: contact.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Updated successfully")
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      queryClient.invalidateQueries({ queryKey: ["contacts", contact.id] })
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to update contact")
    },
  })

  const handleUpdate = async (fieldData: Partial<ContactUpdate>) => {
    await updateMutation.mutateAsync(fieldData)
  }

  return (
    <Card className="border-border/60 shadow-xs dark:bg-zinc-950/40 backdrop-blur-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span>Contact Properties</span>
          {updateMutation.isPending && (
            <span className="text-xs text-muted-foreground font-normal animate-pulse">
              Saving...
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Nickname */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
            <Users className="size-4 text-muted-foreground/70" />
            <span>Nickname</span>
          </div>
          <InlineText
            value={contact.nickname || ""}
            placeholder="+ Add nickname"
            onSave={(val) => handleUpdate({ nickname: val || null })}
            className="sm:max-w-[220px]"
            inputClassName="w-full"
          />
        </div>

        {/* Pronouns */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
            <UserRoundSearch className="size-4 text-muted-foreground/70" />
            <span>Pronouns</span>
          </div>
          <InlineText
            value={contact.pronouns || ""}
            placeholder="+ Add pronouns (e.g. they/them)"
            onSave={(val) => handleUpdate({ pronouns: val || null })}
            className="sm:max-w-[220px]"
            inputClassName="w-full"
          />
        </div>

        {/* Birthday */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
            <Cake className="size-4 text-muted-foreground/70" />
            <span>Birthday</span>
          </div>
          <InlineBirthday
            value={contact.birthday ?? null}
            placeholder="+ Add birthday"
            onSave={(val) => handleUpdate({ birthday: val })}
            className="sm:max-w-[280px]"
          />
        </div>

        {/* Timezone */}
        <div className="flex flex-col gap-1.5 py-1 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Globe className="size-4 text-muted-foreground/70" />
            <span>Timezone</span>
          </div>
          <div className="pl-6">
            <TimezoneInput
              value={contact.timezone || ""}
              onChange={(newTz) => handleUpdate({ timezone: newTz || null })}
            />
          </div>
        </div>

        {/* Contact Frequency */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground font-medium shrink-0">
            <Clock className="size-4 text-muted-foreground/70" />
            <span>Contact Frequency</span>
          </div>
          <div className="flex items-center gap-1">
            <InlineText
              type="number"
              value={
                contact.contact_frequency_days
                  ? String(contact.contact_frequency_days)
                  : ""
              }
              placeholder="+ Set frequency"
              onSave={(val) => {
                const num = val ? Number.parseInt(val, 10) : null
                return handleUpdate({ contact_frequency_days: num })
              }}
              className="sm:max-w-[120px]"
              inputClassName="w-full"
            />
            <span className="text-xs text-muted-foreground">days</span>
          </div>
        </div>

        {/* How We Met */}
        <div className="flex flex-col gap-1.5 py-1 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <UserRoundSearch className="size-4 text-muted-foreground/70" />
            <span>How We Met</span>
          </div>
          <InlineTextarea
            value={contact.how_we_met || ""}
            placeholder="Add story or context of how you met..."
            onSave={(val) => handleUpdate({ how_we_met: val || null })}
            rows={2}
          />
        </div>

        {/* Toggles: Auto log email & Pause reminders */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Mail className="size-3.5 text-muted-foreground" />
                <span>Log email interactions automatically</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Matches contact emails & logs interactions automatically
              </p>
            </div>
            <Switch
              checked={contact.auto_log_email ?? false}
              onCheckedChange={(checked) =>
                handleUpdate({ auto_log_email: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <BellOff className="size-3.5 text-muted-foreground" />
                <span>Pause contact reminders</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Do not trigger stay-in-touch reminders for this contact
              </p>
            </div>
            <Switch
              checked={contact.do_not_contact ?? false}
              onCheckedChange={(checked) =>
                handleUpdate({ do_not_contact: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
