'use client';

import { cn } from '@tms/ui';
import Image from 'next/image';
import { type PointerEvent, type ReactNode, useId, useRef } from 'react';

export type GarmentView = 'front' | 'back';

const GARMENT_COLOURS: Record<string, string> = {
  black: '#171717',
  white: '#f2f1ed',
  bone: '#e7e2d7',
  cream: '#e9dfc8',
  grey: '#858585',
  gray: '#858585',
  slate: '#4e5459',
  sand: '#c7aa7a',
  olive: '#62684b',
};

export function garmentColourHex(name?: string | null): string | undefined {
  return name ? GARMENT_COLOURS[name.toLowerCase()] : undefined;
}

function isDarkColour(hex: string): boolean {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return false;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 < 72;
}

export interface GarmentPrint {
  artwork: ReactNode;
  x?: number;
  y?: number;
  widthPct?: number;
  visible?: boolean;
  cropZoom?: number;
  cropX?: number;
  cropY?: number;
}

export interface GarmentPrintTransform {
  x: number;
  y: number;
  widthPct: number;
}

/**
 * Shared, asset-free layered garment renderer. The neutral SVG base is coloured
 * independently from the print, then folds, grain, highlights and seams are
 * clipped to the garment. Artwork is clipped to the approved torso area and a
 * translucent fabric layer is placed above it, preserving the artwork colours.
 */
