'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Share an Artwork Passport (TMS-F5-006). Uses the Web Share API when the
 * browser/OS offers it (native sheet), otherwise copies the passport URL to the
 * clipboard, with an address-bar fallback message if even that is blocked. No
 * data leaves the device — this only shares the public passport link.
 */
export function PassportShare({ title }: { title: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    const shareData = { title: `${title} — Artwork Passport`, url };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or the share sheet failed — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setStatus('Passport link copied to your clipboard.');
    } catch {
      setStatus('Copy this passport link from your address bar to share it.');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-2 bg-canvas px-5 text-xs font-semibold uppercase tracking-[0.08em] text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Share2 className="size-4" aria-hidden />
        )}
        {copied ? 'Link copied' : 'Share passport'}
      </button>
      <p role="status" aria-live="polite" className="mt-2 min-h-[1.25rem] text-xs text-muted">
        {status}
      </p>
    </div>
  );
}
