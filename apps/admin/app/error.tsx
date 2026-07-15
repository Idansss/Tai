'use client';

import { Button, ErrorState } from '@tms/ui';
import { useEffect } from 'react';

export default function AdminRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="This view failed to load"
      description="An unexpected error occurred. You can retry, or return to the dashboard."
      reference={error.digest}
      action={<Button onClick={() => reset()}>Retry</Button>}
    />
  );
}
