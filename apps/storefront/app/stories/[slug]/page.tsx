import { buttonVariants, Container, Eyebrow, Heading, Text } from '@tms/ui';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShoppableScene } from '@/components/story/shoppable-scene';
import { dataProvider } from '@/lib/data';

interface Params {
  params: Promise<{ slug: string }>;
}

// Stories are a finite, enumerable set, so, like the catalogue detail routes -
// every page is statically generated and an unknown slug is a genuine
// routing-layer 404 (TMS-F1-DEF-001). A real CMS feed would enumerate here.
export const dynamicParams = false;

export async function generateStaticParams() {
  const stories = await dataProvider.listStories();
  return stories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const story = await dataProvider.getStory(slug);
  if (!story) notFound();
  return {
    title: story.title,
    description: story.excerpt,
    openGraph: { title: story.title, description: story.excerpt },
  };
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  );

export default async function StoryDetailPage({ params }: Params) {
  const { slug } = await params;
  const story = await dataProvider.getStory(slug);
  if (!story) notFound();

  return (
    <Container width="wide" className="py-10 sm:py-12">
      <nav
        aria-label="Breadcrumb"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted"
      >
        <Link href="/stories" className="rounded-sm transition-colors hover:text-ink">
          Stories
        </Link>
        <span aria-hidden className="px-2 text-line-2">
          /
        </span>
        <span className="text-ink-2">{story.title}</span>
      </nav>

      <article className="mx-auto mt-8 max-w-2xl">
        <header>
          <Eyebrow>{story.category}</Eyebrow>
          <Heading as={1} size="display-lg" className="mt-3">
            {story.title}
          </Heading>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.1em] text-muted">
            <span>{fmtDate(story.publishedOn)}</span>
            <span aria-hidden>·</span>
            <span>{story.readMinutes} min read</span>
            {story.shoppableCount > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag className="size-4 text-accent-2" aria-hidden />
                  {story.shoppableCount} shoppable {story.shoppableCount === 1 ? 'piece' : 'pieces'}
                </span>
              </>
            ) : null}
          </div>
          <Text size="lg" tone="secondary" className="mt-6">
            {story.intro}
          </Text>
        </header>

        <div className="mt-8">
          {story.blocks.map((block, index) => {
            if (block.kind === 'heading') {
              return (
                <Heading key={index} as={2} size="md" className="mt-8">
                  {block.text}
                </Heading>
              );
            }
            if (block.kind === 'paragraph') {
              return (
                <Text key={index} tone="secondary" className="mt-4">
                  {block.text}
                </Text>
              );
            }
            return <ShoppableScene key={block.scene.id} scene={block.scene} />;
          })}
        </div>

        <footer className="mt-10 border-t border-line pt-6">
          <Link href="/stories" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
            <ArrowLeft className="size-4" aria-hidden /> All stories
          </Link>
        </footer>
      </article>
    </Container>
  );
}
