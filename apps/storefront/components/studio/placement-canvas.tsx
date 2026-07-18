'use client';

import { cn } from '@tms/ui';
import { Crop, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clampTransform, type PrintTransform } from '@/lib/studio';

/** The print box the customer is manipulating, in the garment's viewBox units. */
export interface PlacementBox {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  viewBoxW: number;
  viewBoxH: number;
}

interface DragState {
  mode: 'move' | 'scale' | 'rotate' | 'crop';
  /** Crop edge being dragged. */
  edge?: 'top' | 'right' | 'bottom' | 'left';
  /** The overlay's pixel rect, captured at pointer-down. */
  rect: DOMRect;
  startClientX: number;
  startClientY: number;
  /** Box centre in client px, for scale/rotate. */
  centerPx: number;
  centerPy: number;
  startDist: number;
  startAngle: number;
  start: PrintTransform;
}

const DEG = 180 / Math.PI;

/** Rotate a screen-space delta into the box's own (unrotated) axes. */
function toLocal(dx: number, dy: number, rotationDeg: number): [number, number] {
  const r = (-rotationDeg / DEG) as number;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [dx * cos - dy * sin, dx * sin + dy * cos];
}

/**
 * The interactive placement layer for the Design Studio.
 *
 * It draws no garment itself — the caller renders the <GarmentMockup> preview beneath it and drops
 * this in as an absolutely-positioned sibling overlay covering the same box. The two stay in
 * perfect register because both are positioned from the same `box` (viewBox units). Pointer drags
 * (and keyboard nudges) turn into deltas on the PrintTransform, which the parent feeds straight
 * back into the mockup.
 */
