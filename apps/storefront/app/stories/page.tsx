import { Container, Reveal, Text } from '@tms/ui';
import type { Metadata } from 'next';
import { PageHeading } from '@/components/site/page-heading';
import { StoryCard } from '@/components/story/story-card';
import { dataProvider } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Stories',
  description:
    'Shoppable notes from the studio: process, lookbooks and the ideas behind the work, with every piece a click away.',
};

export default async function StoriesPage() {
  const stories = await dataProvider.listStories();

  return (
    <Container width="wide" className="py-14 sm:py-16">
      <PageHeading
        eyebrow="Editorial"
        index={1}
        title="Stories"
        titleId="stories-title"
        lead="Notes from the studio: how a drawing becomes a piece you can wear, and how we style each release. Tap a hotspot in any story to shop the piece."
        meta={`${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`}
      />

      {stories.length > 0 ? (
        <ul
          aria-labelledby="stories-title"
          className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
        >
          {stories.map((story, i) => (
            <Reveal as="li" key={story.slug} delay={(i % 3) * 70}>
              <StoryCard story={story} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <Text tone="muted" className="mt-12">
          No stories yet, check back soon.
        </Text>
      )}
    </Container>
  );
}
