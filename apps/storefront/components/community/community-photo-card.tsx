import { Badge, Card } from '@tms/ui';
import Link from 'next/link';
import type { CommunityPhoto } from '@/lib/data';
import { moderationLabel, moderationTone } from '@/lib/community';

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
    <Card variant="surface" padded={false} className="overflow-hidden">
      <div
        className="relative aspect-square w-full bg-gradient-to-br from-canvas-2 to-surface-2"
        role="img"
        aria-label={`Community photo by ${photo.handle}, placeholder`}
      >
        {showStatus ? (
          <span className="absolute left-3 top-3">
            <Badge tone={moderationTone(photo.status)}>{moderationLabel(photo.status)}</Badge>
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-sm font-medium text-ink">{photo.handle}</p>
        <p className="text-sm text-muted">{photo.caption}</p>
        <Link
          href={`/artworks/${photo.artworkSlug}`}
          className="inline-block rounded-sm text-xs text-accent underline underline-offset-2 hover:text-ink"
        >
          {photo.artworkTitle}
        </Link>
      </div>
    </Card>
  );
}