export function ShirtMockup({
  colourHex = '#e7e2d7',
  view = 'front',
  garment = 'Classic T-shirt',
  print,
  interactive = false,
  onPrintChange,
  showPrintArea = false,
  className,
}: {
  colourHex?: string;
  view?: GarmentView;
  garment?: string;
  print?: GarmentPrint;
  interactive?: boolean;
  onPrintChange?: (transform: GarmentPrintTransform) => void;
  showPrintArea?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const oversized = garment.toLowerCase().includes('oversized');
  const longSleeve = garment.toLowerCase().includes('long');
  const body = oversized
    ? 'M105 86 C122 102 178 102 195 86 L229 94 L286 132 L260 202 L224 185 L233 342 Q150 358 67 342 L76 185 L40 202 L14 132 L71 94 Z'
    : 'M108 88 C125 103 175 103 192 88 L224 96 L280 133 L252 194 L222 179 L228 342 Q150 354 72 342 L78 179 L48 194 L20 133 L76 96 Z';
  const sleeves = longSleeve
    ? 'M76 98 L24 132 L43 286 L78 279 L84 177 M224 98 L276 132 L257 286 L222 279 L216 177'
    : null;
  const maxX = view === 'back' ? 68 : 82;
  const minX = view === 'back' ? 32 : 18;
  const printWidth = Math.min(70, Math.max(12, print?.widthPct ?? 30));
  const printX = Math.min(maxX, Math.max(minX, print?.x ?? 50));
  const printY = Math.min(80, Math.max(20, print?.y ?? (view === 'front' ? 39 : 41)));
  const photographicBase = isDarkColour(colourHex);
  const containerRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    mode: 'drag' | 'resize';
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
  } | null>(null);

  function startGesture(event: PointerEvent<HTMLElement>, mode: 'drag' | 'resize') {
    if (!interactive || !onPrintChange) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: printX,
      y: printY,
      width: printWidth,
    };
  }

  function moveGesture(event: PointerEvent<HTMLElement>) {
    const active = gesture.current;
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!active || !bounds || active.pointerId !== event.pointerId || !onPrintChange) return;
    const dx = ((event.clientX - active.startX) / bounds.width) * 100;
    const dy = ((event.clientY - active.startY) / bounds.height) * 100;
    if (active.mode === 'drag') {
      onPrintChange({
        x: Math.min(maxX, Math.max(minX, active.x + dx)),
        y: Math.min(80, Math.max(20, active.y + dy)),
        widthPct: active.width,
      });
    } else {
      onPrintChange({
        x: active.x,
        y: active.y,
        widthPct: Math.min(70, Math.max(12, active.width + Math.max(dx, dy))),
      });
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative isolate h-full w-full overflow-hidden', className)}
    >
      {photographicBase ? (
        <Image
          src={`/garments/classic-tee/${view}/base-black.png`}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain"
        />
      ) : (
        <svg viewBox="0 0 300 400" aria-hidden className="absolute inset-0 h-full w-full">
          <defs>
            <clipPath id={`${uid}-garment`}>
              <path d={body} />
            </clipPath>
            <linearGradient id={`${uid}-round`} x1="0" x2="1">
              <stop stopColor="#000" stopOpacity=".22" />
              <stop offset=".16" stopColor="#fff" stopOpacity=".05" />
              <stop offset=".48" stopColor="#fff" stopOpacity=".12" />
              <stop offset=".82" stopColor="#fff" stopOpacity=".03" />
              <stop offset="1" stopColor="#000" stopOpacity=".24" />
            </linearGradient>
            <linearGradient id={`${uid}-fall`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#fff" stopOpacity=".08" />
              <stop offset=".55" stopColor="#000" stopOpacity=".02" />
              <stop offset="1" stopColor="#000" stopOpacity=".18" />
            </linearGradient>
            <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency=".75"
                numOctaves="3"
                seed="12"
                result="noise"
              />
              <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
              <feComponentTransfer in="mono">
                <feFuncA type="table" tableValues="0 .09" />
              </feComponentTransfer>
            </filter>
          </defs>
          <ellipse
            cx="150"
            cy="353"
            rx="105"
            ry="15"
            fill="#000"
            opacity=".18"
            filter={`url(#${uid}-shadow)`}
          />
          <path d={body} fill={colourHex} />
          {longSleeve ? (
            <path
              d={sleeves ?? ''}
              fill="none"
              stroke={colourHex}
              strokeWidth="42"
              strokeLinecap="round"
            />
          ) : null}
          <g clipPath={`url(#${uid}-garment)`}>
            <rect width="300" height="400" fill={`url(#${uid}-round)`} />
            <rect width="300" height="400" fill={`url(#${uid}-fall)`} />
            <rect width="300" height="400" filter={`url(#${uid}-grain)`} opacity=".52" />
            <g fill="none" strokeLinecap="round">
              <path
                d="M92 106 C112 132 112 210 103 330 M208 106 C188 132 188 210 197 330"
                stroke="#000"
                strokeOpacity=".10"
                strokeWidth="5"
              />
              <path
                d="M126 111 C135 172 128 257 119 339 M174 111 C165 172 172 257 181 339"
                stroke="#fff"
                strokeOpacity=".08"
                strokeWidth="7"
              />
              <path
                d="M78 177 C94 167 105 158 113 143 M222 177 C206 167 195 158 187 143"
                stroke="#000"
                strokeOpacity=".17"
                strokeWidth="3"
              />
              <path
                d="M76 332 Q150 343 224 332"
                stroke="#000"
                strokeOpacity=".18"
                strokeWidth="2"
              />
            </g>
          </g>
          <path d={body} fill="none" stroke="#000" strokeOpacity=".16" strokeWidth="1.4" />
          <path
            d={
              view === 'front'
                ? 'M108 89 C121 119 179 119 192 89 C178 98 122 98 108 89Z'
                : 'M108 89 C130 103 170 103 192 89 C177 94 123 94 108 89Z'
            }
            fill="#111"
            fillOpacity=".2"
          />
          <path
            d={
              view === 'front'
                ? 'M112 91 C127 113 173 113 188 91'
                : 'M112 91 C132 101 168 101 188 91'
            }
            fill="none"
            stroke="#fff"
            strokeOpacity=".18"
            strokeWidth="2"
          />
        </svg>
      )}

      <div
        aria-hidden={!interactive}
        aria-label={
          interactive
            ? 'Artwork print. Drag to move; use arrow keys for fine positioning.'
            : undefined
        }
        tabIndex={interactive ? 0 : undefined}
        onPointerDown={(event) => startGesture(event, 'drag')}
        onPointerMove={moveGesture}
        onPointerUp={() => (gesture.current = null)}
        onPointerCancel={() => (gesture.current = null)}
        onKeyDown={(event) => {
          if (!interactive || !onPrintChange) return;
          const step = event.shiftKey ? 5 : 1;
          const delta: [number, number] | undefined = (
            {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            } as Record<string, [number, number]>
          )[event.key];
          if (!delta) return;
          event.preventDefault();
          onPrintChange({
            x: Math.min(maxX, Math.max(minX, printX + delta[0])),
            y: Math.min(80, Math.max(20, printY + delta[1])),
            widthPct: printWidth,
          });
        }}
        className={cn(
          'absolute overflow-hidden transition-all duration-300',
          showPrintArea && 'outline outline-1 outline-dashed outline-white/55',
          interactive &&
            'cursor-move touch-none transition-none outline-2 outline-offset-2 focus-visible:outline focus-visible:outline-accent-2',
        )}
        style={{
          left: `${printX}%`,
          top: `${printY}%`,
          width: `${printWidth}%`,
          aspectRatio: '4 / 5',
          transform: 'translate(-50%, -50%)',
          clipPath: 'inset(0 round 1px)',
          opacity: print?.visible === false ? 0 : 1,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${print?.cropX ?? 0}%, ${print?.cropY ?? 0}%) scale(${print?.cropZoom ?? 1})`,
            transformOrigin: 'center',
          }}
        >
          {print?.artwork}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(94deg,transparent_0,rgba(255,255,255,.035)_1px,transparent_2px,rgba(0,0,0,.025)_4px)] mix-blend-soft-light" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/5 mix-blend-multiply" />
        {interactive ? (
          <button
            type="button"
            aria-label="Resize artwork"
            onPointerDown={(event) => startGesture(event, 'resize')}
            onPointerMove={moveGesture}
            onPointerUp={() => (gesture.current = null)}
            onPointerCancel={() => (gesture.current = null)}
            onKeyDown={(event) => {
              if (
                !onPrintChange ||
                !['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)
              )
                return;
              event.preventDefault();
              const amount = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1;
              onPrintChange({
                x: printX,
                y: printY,
                widthPct: Math.min(70, Math.max(12, printWidth + amount)),
              });
            }}
            className="absolute bottom-1 right-1 size-5 cursor-nwse-resize touch-none rounded-sm border border-white bg-black/75 shadow focus-visible:outline-2 focus-visible:outline-white"
          >
            <span
              aria-hidden
              className="absolute bottom-1 right-1 size-2 border-b border-r border-white"
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
