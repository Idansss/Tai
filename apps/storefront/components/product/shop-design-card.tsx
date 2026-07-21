import Link from 'next/link';
import { TileBadge, TileImage } from '@/components/site/tile';
import type { SuppliedShopDesign } from '@/lib/data/supplied-catalogue';

/** A supplied clothing photograph linked back to its immutable artwork canvas. */
export function ShopDesignCard({
  design,
  priority = false,
}: {
  design: SuppliedShopDesign;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/design-studio?artwork=${design.artworkSlug}`}
      className="group block rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <TileImage
        src={design.image}
        alt={`${design.title} — clothing design`}
        priority={priority}
        badge={<TileBadge>Clothing design</TileBadge>}
      />
      <div className="mt-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
          {design.title}
        </h3>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs">
          <p className="text-muted">{design.garment}</p>
          <span className="font-semibold uppercase tracking-[0.08em] text-ink">Design yours</span>
        </div>
      </div>
    </Link>
  );
}
