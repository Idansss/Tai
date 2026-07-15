import { Container, Eyebrow, Heading, Text } from '@tms/ui';
import type { Metadata } from 'next';
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
    <Container className="py-10">
      <div className="max-w-2xl">
        <Eyebrow>Editorial</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Stories
        </Heading>
        <Text size="lg" tone="secondary" className="mt-3">
          Notes from the studio — how a drawing becomes a piece you can wear, and how we style each
          release. Tap a hotspot in any story to shop the piece.
        </Text>
      </div>

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
