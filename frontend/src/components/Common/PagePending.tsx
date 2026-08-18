import { Skeleton } from "@/components/ui/skeleton"

export function PagePending() {
  return (
    <div
      className="space-y-6 p-1 animate-in fade-in-50 duration-200"
      data-testid="page-pending"
    >
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Metric / Stat cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>

      {/* Main content list / table skeleton */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-5 w-36 mb-4" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default PagePending
