'use client';

import { useEffect, useState } from 'react';
import { countdownLabel, countdownParts } from '@/lib/drops';

interface CountdownProps {
  /** Target epoch ms to count down to. */
  target: number;
  /** What the countdown is for, e.g. "Drop opens". */
  label: string;
  /** Called once the target is reached, so the parent can refresh state. */
  onComplete?: () => void;
  size?: 'sm' | 'lg';
}

const UNITS: { key: 'days' | 'hours' | 'minutes' | 'seconds'; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Mins' },
  { key: 'seconds', label: 'Secs' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A live drop countdown. The ticking digits are `aria-hidden`; a `role="timer"`
 * element carries an accessible summary so a screen reader gets a stable,
 * non-spammy label. Digits render only after mount to avoid a hydration
 * mismatch (server clock ≠ client clock). No animation library, reduced-motion
 * safe by construction.
 */
export function Countdown({ target, label, onComplete, size = 'sm' }: CountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = now === null ? null : target - now;

  useEffect(() => {
    if (remaining !== null && remaining <= 0) onComplete?.();
  }, [remaining, onComplete]);

  const parts = countdownParts(remaining ?? 0);
  const digitClass = size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-xl';

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.08em] text-muted">{label}</p>
      <div
        className="mt-1.5 flex items-start gap-2 tabular-nums"
        role="timer"
        aria-label={
          remaining === null
            ? `${label}, loading countdown`
            : remaining <= 0
              ? `${label} now`
              : `${label} in ${countdownLabel(remaining)}`
        }
      >
        {UNITS.map((unit, i) => (
          <div key={unit.key} className="flex items-start gap-2" aria-hidden>
            <div className="flex flex-col items-center">
              <span className={`font-semibold text-ink ${digitClass}`}>
                {now === null ? '––' : pad(parts[unit.key])}
              </span>
              <span className="text-[0.625rem] uppercase tracking-[0.08em] text-muted">
                {unit.label}
              </span>
            </div>
            {i < UNITS.length - 1 ? (
              <span className={`font-semibold text-line ${digitClass}`}>:</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
