import { Container, EmptyState, Reveal } from '@tms/ui';
import type { Metadata } from 'next';
import { PageHeading } from '@/components/site/page-heading';
import { ProductCard } from '@/components/product/product-card';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Garments carrying selected artwork, ready to order.',
};

export default async function ShopPage() {
  const products = await dataProvider.listProducts();

  return (
    <Container width="wide" className="py-14 sm:py-16">
      <PageHeading
        eyebrow="Shop"
        index={1}
        title="Ready to wear"
        titleId="shop-title"
        lead="Original artwork applied to considered garments, ready to order."
        meta={`${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}
      />

      {products.length === 0 ? (
        <div className="mt-16">
          <EmptyState title="Nothing in the shop yet" description="New drops are on their way." />
        </div>
      ) : (
        <ul
          aria-labelledby="shop-title"
          className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4"
        >
          {products.map((product, i) => (
            <Reveal as="li" key={product.id} delay={(i % 4) * 60}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </ul>
      )}
    </Container>
  );
}
