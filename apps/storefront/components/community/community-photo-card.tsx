import { Badge, Frame } from '@tms/ui';
import Link from 'next/link';
import { ArtworkVisual } from '@/components/artwork/artwork-visual';
import { moderationLabel, moderationTone } from '@/lib/community';
import type { CommunityPhoto } from '@/lib/data';

/**
 * A single community photo tile (TMS-F5-005). Placeholder imagery (no real
 * uploads yet). Pass `showStatus` to surface the moderation badge, used only
 * for the submitter's own in-review preview, never for the public feed.
 */
export function CommunityPhotoCard({
  photo,
  showStatus = false,
}: {
  photo: CommunityPhoto;
  showStatus?: boolean;
}) {
  return (
    <div>
      <Frame ratio="square" mat="canvas" role="img" aria-label={`Community photo by ${photo.handle}`}>
        <ArtworkVisual seed={`community-${photo.id}`} title={photo.artworkTitle} label={photo.handle} />
        {showStatus ? (
          <span className="absolute left-3 top-3">
            <Badge tone={moderationTone(photo.status)}>{moderationLabel(photo.status)}</Badge>
          </span>
        ) : null}
      </Frame>
      <div className="mt-3 space-y-1">
        <p className="text-sm font-medium text-ink">{photo.handle}</p>
        <p className="text-sm text-muted">{photo.caption}</p>
        <Link
          href={`/artworks/${photo.artworkSlug}`}
          className="inline-block rounded-sm font-mono text-xs uppercase tracking-[0.08em] text-accent-2 underline underline-offset-2 transition-colors hover:text-ink"
        >
          {photo.artworkTitle}
        </Link>
      </div>
    </div>
  );
}
