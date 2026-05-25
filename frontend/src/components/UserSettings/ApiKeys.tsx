import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { APIKeyCreated, APIKeyPublic, UserPublic } from "@/client"
import { ApiKeysService, UsersService } from "@/client"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import { MoreHorizontal, Plus } from "@/lib/icons"

// ─── CopyField ────────────────────────────────────────────────────────────────

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

// ─── Created key dialog ───────────────────────────────────────────────────────

function CreatedKeyDialog({
  created,
  onClose,
}: {
  created: APIKeyCreated | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!created} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>API key created</DialogTitle>
          <DialogDescription>
            Copy the key now — it won't be shown again.
          </DialogDescription>
        </DialogHeader>
        {created && (
          <div className="grid gap-3 py-2">
            <CopyField label="API key" value={created.plaintext_key} />
            <p className="text-xs text-muted-foreground">
              Use this as a{" "}
              <code className="rounded bg-muted px-1 py-0.5">Bearer</code> token
              in the{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                Authorization
              </code>{" "}
              header.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add key dialog ───────────────────────────────────────────────────────────

function AddApiKeyDialog() {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<APIKeyCreated | null>(null)
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const { data: usersData } = useQuery({
    queryKey: ["users-for-impersonation"],
    queryFn: () => UsersService.readUsers({ limit: 200 }),
    enabled: open,
  })
  const users: UserPublic[] = usersData?.data ?? []

  const mutation = useMutation({
    mutationFn: () =>
      ApiKeysService.createMyApiKey({
        requestBody: {
          name: name.trim(),
          can_impersonate: [...selected],
        },
      }),
    onSuccess: (res) => {
      setCreated(res)
      setName("")
      setSelected(new Set())
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to create API key",
      ),
  })

  const toggleUser = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) {
            setName("")
            setSelected(new Set())
          }
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-1 size-3.5" /> Create key
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              API keys authenticate as you. Optionally allow the key to act on
              behalf of specific other users.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="key-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="key-name"
                placeholder="janet bot"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {users.length > 1 && (
              <div className="grid gap-1.5">
                <Label>Can act on behalf of</Label>
                <p className="text-xs text-muted-foreground">
                  Leave empty to use only as yourself.
                </p>
                <div className="max-h-40 overflow-y-auto rounded border p-2">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => toggleUser(u.id)}
                    >
                      <Checkbox
                        checked={selected.has(u.id)}
                        onCheckedChange={() => toggleUser(u.id)}
                      />
                      <span className="flex-1 truncate text-left">
                        {u.full_name || u.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={mutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton
              loading={mutation.isPending}
              disabled={!name.trim()}
              onClick={() => mutation.mutate()}
            >
              Create
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CreatedKeyDialog created={created} onClose={() => setCreated(null)} />
    </>
  )
}

// ─── Key row ──────────────────────────────────────────────────────────────────

function ApiKeyRow({ apiKey }: { apiKey: APIKeyPublic }) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const revokeMutation = useMutation({
    mutationFn: () => ApiKeysService.revokeMyApiKey({ apiKeyId: apiKey.id }),
    onSuccess: () => {
      showSuccessToast("API key revoked")
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to revoke API key",
      ),
  })

  const isRevoked = !!apiKey.revoked_at
  const isExpired =
    !isRevoked &&
    !!apiKey.expires_at &&
    new Date(apiKey.expires_at) < new Date()

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return null
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{apiKey.name}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            kk_{apiKey.key_prefix}…
          </code>
          {isRevoked && <Badge variant="destructive">revoked</Badge>}
          {isExpired && <Badge variant="outline">expired</Badge>}
          {apiKey.can_impersonate.length > 0 && (
            <Badge variant="secondary">
              +{apiKey.can_impersonate.length} impersonation
              {apiKey.can_impersonate.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <span>Created {formatDate(apiKey.created_at)}</span>
          {apiKey.last_used_at && (
            <span>Last used {formatDate(apiKey.last_used_at)}</span>
          )}
          {apiKey.expires_at && (
            <span>Expires {formatDate(apiKey.expires_at)}</span>
          )}
        </div>
      </div>
      {!isRevoked && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-7 p-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (
                  window.confirm(
                    "Revoke this API key? It will stop working immediately.",
                  )
                )
                  revokeMutation.mutate()
              }}
            >
              Revoke
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApiKeys() {
  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => ApiKeysService.listMyApiKeys(),
  })
  const keys: APIKeyPublic[] = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Long-lived tokens for scripts and bots. Keys can optionally
            impersonate specific users via the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              X-On-Behalf-Of
            </code>{" "}
            header.
          </p>
        </div>
        <AddApiKeyDialog />
      </div>
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : keys.length > 0 ? (
        <div className="grid gap-2">
          {keys.map((k) => (
            <ApiKeyRow key={k.id} apiKey={k} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No API keys yet. Create one to authenticate scripts or bots.
        </p>
      )}
    </div>
  )
}
