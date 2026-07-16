import { Container, Skeleton, VisuallyHidden } from '@tms/ui';

export default function Loading() {
  return (
    <Container width="wide" className="py-12 sm:py-16">
      <VisuallyHidden role="status">Loading the Design Studio…</VisuallyHidden>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-12 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-8 grid overflow-hidden rounded-[var(--radius-xl)] border border-line lg:grid-cols-[1.05fr_1fr]">
        <div className="border-b border-line p-6 lg:border-b-0 lg:border-r">
          <Skeleton className="mx-auto aspect-[3/4] w-full max-w-md" />
        </div>
        <div className="space-y-6 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
