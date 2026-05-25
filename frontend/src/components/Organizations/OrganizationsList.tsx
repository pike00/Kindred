import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"

import { type OrganizationPublic, OrganizationsService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, ChevronLeft, ChevronRight, Search } from "@/lib/icons"
import { AddOrganizationDialog } from "./AddOrganizationDialog"

const PAGE_SIZE = 25

function matchesSearch(org: OrganizationPublic, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  const haystack = [org.name, org.domain, org.industry, org.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(needle)
}

export function OrganizationsList() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [addOpen, setAddOpen] = useState(false)

  const { data } = useSuspenseQuery({
    queryKey: ["organizations", page],
    queryFn: () =>
      OrganizationsService.listOrganizations({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  })

  const orgs = ((data as any)?.data ?? []).filter((o: any) =>
    matchesSearch(o, search),
  )
  const total = (data as any)?.count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Building2 className="mr-2 h-4 w-4" />
          Add organization
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="pl-9"
        />
      </div>

      {/* List */}
      {orgs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Add your first organization to get started."
          action={
            <Button onClick={() => setAddOpen(true)}>Add organization</Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {orgs.map((org: any) => (
            <Link
              key={org.id}
              to={"/organizations/$orgId" as never}
              params={{ orgId: org.id } as never}
              className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{org.name}</span>
                    {org.domain && (
                      <Badge variant="outline" className="text-xs">
                        {org.domain}
                      </Badge>
                    )}
                  </div>
                  {(org.industry || org.contact_count > 0) && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {org.industry && <span>{org.industry}</span>}
                      {org.contact_count > 0 && (
                        <span>
                          {org.contact_count} contact
                          {org.contact_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      <AddOrganizationDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
