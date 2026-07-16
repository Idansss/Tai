'use client';

import { cn } from '@tms/ui';
import { Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  madeToOrderSummary,
  madeToOrderWindow,
  preOrderWindow,
  type ShipWindow,
} from '@/lib/fulfilment';

const fmt = (ms: number) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(ms));

/**
 * Made-to-order / pre-order lead-time notice (TMS-F5-003). The clock-free summary
 * renders on the server; the absolute "estimated ship" dates are computed after
 * mount so the client clock never causes a hydration mismatch. Pass
 * `preOrderReleaseMs` to frame it as a pre-order (production starts when the drop
 * opens). The real timeline is server-authoritative (TMS-FBR-008).
 */
export function MadeToOrderNote({
  preOrderReleaseMs,
  className,
}: {
  preOrderReleaseMs?: number;
  className?: string;
}) {
  const isPreOrder = preOrderReleaseMs !== undefined;
  const [window, setWindow] = useState<ShipWindow | null>(null);

  useEffect(() => {
    const now = Date.now();
    setWindow(isPreOrder ? preOrderWindow(preOrderReleaseMs, now) : madeToOrderWindow(now));
  }, [isPreOrder, preOrderReleaseMs]);

  return (
    <div
      className={cn(
        'flex gap-3 rounded-[var(--radius-md)] border border-line bg-canvas-2 p-3 text-sm',
        className,
      )}
    >
      <Package className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <div>
        <p className="text-ink">
          {isPreOrder
            ? 'Pre-order, reserved now and made to order once the drop opens.'
            : madeToOrderSummary()}
        </p>
        {window ? (
          <p className="mt-0.5 text-muted">
            Estimated ship {fmt(window.earliestMs)}–{fmt(window.latestMs)}
            {isPreOrder ? ', after the drop opens.' : '.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
