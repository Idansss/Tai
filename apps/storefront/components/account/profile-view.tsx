'use client';

import { Alert, Heading, Text } from '@tms/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AccountShell } from './account-shell';
import { useAuth } from './auth-provider';
import { useRequireAuth } from './use-require-auth';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3 last:border-b-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export function ProfileView() {
  const [signingOut, setSigningOut] = useState(false);
  const { user, ready } = useRequireAuth('/account/profile', !signingOut);
  const { logout } = useAuth();
  const router = useRouter();

  const loading = !ready || !user;

  return (
    <AccountShell title="Profile" description="Your account details." loading={loading}>
      {user ? (
        <div className="max-w-xl space-y-6">
          <dl className="rounded-[var(--radius-lg)] border border-line bg-canvas-2 px-5">
            <DetailRow label="Name" value={user.name} />
            <DetailRow label="Email" value={user.email} />
          </dl>

          <Alert tone="info" title="Preview account">
            This is a preview build, profile editing, email verification, password reset,
            notification preferences and data-export or deletion requests arrive with secure server
            authentication.
          </Alert>

          <div>
            <Heading as={2} size="md" className="mb-2">
              Sign out
            </Heading>
            <Text size="sm" tone="muted" className="mb-3">
              End your session on this device.
            </Text>
            <button
              type="button"
              onClick={() => {
                setSigningOut(true);
                logout();
                router.push('/');
              }}
              className="inline-flex h-11 items-center justify-center rounded-md border border-line-2 px-5 text-sm font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </AccountShell>
  );
}
