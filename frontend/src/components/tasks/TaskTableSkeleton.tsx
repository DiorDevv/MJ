import { Skeleton } from '../ui'

interface TaskTableSkeletonProps {
  rows?: number
}

export function TaskTableSkeleton({ rows = 4 }: TaskTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0"
        >
          <Skeleton className="size-4 shrink-0 rounded" />
          <Skeleton className="size-4 shrink-0 rounded" />
          <Skeleton className="h-4 w-1/3 min-w-24" />
          <Skeleton className="hidden h-4 w-16 md:block" />
          <Skeleton className="hidden h-4 w-14 sm:block" />
          <Skeleton className="ml-auto h-4 w-10" />
        </div>
      ))}
    </div>
  )
}
