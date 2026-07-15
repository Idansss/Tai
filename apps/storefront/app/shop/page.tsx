import { Container, EmptyState, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/product/product-card';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Garments carrying selected artwork, ready to order.',
};

export default async function ShopPage() {
  const products = await dataProvider.listProducts();

  return (
    <Container className="py-14">
      <header>
        <Eyebrow>Shop</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Shop
        </Heading>
        <Text tone="secondary" className="mt-2">
          Original artwork applied to considered garments, ready to order.
        </Text>
      </header>

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="Nothing in the shop yet" description="New drops are on their way." />
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
