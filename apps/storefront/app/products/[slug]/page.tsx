import { Container } from '@tms/ui';
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
    <Container className="py-10 pb-24 sm:pb-14">
      <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.08em] text-muted">
        <Link href="/shop" className="rounded-sm hover:text-ink">
          Shop
        </Link>
        <span aria-hidden> / </span>
        <span className="text-ink-2">{product.title}</span>
      </nav>

      <header className="mt-6">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {product.garment}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl">
          {product.title}
        </h1>
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

      <div className="mt-14">
        <Reviews targetType="product" targetLabel={product.title} initial={reviews} />
      </div>
    </Container>
  );
}
