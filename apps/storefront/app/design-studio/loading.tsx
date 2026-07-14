import { Container, Skeleton, VisuallyHidden } from '@tms/ui';

export default function Loading() {
  return (
    <Container className="py-10">
      <VisuallyHidden role="status">Loading the Design Studio…</VisuallyHidden>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-3 h-10 w-56" />
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-[3/4] w-full" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </Container>
  );
}
