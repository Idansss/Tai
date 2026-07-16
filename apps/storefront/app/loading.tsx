import { Container, Skeleton, VisuallyHidden } from '@tms/ui';

export default function Loading() {
  return (
    <Container className="py-20">
      <VisuallyHidden role="status">Loading page…</VisuallyHidden>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-4 h-16 w-full max-w-2xl" />
      <Skeleton className="mt-3 h-16 w-full max-w-xl" />
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    </Container>
  );
}
