'use client';

import { cn } from '@tms/ui';
import Image from 'next/image';
import { useId } from 'react';
import {
  GARMENT_VIEWBOX,
  GARMENTS,
  type GarmentStyle,
  type GarmentView,
  garmentStyleFromName,
  resolveColourway,
  shade,
} from '@/lib/garments/registry';
import { garmentShape } from '@/lib/garments/shapes';

export interface GarmentArtwork {
  /** Image src (e.g. /artworks/slug.jpg). */
  src: string;
  /** Which side the artwork is printed on. When it doesn't match `view`, the print is hidden. */
  area?: GarmentView;
  /**
   * Print width as a fraction (0–1) of the zone's max width. Lets the Studio honour an approved
   * scale preset; defaults to the full approved zone.
   */
  scale?: number;
  alt?: string;
}

export interface GarmentMockupProps {
  /** Catalogue garment name ("Classic T-shirt") or an explicit style. */
  garment?: string;
  style?: GarmentStyle;
  /** Colour name ("Black") or a raw hex. */
  colour?: string | null;
  view?: GarmentView;
  artwork?: GarmentArtwork | null;
  /** Sizes hint for the printed artwork's next/image. */
  sizes?: string;
  className?: string;
  /** Priority for the artwork image (above-the-fold product/studio previews). */
  priority?: boolean;
}

const { w: VB_W, h: VB_H } = GARMENT_VIEWBOX;

/**
 * The one garment renderer the whole storefront uses. It draws a realistic, recolourable SVG
 * silhouette (never a rectangle) and, when given artwork, prints it into the garment's approved
 * zone with fabric-aware shading so it reads as printed on the cloth rather than pasted on top.
 * Transparent background, so it drops onto any surface — cards, galleries, cart, Studio.
 */
