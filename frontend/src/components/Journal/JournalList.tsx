import { useSuspenseQuery } from "@tanstack/react-query"

import { JournalService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { EmptyState } from "@/components/Common/EmptyState"
import { NotebookPen } from "@/lib/icons"
import { useSeedDemo } from "@/lib/seed"
import { AddJournalDialog } from "./AddJournalDialog"
import { columns } from "./columns"
export const JournalList = () => {
  const seedMutation = useSeedDemo()

  const { data } = useSuspenseQuery({
    queryKey: ["journal"],
    queryFn: () => JournalService.listJournalEntries(),
  })

  const entries = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Journal
        </h1>
        {entries.length > 0 && <AddJournalDialog />}
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No journal entries yet"
          description="Write your first journal entry to capture thoughts and reflections about your relationships."
          action={
            import.meta.env.DEV ? (
              <div className="flex flex-col items-center gap-2">
                <AddJournalDialog />
                <p className="text-xs text-muted-foreground">or</p>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  disabled={seedMutation.isPending}
                  onClick={() => seedMutation.mutate({ count: 8 })}
                >
                  {seedMutation.isPending ? "Seeding..." : "Seed demo entries"}
                </button>
              </div>
            ) : (
              <AddJournalDialog />
            )
          }
        />
      ) : (
        <DataTable columns={columns} data={entries} />
      )}
    </div>
  )
}
