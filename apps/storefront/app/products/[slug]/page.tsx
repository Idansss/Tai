import { Container, Eyebrow, Heading } from '@tms/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductConfigurator } from '@/components/product/product-configurator';
import { Reviews } from '@/components/review/reviews';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
}

// Finite, enumerable catalogue: statically generate every product page and
// reject anything else. `dynamicParams = false` makes an unknown slug a genuine
// 404 (fallback:false → real 404 status on static/CDN hosting), which is the
// idiomatic Next fix for the soft-404 tracked as TMS-F1-DEF-001. When the
// product API lands (TMS-FBR-002), enumerate from it here; switch to ISR only
// if slugs must resolve without a rebuild.
export const dynamicParams = false;

export async function generateStaticParams() {
  const products = await dataProvider.listProducts();
  return products.map((product) => ({ slug: product.slug }));
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
  const reviews = await dataProvider.getReviews('product', slug);

  return (
    <Container width="wide" className="py-10 pb-24 sm:pb-14 sm:pt-12">
      <nav
        aria-label="Breadcrumb"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted"
      >
        <Link href="/shop" className="rounded-sm transition-colors hover:text-ink">
          Shop
        </Link>
        <span aria-hidden className="px-2 text-line-2">
          /
        </span>
        <span className="text-ink-2">{product.title}</span>
      </nav>

      <header className="mt-6">
        <Eyebrow>{product.garment}</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          {product.artworkTitle}
        </Heading>
        <p className="mt-3 text-sm text-muted">
          From the{' '}
          <Link
            href={`/artworks/${product.artworkSlug}`}
            className="rounded-sm text-accent-2 underline underline-offset-2 transition-colors hover:text-ink"
          >
            {product.artworkTitle}
          </Link>{' '}
          artwork · {product.collection}
        </p>
      </header>

      <div className="mt-10">
        <ProductConfigurator product={product} />
      </div>

      <div className="mt-16">
        <Reviews targetType="product" targetLabel={product.title} initial={reviews} />
      </div>
    </Container>
  );
}
