import { Container, Text } from '@tms/ui';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/site/page-header';
import { StoryCard } from '@/components/story/story-card';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Stories',
  description:
    'Shoppable notes from the studio: process, lookbooks and the ideas behind the work — with every piece a click away.',
};

export default async function StoriesPage() {
  const stories = await dataProvider.listStories();

  return (
    <Container className="py-14">
      <PageHeader
        eyebrow="Editorial"
        title="Stories"
        lead="Notes from the studio — how a drawing becomes a piece you can wear. Tap a hotspot in any story to shop the piece."
        contained={false}
      />

      {stories.length > 0 ? (
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <li key={story.slug}>
              <StoryCard story={story} />
            </li>
          ))}
        </ul>
      ) : (
        <Text tone="muted" className="mt-10">
          No stories yet — check back soon.
        </Text>
      )}
    </Container>
  );
}
