import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { WebhookEndpointBase } from "@/client"
import { OpenAPI, WebhooksService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import { MoreHorizontal, Plus } from "@/lib/icons"

type WebhookRow = {
  id: string
  name: string
  url: string | null
  direction: string
  event_types: string | null
  is_active: boolean
  created_at: string
}

type WebhookCreateResponse = WebhookRow & { api_key: string }

const directions = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
] as const

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    direction: z.enum(["inbound", "outbound"]),
    url: z.string().optional(),
    event_types: z.string().optional(),
    secret: z.string().optional(),
    is_active: z.boolean(),
  })
  .refine(
    (d) => d.direction !== "outbound" || (d.url && d.url.trim().length > 0),
    { path: ["url"], message: "Target URL is required for outbound webhooks" },
  )

type FormData = z.infer<typeof schema>

const emptyDefaults: FormData = {
  name: "",
  direction: "inbound",
  url: "",
  event_types: "",
  secret: "",
  is_active: true,
}

function toPayload(data: FormData): WebhookEndpointBase {
  return {
    name: data.name,
    direction: data.direction,
    url: data.direction === "outbound" ? data.url || null : null,
    event_types: data.event_types?.trim() ? data.event_types.trim() : null,
    secret: data.secret?.trim() ? data.secret.trim() : null,
    is_active: data.is_active,
  }
}

function inboundUrl(apiKey: string): string {
  const base = OpenAPI.BASE || window.location.origin
  return `${base}/api/v1/webhooks/inbound/${apiKey}`
}

function WebhookFormFields({
  form,
  allowDirectionChange = true,
}: {
  form: ReturnType<typeof useForm<FormData>>
  allowDirectionChange?: boolean
}) {
  const direction = form.watch("direction")
  return (
    <div className="grid gap-4 py-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Name <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="n8n call logger" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="direction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Direction</FormLabel>
            <div className="flex flex-wrap gap-1">
              {directions.map((d) => (
                <Button
                  key={d.value}
                  type="button"
                  size="sm"
                  variant={field.value === d.value ? "default" : "outline"}
                  disabled={!allowDirectionChange}
                  onClick={() => field.onChange(d.value)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      {direction === "outbound" && (
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Target URL <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/webhook"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="event_types"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event types</FormLabel>
            <FormControl>
              <Input
                placeholder="contact.created, interaction.created"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Comma-separated. Leave empty to receive everything.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="secret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Secret</FormLabel>
            <FormControl>
              <Input
                placeholder="Optional shared secret"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="is_active"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              </FormControl>
              <FormLabel className="cursor-pointer">Active</FormLabel>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
          {value}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              showSuccessToast("Copied to clipboard")
            } catch {
              showErrorToast("Clipboard blocked; copy manually")
            }
          }}
        >
          Copy
        </Button>
      </div>
    </div>
  )
}

function CreatedKeyDialog({
  created,
  onClose,
}: {
  created: WebhookCreateResponse | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!created} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Webhook created</DialogTitle>
          <DialogDescription>
            Save the values below now — the API key won't be shown again.
          </DialogDescription>
        </DialogHeader>
        {created && (
          <div className="grid gap-3 py-2">
            <CopyField label="API key" value={created.api_key} />
            {created.direction === "inbound" && (
              <CopyField
                label="Inbound URL (POST JSON payloads here)"
                value={inboundUrl(created.api_key)}
              />
            )}
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddWebhookDialog() {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<WebhookCreateResponse | null>(null)
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: emptyDefaults,
  })

  const mutation = useMutation({
    mutationFn: (data: WebhookEndpointBase) =>
      WebhooksService.createWebhook({ requestBody: data }),
    onSuccess: (res) => {
      setCreated(res as WebhookCreateResponse)
      form.reset(emptyDefaults)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to create webhook",
      ),
  })

  const onSubmit = (data: FormData) => mutation.mutate(toPayload(data))

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-1 size-3.5" /> Add webhook
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
            <DialogDescription>
              Inbound webhooks give you a URL that external tools can POST to.
              Outbound webhooks (scaffolded; delivery not wired yet) register a
              target URL to notify on events.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <WebhookFormFields form={form} />
              <DialogFooter className="mt-4">
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
      <CreatedKeyDialog created={created} onClose={() => setCreated(null)} />
    </>
  )
}

function EditWebhookDialog({
  webhook,
  open,
  onOpenChange,
}: {
  webhook: WebhookRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: webhook.name,
      direction: webhook.direction as "inbound" | "outbound",
      url: webhook.url ?? "",
      event_types: webhook.event_types ?? "",
      secret: "",
      is_active: webhook.is_active,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: webhook.name,
        direction: webhook.direction as "inbound" | "outbound",
        url: webhook.url ?? "",
        event_types: webhook.event_types ?? "",
        secret: "",
        is_active: webhook.is_active,
      })
    }
  }, [open, webhook, form])

  const mutation = useMutation({
    mutationFn: (data: WebhookEndpointBase) =>
      WebhooksService.updateWebhook({
        webhookId: webhook.id,
        requestBody: data,
      }),
    onSuccess: () => {
      showSuccessToast("Webhook updated")
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update webhook",
      ),
  })

  const onSubmit = (data: FormData) => mutation.mutate(toPayload(data))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit webhook</DialogTitle>
          <DialogDescription>
            Direction cannot be changed — delete and recreate if needed. Leave
            the secret empty to keep the existing value unchanged.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <WebhookFormFields form={form} allowDirectionChange={false} />
            <DialogFooter className="mt-4">
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

function WebhookRowView({ webhook }: { webhook: WebhookRow }) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteMutation = useMutation({
    mutationFn: () => WebhooksService.deleteWebhook({ webhookId: webhook.id }),
    onSuccess: () => {
      showSuccessToast("Webhook deleted")
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to delete webhook",
      ),
  })

  const displayTarget =
    webhook.direction === "inbound"
      ? "URL shown once at creation"
      : webhook.url || "(no target URL)"

  return (
    <>
      <div className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{webhook.name}</span>
            <Badge
              variant={
                webhook.direction === "inbound" ? "default" : "secondary"
              }
            >
              {webhook.direction}
            </Badge>
            {!webhook.is_active && <Badge variant="outline">disabled</Badge>}
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {displayTarget}
          </div>
          {webhook.event_types && (
            <div className="mt-1 text-xs text-muted-foreground">
              Events: {webhook.event_types}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-7 p-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (
                  window.confirm("Delete this webhook? This cannot be undone.")
                )
                  deleteMutation.mutate()
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditWebhookDialog
        webhook={webhook}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

export default function Webhooks() {
  const { data, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => WebhooksService.listWebhooks(),
  })
  const webhooks = (data as { data?: WebhookRow[] } | undefined)?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Register inbound endpoints for external tools (n8n, Aqara,
            automations) to log interactions automatically, or outbound targets
            to notify on events.
          </p>
        </div>
        <AddWebhookDialog />
      </div>
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : webhooks.length > 0 ? (
        <div className="grid gap-2">
          {webhooks.map((w) => (
            <WebhookRowView key={w.id} webhook={w} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No webhooks yet. Add one to start receiving or sending events.
        </p>
      )}
    </div>
  )
}
