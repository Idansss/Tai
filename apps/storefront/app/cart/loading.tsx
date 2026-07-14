import { Container, Skeleton, VisuallyHidden } from '@tms/ui';

export default function Loading() {
  return (
    <Container className="py-10">
      <VisuallyHidden role="status">Loading your bag…</VisuallyHidden>
      <Skeleton className="h-5 w-16" />
      <Skeleton className="mt-3 h-10 w-48" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </Container>
  );
}
