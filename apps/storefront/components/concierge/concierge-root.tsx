'use client';

import { ConciergeLauncher } from './concierge-launcher';
import { ConciergePanel } from './concierge-panel';
import { ConciergeProvider } from './concierge-provider';

export function ConciergeRoot({ assistantName }: { assistantName?: string }) {
  return (
    <ConciergeProvider assistantName={assistantName}>
      <ConciergeLauncher />
      <ConciergePanel />
    </ConciergeProvider>
  );
}
