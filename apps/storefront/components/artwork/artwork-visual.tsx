import { cn } from '@tms/ui';

/**
 * Deterministic art-directed placeholder for an artwork "plate".
 *
 * The catalogue has no bitmap imagery yet (mock adapter, TMS-FBR-001). Rather than fake stock
 * photos, we render a distinct, gallery-like plate per artwork: a seeded duotone wash plus a
 * minimal comic-line motif and the studio catalogue mark. Same slug → same plate (stable across
 * renders and SSR/CSR). When the real image contract lands, swap the inner <svg> for the image;
 * the Frame/ratio wrapper around it stays identical, so nothing else changes.
 */

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function ArtworkVisual({
  seed,
  title,
  label,
  className,
}: {
  seed: string;
  title: string;
  /** Optional catalogue label, e.g. collection or edition. */
  label?: string;
  className?: string;
}) {
  const h = hashSeed(seed);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 60)) % 360;
  const rot = (h % 40) - 20;
  const variant = h % 3;
  const initial = title.trim().charAt(0).toUpperCase() || '·';
  const gradId = `g-${seed.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg
      viewBox="0 0 400 500"
      role="img"
      aria-label={`${title} — artwork plate`}
      preserveAspectRatio="xMidYMid slice"
      className={cn('h-full w-full', className)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${hue} 32% 90%)`} />
          <stop offset="1" stopColor={`hsl(${hue2} 28% 82%)`} />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${gradId})`} />
      <g
        transform={`rotate(${rot} 200 250)`}
        fill="none"
        stroke={`hsl(${hue} 45% 24%)`}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      >
        {variant === 0 && (
          <>
            <circle cx="200" cy="230" r="96" />
            <circle cx="200" cy="230" r="58" />
            <path d="M96 360 q104 -70 208 0" />
          </>
        )}
        {variant === 1 && (
          <>
            <path d="M70 130 L330 130 L200 400 Z" />
            <path d="M120 210 L280 210" />
            <path d="M150 280 L250 280" />
          </>
        )}
        {variant === 2 && (
          <>
            <path d="M80 400 C 140 160, 260 160, 320 400" />
            <path d="M110 400 C 150 240, 250 240, 290 400" />
            <circle cx="200" cy="150" r="34" />
          </>
        )}
      </g>
      <text
        x="200"
        y="272"
        textAnchor="middle"
        fontFamily="var(--font-display), sans-serif"
        fontSize="200"
        fontWeight="700"
        fill={`hsl(${hue} 40% 22%)`}
        opacity="0.14"
      >
        {initial}
      </text>
      {label && (
        <text
          x="24"
          y="476"
          fontFamily="var(--font-mono), monospace"
          fontSize="15"
          letterSpacing="2"
          fill={`hsl(${hue} 40% 22%)`}
          opacity="0.6"
        >
          {label.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
