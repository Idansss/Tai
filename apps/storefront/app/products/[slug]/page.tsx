import { Container, Eyebrow, Heading } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductConfigurator } from '@/components/product/product-configurator';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await dataProvider.getProduct(slug);
  if (!product) notFound();
  return {
    title: product.title,
    description: product.description,
    openGraph: { title: product.title, description: product.description },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await dataProvider.getProduct(slug);
  if (!product) notFound();

  return (
    <Container className="py-10 pb-24 sm:pb-14">
      <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.08em] text-muted">
        <Link href="/shop" className="rounded-sm hover:text-ink">
          Shop
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">{product.title}</span>
      </nav>

      <header className="mt-6">
        <Eyebrow>{product.garment}</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          {product.artworkTitle}
        </Heading>
        <p className="mt-2 text-sm text-muted">
          From the{' '}
          <Link
            href={`/artworks/${product.artworkSlug}`}
            className="rounded-sm text-accent underline underline-offset-2 hover:text-ink"
          >
            {product.artworkTitle}
          </Link>{' '}
          artwork · {product.collection}
        </p>
      </header>

      <div className="mt-8">
        <ProductConfigurator product={product} />
      </div>
    </Container>
  );
}
