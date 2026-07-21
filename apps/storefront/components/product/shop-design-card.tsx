import { Price } from '@tms/ui';
import Link from 'next/link';
import { TileBadge, TileImage } from '@/components/site/tile';
import type { ProductSummary } from '@/lib/data';

/** A studio-supplied clothing photograph that opens as a buyable product page. */
export function ShopDesignCard({
  product,
  priority = false,
}: {
  product: ProductSummary;
  priority?: boolean;
}) {
  const src = product.image ?? null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <TileImage
        src={src}
        alt={`${product.title} — product photo`}
        priority={priority}
        badge={<TileBadge>Ready to buy</TileBadge>}
      />
      <div className="mt-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
          {product.title}
        </h3>
        <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
          <p className="min-w-0 truncate text-muted">{product.garment}</p>
          <span className="shrink-0 font-display text-sm font-semibold text-ink">
            <Price amountMinor={product.priceMinor} currency={product.currency} />
          </span>
        </div>
        <p className="mt-1 text-[0.65rem] uppercase tracking-[0.08em] text-muted">
          Front &amp; back views
        </p>
        <p className="mt-2 font-semibold uppercase tracking-[0.08em] text-ink">Shop now</p>
      </div>
    </Link>
  );
}
