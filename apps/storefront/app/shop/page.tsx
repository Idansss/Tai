import { Container, EmptyState } from '@tms/ui';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product/product-card';
import { PageHeader } from '@/components/site/page-header';
import { Reveal } from '@/components/site/reveal';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Garments carrying selected artwork, ready to order.',
};

export default async function ShopPage() {
  const products = await dataProvider.listProducts();

  return (
    <Container className="py-14">
      <PageHeader
        eyebrow="Shop"
        title="The shop"
        lead="Original artwork on considered garments — hand-drawn, printed to order."
        contained={false}
      />

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="Nothing in the shop yet" description="New drops are on their way." />
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-6 lg:grid-cols-3">
          {products.map((product, i) => (
            <li key={product.id}>
              <Reveal delay={Math.min(i, 5) * 60}>
                <ProductCard product={product} />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
