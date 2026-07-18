'use client';

import { Alert, Button, EmptyState, Heading, Select, Text } from '@tms/ui';
import { Camera, ImagePlus } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import type { CommunityPhoto } from '@/lib/data';
import {
  formatHandle,
  MAX_CAPTION,
  type SubmissionFieldErrors,
  validatePhotoSubmission,
} from '@/lib/community';
import { CommunityPhotoCard } from './community-photo-card';

interface ArtworkRef {
  slug: string;
  title: string;
}

/**
 * The community gallery board (TMS-F5-005): the approved photo grid plus a
 * moderation-aware submit-a-photo form. Submissions are preview-only — no file
 * is uploaded and nothing is published; a submitted photo is shown back to the
 * customer as "In review" locally so they see it entered the queue
 * (TMS-FBR-008). Pass `fixedArtwork` to scope the form to one artwork (the
 * "styled by the community" section); otherwise a picker is shown.
 */
export function CommunityBoard({
  initialPhotos,
  artworks,
  fixedArtwork,
  emptyLabel,
}: {
  initialPhotos: CommunityPhoto[];
  artworks: ArtworkRef[];
  fixedArtwork?: ArtworkRef;
  emptyLabel: string;
}) {
  const [pending, setPending] = useState<CommunityPhoto[]>([]);

  return (
    <div>
      {initialPhotos.length > 0 ? (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {initialPhotos.map((photo) => (
            <li key={photo.id}>
              <CommunityPhotoCard photo={photo} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Camera aria-hidden />} title="No photos yet" description={emptyLabel} />
      )}

      {pending.length > 0 ? (
        <div className="mt-8">
          <Heading as={3} size="md">
            Your submissions
          </Heading>
          <Text tone="secondary" className="mt-1 text-sm">
            Shown to you only, while our team reviews them. They aren’t public yet.
          </Text>
          <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((photo) => (
              <li key={photo.id}>
                <CommunityPhotoCard photo={photo} showStatus />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SubmitPhoto
        artworks={artworks}
        fixedArtwork={fixedArtwork}
        onSubmitted={(photo) => setPending((prev) => [photo, ...prev])}
      />
    </div>
  );
}

function SubmitPhoto({
  artworks,
  fixedArtwork,
  onSubmitted,
}: {
  artworks: ArtworkRef[];
  fixedArtwork?: ArtworkRef;
  onSubmitted: (photo: CommunityPhoto) => void;
}) {
  const [handle, setHandle] = useState('');
  const [caption, setCaption] = useState('');
  const [artworkSlug, setArtworkSlug] = useState(fixedArtwork?.slug ?? artworks[0]?.slug ?? '');
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<SubmissionFieldErrors>({});
  const [done, setDone] = useState(false);
  const handleId = useId();
  const captionId = useId();
  const artworkId = useId();
  const fileId = useId();

  const selectedArtwork = useMemo(
    () => fixedArtwork ?? artworks.find((a) => a.slug === artworkSlug) ?? artworks[0],
    [fixedArtwork, artworks, artworkSlug],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validatePhotoSubmission({ handle, caption, hasPhoto: fileName !== null });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    // Preview-only: no upload, nothing published. Show it back as "In review".
    const photo: CommunityPhoto = {
      id: `local-${Date.now()}`,
      artworkSlug: selectedArtwork?.slug ?? '',
      artworkTitle: selectedArtwork?.title ?? '',
      handle: formatHandle(handle),
      caption: caption.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    onSubmitted(photo);
    setDone(true);
    setHandle('');
    setCaption('');
    setFileName(null);
  }

  return (
    <div className="mt-10 rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-6">
      <Heading as={3} size="md">
        Share your photo
      </Heading>
      <Text tone="secondary" className="mt-1 text-sm">
        Tag the piece and show us how you style it. Approved photos join the gallery.
      </Text>

      {done ? (
        <Alert tone="success" title="Thanks — your photo is in review" className="mt-4">
          <p>
            We’ve added it to your submissions above. As a preview it isn’t uploaded or published
            yet — our team reviews every photo before it appears publicly (TMS-FBR-008).
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setDone(false)}
          >
            Share another
          </Button>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {!fixedArtwork ? (
            <div>
              <label htmlFor={artworkId} className="text-sm font-medium text-ink">
                Which piece?
              </label>
              <Select
                id={artworkId}
                value={artworkSlug}
                onValueChange={setArtworkSlug}
                options={artworks.map((a) => ({ value: a.slug, label: a.title }))}
                className="mt-1 border-line"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor={handleId} className="text-sm font-medium text-ink">
              Your handle
            </label>
            <input
              id={handleId}
              type="text"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                if (errors.handle) setErrors((er) => ({ ...er, handle: undefined }));
              }}
              placeholder="@yourname"
              aria-invalid={errors.handle ? true : undefined}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            />
            {errors.handle ? (
              <p role="alert" className="mt-1 text-sm text-error">
                {errors.handle}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={captionId} className="text-sm font-medium text-ink">
              Caption
            </label>
            <input
              id={captionId}
              type="text"
              value={caption}
              maxLength={MAX_CAPTION + 20}
              onChange={(e) => {
                setCaption(e.target.value);
                if (errors.caption) setErrors((er) => ({ ...er, caption: undefined }));
              }}
              placeholder="How you styled it"
              aria-invalid={errors.caption ? true : undefined}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            />
            {errors.caption ? (
              <p role="alert" className="mt-1 text-sm text-error">
                {errors.caption}
              </p>
            ) : null}
          </div>

          <div>
            <span className="text-sm font-medium text-ink">Photo</span>
            <label
              htmlFor={fileId}
              className="mt-1 flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-dashed border-line bg-surface px-3 py-3 text-sm text-muted hover:border-accent"
            >
              <ImagePlus className="size-5 shrink-0 text-accent" aria-hidden />
              <span className="min-w-0 truncate">{fileName ?? 'Choose a photo to share'}</span>
            </label>
            <input
              id={fileId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                setFileName(e.target.files?.[0]?.name ?? null);
                if (errors.hasPhoto) setErrors((er) => ({ ...er, hasPhoto: undefined }));
              }}
            />
            {errors.hasPhoto ? (
              <p role="alert" className="mt-1 text-sm text-error">
                {errors.hasPhoto}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Submit for review</Button>
            <p className="text-xs text-muted">
              Preview — the photo isn’t uploaded or published yet, and all photos are moderated
              (TMS-FBR-008).
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
