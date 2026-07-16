import { Container, Skeleton, VisuallyHidden } from '@tms/ui';

export default function Loading() {
  return (
    <Container className="py-14">
      <VisuallyHidden role="status">Loading collections…</VisuallyHidden>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-3 h-10 w-64" />
      <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="space-y-3">
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-2/3" />
          </li>
        ))}
      </ul>
    </Container>
  );
}
