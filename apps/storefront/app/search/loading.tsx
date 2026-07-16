import { Container, Skeleton, VisuallyHidden } from '@tms/ui';

export default function Loading() {
  return (
    <Container className="py-14">
      <VisuallyHidden role="status">Searching…</VisuallyHidden>
      <Skeleton className="h-5 w-20" />
      <Skeleton className="mt-3 h-10 w-64" />
      <Skeleton className="mt-6 h-11 w-full max-w-xl" />
      <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
          </li>
        ))}
      </ul>
    </Container>
  );
}