export function PlacementCanvas({
  box,
  transform,
  onChange,
  cropMode,
  disabled,
}: {
  box: PlacementBox;
  transform: PrintTransform;
  onChange: (next: PrintTransform) => void;
  cropMode: boolean;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const left = pct(box.centerX - box.width / 2, box.viewBoxW);
  const top = pct(box.centerY - box.height / 2, box.viewBoxH);
  const width = pct(box.width, box.viewBoxW);
  const height = pct(box.height, box.viewBoxH);

  const apply = useCallback(
    (next: Partial<PrintTransform>) => onChange(clampTransform({ ...transform, ...next })),
    [onChange, transform],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;

      if (d.mode === 'move') {
        apply({
          dx: d.start.dx + (dx / d.rect.width) * 100,
          dy: d.start.dy + (dy / d.rect.height) * 100,
        });
      } else if (d.mode === 'scale') {
        const dist = Math.hypot(e.clientX - d.centerPx, e.clientY - d.centerPy);
        apply({ scale: d.start.scale * (dist / (d.startDist || 1)) });
      } else if (d.mode === 'rotate') {
        const angle = Math.atan2(e.clientY - d.centerPy, e.clientX - d.centerPx) * DEG;
        apply({ rotation: d.start.rotation + (angle - d.startAngle) });
      } else if (d.mode === 'crop' && d.edge) {
        const [lx, ly] = toLocal(dx, dy, d.start.rotation);
        const boxWpx = (box.width / box.viewBoxW) * d.rect.width;
        const boxHpx = (box.height / box.viewBoxH) * d.rect.height;
        if (d.edge === 'left') apply({ cropLeft: d.start.cropLeft + lx / boxWpx });
        else if (d.edge === 'right') apply({ cropRight: d.start.cropRight - lx / boxWpx });
        else if (d.edge === 'top') apply({ cropTop: d.start.cropTop + ly / boxHpx });
        else apply({ cropBottom: d.start.cropBottom - ly / boxHpx });
      }
    },
    [apply, box.width, box.height, box.viewBoxW, box.viewBoxH],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [dragging, onPointerMove, endDrag]);

  const begin = (mode: DragState['mode'], edge?: DragState['edge']) => (e: React.PointerEvent) => {
    if (disabled) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    const centerPx = rect.left + (box.centerX / box.viewBoxW) * rect.width;
    const centerPy = rect.top + (box.centerY / box.viewBoxH) * rect.height;
    dragRef.current = {
      mode,
      edge,
      rect,
      startClientX: e.clientX,
      startClientY: e.clientY,
      centerPx,
      centerPy,
      startDist: Math.hypot(e.clientX - centerPx, e.clientY - centerPy),
      startAngle: Math.atan2(e.clientY - centerPy, e.clientX - centerPx) * DEG,
      start: transform,
    };
    setDragging(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const step = e.shiftKey ? 4 : 1;
    switch (e.key) {
      case 'ArrowLeft':
        apply({ dx: transform.dx - step });
        break;
      case 'ArrowRight':
        apply({ dx: transform.dx + step });
        break;
      case 'ArrowUp':
        apply({ dy: transform.dy - step });
        break;
      case 'ArrowDown':
        apply({ dy: transform.dy + step });
        break;
      case '+':
      case '=':
        apply({ scale: transform.scale + 0.05 });
        break;
      case '-':
      case '_':
        apply({ scale: transform.scale - 0.05 });
        break;
      case '[':
        apply({ rotation: transform.rotation - 5 });
        break;
      case ']':
        apply({ rotation: transform.rotation + 5 });
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const handleClass =
    'absolute z-10 size-3.5 rounded-full border-2 border-white bg-[var(--color-accent-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.4)]';

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0">
      {!disabled ? (
        <div
          role="group"
          aria-label="Artwork placement — drag to move, use the handles to resize, rotate or crop; arrow keys nudge"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={begin('move')}
          className={cn(
            'pointer-events-auto absolute cursor-move touch-none rounded-[1px] outline-none',
            'ring-1 ring-[var(--color-accent-primary)]/70',
            'focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]',
            dragging && 'ring-2',
          )}
          style={{ left, top, width, height, transform: `rotate(${transform.rotation}deg)` }}
        >
          {cropMode ? (
            /* Crop mode: inward-dragging edge handles trim the print. */
            <>
              <span
                onPointerDown={begin('crop', 'top')}
                className={cn(
                  handleClass,
                  'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
                )}
              />
              <span
                onPointerDown={begin('crop', 'bottom')}
                className={cn(
                  handleClass,
                  'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
                )}
              />
              <span
                onPointerDown={begin('crop', 'left')}
                className={cn(
                  handleClass,
                  'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
                )}
              />
              <span
                onPointerDown={begin('crop', 'right')}
                className={cn(
                  handleClass,
                  'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 cursor-ew-resize',
                )}
              />
              {/* Rule-of-thirds guides while cropping. */}
              <span aria-hidden className="pointer-events-none absolute inset-0">
                <span className="absolute left-1/3 top-0 h-full w-px bg-white/40" />
                <span className="absolute left-2/3 top-0 h-full w-px bg-white/40" />
                <span className="absolute left-0 top-1/3 h-px w-full bg-white/40" />
                <span className="absolute left-0 top-2/3 h-px w-full bg-white/40" />
              </span>
            </>
          ) : (
            /* Transform mode: corner resize handles + a rotate handle on a stalk above. */
            <>
              <span
                onPointerDown={begin('scale')}
                className={cn(
                  handleClass,
                  'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
                )}
              />
              <span
                onPointerDown={begin('scale')}
                className={cn(
                  handleClass,
                  'right-0 top-0 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize',
                )}
              />
              <span
                onPointerDown={begin('scale')}
                className={cn(
                  handleClass,
                  'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
                )}
              />
              <span
                onPointerDown={begin('scale')}
                className={cn(
                  handleClass,
                  'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
                )}
              />
              <span
                aria-hidden
                className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 -translate-y-full bg-[var(--color-accent-primary)]/70"
              />
              <span
                onPointerDown={begin('rotate')}
                title="Rotate"
                className={cn(
                  handleClass,
                  'left-1/2 top-0 grid size-5 -translate-x-1/2 -translate-y-[150%] cursor-grab place-items-center',
                )}
              >
                <RotateCw className="size-3 text-white" aria-hidden />
              </span>
            </>
          )}

          {/* Mode badge in the corner of the box. */}
          <span className="absolute -top-6 left-0 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
            {cropMode ? (
              <>
                <Crop className="size-3" aria-hidden /> Crop
              </>
            ) : (
              'Move · resize · rotate'
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}
