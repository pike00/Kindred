import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { AllContactsSharePublic } from "@/client"
import { ContactSharesService } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { formatDateWithRelative } from "@/lib/utils"

interface ContactShareRowProps {
  share: AllContactsSharePublic
}

export function ContactShareRow({ share }: ContactShareRowProps) {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const revokeMutation = useMutation({
    mutationFn: () =>
      ContactSharesService.deleteContactShare({ granteeId: share.grantee_id }),
    onSuccess: () => {
      showSuccessToast(`Removed access for ${share.grantee_email}`)
      queryClient.invalidateQueries({ queryKey: ["contact-shares"] })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error ? error.message : "Failed to revoke access",
      )
    },
  })

  const handleRevoke = () => {
    const confirmed = window.confirm(
      `Revoke all-contact sharing for ${share.grantee_email}? They will lose access immediately.`,
    )
    if (confirmed) {
      revokeMutation.mutate()
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-1">
        <p className="font-medium">{share.grantee_email}</p>
        <p className="text-sm text-muted-foreground">
          Granted {formatDateWithRelative(share.created_at)}
        </p>
        <p className="text-sm text-muted-foreground">
          Full access to all current and future contacts you own.
        </p>
      </div>
      <Button variant="outline" onClick={handleRevoke}>
        Revoke access
      </Button>
    </div>
  )
}
