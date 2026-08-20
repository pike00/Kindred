import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import type { ContactPublic, ContactUpdate } from "@/client"
import { ContactsService } from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { AvatarUploadDialog } from "@/components/Contacts/AvatarUploadDialog"
import { ContactFieldsPopover } from "@/components/Contacts/ContactFieldsCard"
import { EditContactDialog } from "@/components/Contacts/EditContactDialog"
import { InteractionHeatmap } from "@/components/Contacts/InteractionHeatmap"
import { formatLocalTime } from "@/components/Contacts/TimezoneInput"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InlineContactName, InlineText } from "@/components/ui/inline-edit"
import useCustomToast from "@/hooks/useCustomToast"
import {
  Archive,
  BellOff,
  Cake,
  Camera,
  Clock,
  Download,
  MessagesSquare,
  Star,
  UserRoundSearch,
} from "@/lib/icons"
import {
  describeContactSource,
  formatBirthday,
  formatDateWithRelative,
} from "@/lib/utils"

function ContactLocalTime({ timezone }: { timezone: string }) {
  const [localTime, setLocalTime] = useState(() => formatLocalTime(timezone))

  useEffect(() => {
    const id = setInterval(
      () => setLocalTime(formatLocalTime(timezone)),
      60_000,
    )
    return () => clearInterval(id)
  }, [timezone])

  if (!localTime) return null

  return (
    <span className="flex items-center gap-1">
      <Clock className="size-3.5" />
      {localTime} their time
      <span className="text-muted-foreground text-xs">({timezone})</span>
    </span>
  )
}

function ContactBirthday({ birthday }: { birthday: string }) {
  const info = formatBirthday(birthday)
  if (!info) return null

  const imminent = info.daysUntil <= 14

  return (
    <span className="flex items-center gap-1">
      <Cake className="size-3.5" />
      <span>
        Born {info.formatted}
        {info.age != null && <> · {info.age} years old</>}
        {info.upcoming && (
          <>
            {" · "}
            <span
              className={imminent ? "font-medium text-foreground" : undefined}
            >
              {info.upcoming}
            </span>
          </>
        )}
      </span>
    </span>
  )
}

interface InlineContactHeaderProps {
  contact: ContactPublic
  onWeekClick?: (weekStart: string, weekEnd: string, count: number) => void
  heatmapFilter?: { startDate: string; endDate: string } | null
  clearHeatmapFilter?: () => void
}

export function InlineContactHeader({
  contact,
  onWeekClick,
  heatmapFilter,
  clearHeatmapFilter,
}: InlineContactHeaderProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const updateMutation = useMutation({
    mutationFn: (data: ContactUpdate) =>
      ContactsService.updateContact({
        contactId: contact.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Contact updated")
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
      queryClient.invalidateQueries({ queryKey: ["contacts", contact.id] })
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to update contact")
    },
  })

  const handleUpdate = async (data: Partial<ContactUpdate>) => {
    await updateMutation.mutateAsync(data)
  }

  return (
    <div className="flex items-start gap-5">
      {/* Avatar */}
      <div className="relative group shrink-0">
        <ContactAvatar contact={contact} size="lg" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <AvatarUploadDialog
            contact={contact}
            trigger={
              <button
                type="button"
                className="text-white hover:text-white/80 cursor-pointer"
                aria-label="Upload avatar"
              >
                <Camera className="size-6" />
              </button>
            }
          />
        </div>
      </div>

      {/* Main Details & Title */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {/* Inline First & Last Name */}
            <InlineContactName
              firstName={contact.first_name || ""}
              lastName={contact.last_name}
              onSave={async ({ first_name, last_name }) => {
                await handleUpdate({ first_name, last_name })
              }}
            />

            <ContactFieldsPopover contactId={contact.id} />

            {/* Favorite toggle badge */}
            <Badge
              variant={contact.is_favorite ? "secondary" : "outline"}
              className="cursor-pointer gap-1 transition-all hover:scale-105"
              onClick={() =>
                handleUpdate({ is_favorite: !contact.is_favorite })
              }
            >
              <Star
                className={`size-3.5 ${
                  contact.is_favorite
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
              {contact.is_favorite ? "Favorite" : "+ Favorite"}
            </Badge>

            {/* Source */}
            {contact.source &&
              (() => {
                const src = describeContactSource(
                  contact.source,
                  contact.source_external_id,
                )
                const SourceIcon = src.isMessagingChannel
                  ? MessagesSquare
                  : Clock
                return (
                  <Badge variant="outline" className="gap-1">
                    <SourceIcon className="size-3" />
                    {src.label}
                    {src.detail && (
                      <span className="text-muted-foreground text-xs">
                        {src.detail}
                      </span>
                    )}
                  </Badge>
                )
              })()}

            {/* Archive toggle badge */}
            {contact.is_archived ? (
              <Badge
                variant="outline"
                className="cursor-pointer gap-1 text-amber-500 border-amber-500/40"
                onClick={() => handleUpdate({ is_archived: false })}
              >
                <Archive className="size-3" /> Archived (Click to Unarchive)
              </Badge>
            ) : null}

            {/* Do not contact badge */}
            {contact.do_not_contact && (
              <Badge
                variant="outline"
                title={contact.do_not_contact_reason || undefined}
              >
                <BellOff className="size-3" /> No reminders
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/api/v1/contacts/${contact.id}.pdf`, "_blank")
              }}
            >
              <Download className="size-4 mr-2" />
              Download PDF
            </Button>
            <EditContactDialog contact={contact} />
          </div>
        </div>

        {/* Title and Company inline */}
        <div className="flex flex-wrap items-center gap-1.5 text-base text-muted-foreground">
          <InlineText
            value={contact.title || ""}
            placeholder="+ Add title (e.g. Software Engineer)"
            onSave={async (val) => {
              await handleUpdate({ title: val || null })
            }}
            className="px-1.5 py-0.5"
            valueClassName="text-base text-muted-foreground font-normal"
            inputClassName="text-sm min-w-[200px]"
          />
          <span className="text-muted-foreground/60 text-sm">at</span>
          <InlineText
            value={contact.company || ""}
            placeholder="+ Add company"
            onSave={async (val) => {
              await handleUpdate({ company: val || null })
            }}
            className="px-1.5 py-0.5"
            valueClassName="text-base text-muted-foreground font-medium"
            inputClassName="text-sm min-w-[160px]"
          />
        </div>

        {/* Sub-header info badges & quick details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground items-center pt-1">
          {contact.birthday && <ContactBirthday birthday={contact.birthday} />}
          {contact.how_we_met && (
            <span className="flex items-center gap-1">
              <UserRoundSearch className="size-3.5" /> How we met:{" "}
              {contact.how_we_met}
            </span>
          )}
          {contact.pronouns && (
            <span className="flex items-center gap-1">
              <UserRoundSearch className="size-3.5" /> Pronouns:{" "}
              {contact.pronouns}
            </span>
          )}
          {contact.timezone && <ContactLocalTime timezone={contact.timezone} />}
          {contact.last_contacted_at && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> Last contacted:{" "}
              {formatDateWithRelative(contact.last_contacted_at)}
            </span>
          )}
        </div>

        {/* Heatmap */}
        {onWeekClick && clearHeatmapFilter && (
          <InteractionHeatmap
            onWeekClick={onWeekClick}
            heatmapFilter={heatmapFilter ?? null}
            clearHeatmapFilter={clearHeatmapFilter}
          />
        )}
      </div>
    </div>
  )
}