export function GarmentMockup({
  garment,
  style,
  colour,
  view = 'front',
  artwork,
  sizes = '(min-width: 1024px) 33vw, 90vw',
  className,
  priority = false,
}: GarmentMockupProps) {
  const uid = useId().replace(/:/g, '');
  const resolvedStyle: GarmentStyle = style ?? garmentStyleFromName(garment);
  const shape = garmentShape(resolvedStyle, view);
  const def = GARMENTS[resolvedStyle];
  const { hex, isDark } = resolveColourway(colour);

  // Derived fabric shades — the same cloth, differently lit. Kept in the fabric's own hue so a
  // black tee's collar is a deep black and a bone tee's is a warm off-white, never flat grey.
  const seam = shade(hex, isDark ? 0.16 : -0.16);
  const collarRib = shade(hex, isDark ? 0.1 : -0.14);
  const collarEdge = shade(hex, isDark ? 0.26 : -0.26);
  const tape = shade(hex, isDark ? 0.18 : 0.14);

  // The approved print zone → a positioned box (percentages of the viewBox). Artwork is contained
  // in this box, so its own proportions are always preserved (requirement 5).
  const zone = def.print[view];
  const scale = artwork?.scale ?? 1;
  const boxW = zone.maxW * scale;
  const boxH = zone.maxH * scale;
  const printStyle = {
    left: `${((zone.cx - boxW / 2) / VB_W) * 100}%`,
    top: `${((zone.cy - boxH / 2) / VB_H) * 100}%`,
    width: `${(boxW / VB_W) * 100}%`,
    height: `${(boxH / VB_H) * 100}%`,
  };

  const showPrint = artwork && (artwork.area ?? view) === view;

  const clipId = `garment-clip-${uid}`;
  const topLightId = `garment-toplight-${uid}`;
  const chestId = `garment-chest-${uid}`;
  const shadowId = `garment-shadow-${uid}`;

  return (
    <div className={cn('relative w-full', className)} style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <path d={shape.body} />
          </clipPath>
          {/* Light from above: a soft highlight across the shoulders fading to a faint shadow at
              the hem. White/black with alpha so it reads correctly on any fabric colour. */}
          <linearGradient id={topLightId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={isDark ? 0.16 : 0.5} />
            <stop offset="0.28" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.72" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity={isDark ? 0.28 : 0.14} />
          </linearGradient>
          {/* A gentle chest highlight — the round of the body catching light. */}
          <radialGradient id={chestId} cx="0.5" cy="0.42" r="0.5">
            <stop offset="0" stopColor="#fff" stopOpacity={isDark ? 0.12 : 0.34} />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Fabric body — the flat colour, with a soft cast shadow beneath it. */}
        <path d={shape.body} fill={hex} filter={`url(#${shadowId})`} />

        {/* Everything below is clipped to the body so shading never leaks past the silhouette. */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${topLightId})`} />
          <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${chestId})`} />

          {/* Underarm / side shadows and drape folds — the fabric moving. */}
          {shape.folds.map((d, i) => (
            <path
              key={`fold-${i}`}
              d={d}
              fill="none"
              stroke="#000"
              strokeOpacity={isDark ? 0.22 : 0.09}
              strokeWidth={i < 2 ? 10 : 6}
              strokeLinecap="round"
            />
          ))}
          {/* A matching set of soft highlights just inside the folds for roundness. */}
          {shape.folds.slice(0, 2).map((d, i) => (
            <path
              key={`fold-hi-${i}`}
              d={d}
              fill="none"
              stroke="#fff"
              strokeOpacity={isDark ? 0.06 : 0.28}
              strokeWidth="2"
              strokeLinecap="round"
              transform={i === 0 ? 'translate(6 0)' : 'translate(-6 0)'}
            />
          ))}

          {/* Topstitched seams — sleeve hems, side, bottom hem. */}
          {shape.seams.map((d, i) => (
            <path
              key={`seam-${i}`}
              d={d}
              fill="none"
              stroke={seam}
              strokeWidth="1.5"
              strokeOpacity="0.8"
              strokeLinecap="round"
            />
          ))}

          {/* Long-sleeve cuffs. */}
          {shape.cuffs?.map((d, i) => (
            <path key={`cuff-${i}`} d={d} fill={collarRib} fillOpacity="0.85" />
          ))}
        </g>

        {/* Collar rib — a ribbed crew neck sitting proud of the body (drawn after the clip so its
            outer edge reads crisply). */}
        <path d={shape.collar} fill={collarRib} />
        <path
          d={shape.collar}
          fill="none"
          stroke={collarEdge}
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
        {shape.neckTape ? <path d={shape.neckTape} fill={tape} /> : null}

        {/* A crisp edge line so the silhouette holds up on light backgrounds. */}
        <path
          d={shape.body}
          fill="none"
          stroke="#000"
          strokeOpacity={isDark ? 0.35 : 0.14}
          strokeWidth="1.25"
        />
      </svg>

      {/* The print. Positioned over the approved zone, contained (never stretched), with fabric
          shading laid over it so it sinks into the cloth instead of floating above it. */}
      {showPrint ? (
        <div className="pointer-events-none absolute" style={printStyle}>
          <div className="relative h-full w-full">
            <Image
              src={artwork.src}
              alt={artwork.alt ?? ''}
              aria-hidden={!artwork.alt}
              fill
              sizes={sizes}
              priority={priority}
              className="object-contain"
              style={{
                // Light fabric: multiply melts the drawing's paper into the cloth. Dark fabric:
                // multiply would erase it, so it prints as-is and the shading below seats it.
                mixBlendMode: isDark ? 'normal' : 'multiply',
                filter: isDark ? 'none' : 'saturate(1.05)',
              }}
            />
            {/* Fabric-aware shading over the print: an overlay-blended light-to-dark wash makes the
                garment's folds and lighting appear to cross the artwork — printed, not pasted. */}
            <div
              className="absolute inset-0"
              style={{
                mixBlendMode: 'overlay',
                opacity: isDark ? 0.5 : 0.7,
                backgroundImage:
                  'linear-gradient(103deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 22%, ' +
                  'rgba(0,0,0,0) 55%, rgba(0,0,0,0.22) 100%)',
              }}
            />
            {/* A whisper of grain so the ink sits on a textured surface, not glass. */}
            <div
              className="absolute inset-0"
              style={{
                mixBlendMode: 'multiply',
                opacity: isDark ? 0.35 : 0.16,
                backgroundImage: 'radial-gradient(rgba(0,0,0,0.5) 0.5px, transparent 0.6px)',
                backgroundSize: '3px 3px',
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
