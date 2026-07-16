'use client';

import { cn } from '@tms/ui';
import { useRef, type ReactNode } from 'react';

/**
 * Signature hero treatment: a cursor-reactive 3D tilt with a moving specular
 * sheen, so the featured artwork reads like a plate you can catch the light on.
 *
 * Pointer position is written to CSS custom properties (--tms-rx/ry for the
 * tilt, --tms-gx/gy for the sheen origin); the `.tilt-plate` / `.tilt-sheen`
 * rules in theme.css do the rendering. Touch and reduced-motion users get a
 * flat, static plate (the media/CSS guards handle that), so this only ever
 * enhances — it never gates access to the art.
 */
export function HeroPlate({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const MAX_DEG = 5.5;

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    el.style.setProperty('--tms-ry', `${(px - 0.5) * 2 * MAX_DEG}deg`);
    el.style.setProperty('--tms-rx', `${-(py - 0.5) * 2 * MAX_DEG}deg`);
    el.style.setProperty('--tms-gx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--tms-gy', `${(py * 100).toFixed(1)}%`);
  }

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tms-rx', '0deg');
    el.style.setProperty('--tms-ry', '0deg');
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn('tilt-plate tilt-sheen relative rounded-[var(--radius-lg)]', className)}
    >
      {children}
    </div>
  );
}
