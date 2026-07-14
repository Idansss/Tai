'use client';

import { Button, Container, ErrorState } from '@tms/ui';
import { useEffect } from 'react';

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced to monitoring in F6; never rendered raw to the customer.
    console.error(error);
  }, [error]);

  return (
    <Container className="py-24">
      <ErrorState
        title="Something went wrong"
        description="We hit an unexpected problem loading this page. Please try again."
        dataPreservedNote="Nothing you were doing has been lost."
        reference={error.digest}
        action={<Button onClick={() => reset()}>Try again</Button>}
      />
    </Container>
  );
}
