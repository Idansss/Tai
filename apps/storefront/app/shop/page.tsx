import { Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product/product-card';
import { ShopDesignCard } from '@/components/product/shop-design-card';
import { PageHeader } from '@/components/site/page-header';
import { Reveal } from '@/components/site/reveal';
import { dataProvider } from '@/lib/data';
import { suppliedShopDesigns } from '@/lib/data/supplied-catalogue';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Garments carrying selected artwork, ready to order.',
};

export default async function ShopPage() {
  const products = await dataProvider.listProducts();
  const designSlugs = new Set(suppliedShopDesigns.map((d) => d.slug));
  const clothingDesigns = products.filter((p) => designSlugs.has(p.slug));
  const availablePieces = products.filter((p) => !designSlugs.has(p.slug));

  return (
    <Container className="py-14">
      <PageHeader
        eyebrow="Shop"
        title="The shop"
        lead="Ready-to-order tees and garments — pick a piece, choose your size, and add it to your bag."
        contained={false}
      />

      <section className="mt-10" aria-labelledby="clothing-designs-title">
        <h2
          id="clothing-designs-title"
          className="font-display text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl"
        >
          Clothing designs
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Studio-supplied shirts you can buy as-is — open a piece to choose size, add to bag, and
          leave a review.
        </p>
        {clothingDesigns.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No clothing designs yet"
              description="New shirts are on their way."
            />
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-6 lg:grid-cols-4">
            {clothingDesigns.map((product, i) => (
              <li key={product.id}>
                <Reveal delay={Math.min(i, 3) * 60}>
                  <ShopDesignCard product={product} priority={i < 2} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>

      {availablePieces.length === 0 ? null : (
        <section className="mt-16 border-t border-line pt-12" aria-labelledby="available-title">
          <h2
            id="available-title"
            className="font-display text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl"
          >
            Available pieces
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-6 lg:grid-cols-3">
            {availablePieces.map((product, i) => (
              <li key={product.id}>
                <Reveal delay={Math.min(i, 5) * 60}>
                  <ProductCard product={product} />
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
