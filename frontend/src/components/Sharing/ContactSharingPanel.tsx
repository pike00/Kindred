import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { ContactSharesService } from "@/client"
import { ContactShareDialog } from "@/components/Sharing/ContactShareDialog"
import { ContactShareRow } from "@/components/Sharing/ContactShareRow"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function ContactSharingPanel() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["contact-shares"],
    queryFn: () => ContactSharesService.listContactShares(),
  })

  const shares = data?.data ?? []

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Contact sharing</h2>
            <p className="text-sm text-muted-foreground">
              This shares all current and future contacts and their
              contact-related records. The recipient can edit shared contacts
              and interactions.
            </p>
            <p className="text-sm text-muted-foreground">
              This is separate from tag sharing and applies to every contact
              you own.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>Share all contacts</Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : shares.length > 0 ? (
          <div className="grid gap-3">
            {shares.map((share) => (
              <ContactShareRow key={share.grantee_id} share={share} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No broad contact shares yet. Add a person by email to share every
            current and future contact you own.
          </div>
        )}
      </div>

      <ContactShareDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
