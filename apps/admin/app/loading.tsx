import { Skeleton, VisuallyHidden } from '@tms/ui';

export default function Loading() {
  return (
    <div className="space-y-8">
      <VisuallyHidden role="status">Loading…</VisuallyHidden>
      <Skeleton className="h-10 w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}
