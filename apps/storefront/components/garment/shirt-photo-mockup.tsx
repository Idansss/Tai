'use client';

import { cn } from '@tms/ui';
import Image from 'next/image';
import { GarmentMockup, type GarmentMockupProps } from '@/components/garment/garment-mockup';
import { GARMENT_VIEWBOX } from '@/lib/garments/registry';
import { photoForView, resolvePhotoColour } from '@/lib/garments/photo-mockups';

const { w: VB_W, h: VB_H } = GARMENT_VIEWBOX;

export interface ShirtPhotoMockupProps extends GarmentMockupProps {
  /** Sizes hint for the shirt photograph's next/image (defaults to the Studio preview column). */
  photoSizes?: string;
}

/**
 * The Design Studio garment preview: a real short-sleeve shirt *photograph* as the cloth, with the
 * selected artwork printed on top by the shared <GarmentMockup> print layer (renderBody=false) in
 * the same 400×460 coordinate space the PlacementCanvas uses — so drag / scale / rotate / crop /
 * reset and the cart & save payloads behave exactly as they do in every other garment context.
 *
 * The colour is chosen by picking the matching photograph (photo-mockups.ts); the cloth is never
 * hue-recoloured. Front/back switches to the actually photographed side. A deterministic 400:460
 * box means no layout shift when the colour or side changes, and only the active side's photo is
 * eagerly loaded.
 */
export function ShirtPhotoMockup({
  photoSizes = '(min-width: 1024px) 40vw, 90vw',
  ...props
}: ShirtPhotoMockupProps) {
  const view = props.view ?? 'front';
  const colour = resolvePhotoColour(props.colour);
  const src = photoForView(colour, view);

  const sideLabel = view === 'back' ? 'back' : 'front';
  const alt = colour.exact
    ? `${colour.label} shirt, ${sideLabel} view`
    : `Shirt shown in ${colour.label} (closest available colour), ${sideLabel} view`;

  return (
    <div
      className={cn('relative w-full', props.className)}
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
    >
      {/* The photographed cloth. Asset is already 400:460, so object-cover fills without cropping
          or distortion, and the fixed aspect ratio prevents any layout shift between colours/sides. */}
      <Image
        key={src}
        src={src}
        alt={alt}
        fill
        sizes={photoSizes}
        priority={props.priority}
        className="object-cover"
      />
      {/* Print only — the photo below is the garment. Same viewBox space as the PlacementCanvas.
          `colour` is handed the fabric mid-tone so the print's dark/light blend matches the photo. */}
      <div className="pointer-events-none absolute inset-0">
        <GarmentMockup {...props} colour={colour.hex} className={undefined} renderBody={false} />
      </div>
    </div>
  );
}
