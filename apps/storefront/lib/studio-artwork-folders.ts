import type { ArtworkSummary } from './data/types';

/**
 * Design Studio groups the full Collections catalogue into two folders so the
 * artwork picker stays scannable as the wall grows.
 */
export interface StudioArtworkFolder {
  id: 'signature' | 'studio-collections';
  label: string;
  hint: string;
  /** Matches `ArtworkSummary.collection`. */
  collections: readonly string[];
}

export const STUDIO_ARTWORK_FOLDERS: readonly StudioArtworkFolder[] = [
  {
    id: 'signature',
    label: 'Signature gallery',
    hint: 'Night Studies, Comic Line, Season Sketches, City Portraits',
    collections: ['Night Studies', 'Comic Line', 'Season Sketches', 'City Portraits'],
  },
  {
    id: 'studio-collections',
    label: 'Studio collections',
    hint: 'Africa United, Resilience, Studio Muses',
    collections: ['Africa United', 'Resilience', 'Studio Muses'],
  },
] as const;

export interface StudioArtworkFolderGroup {
  folder: StudioArtworkFolder;
  artworks: ArtworkSummary[];
}

/** Split the catalogue into the two studio folders; leftovers join Signature. */
export function groupArtworksForStudio(artworks: ArtworkSummary[]): StudioArtworkFolderGroup[] {
  const buckets = new Map<StudioArtworkFolder['id'], ArtworkSummary[]>(
    STUDIO_ARTWORK_FOLDERS.map((folder) => [folder.id, []]),
  );

  for (const artwork of artworks) {
    const match =
      STUDIO_ARTWORK_FOLDERS.find((folder) => folder.collections.includes(artwork.collection)) ??
      STUDIO_ARTWORK_FOLDERS[0]!;
    buckets.get(match.id)!.push(artwork);
  }

  return STUDIO_ARTWORK_FOLDERS.map((folder) => ({
    folder,
    artworks: buckets.get(folder.id) ?? [],
  })).filter((group) => group.artworks.length > 0);
}

/** Which folder should open first given a selected (or deep-linked) artwork. */
export function defaultOpenStudioFolderId(
  groups: StudioArtworkFolderGroup[],
  selectedSlug: string | null,
): StudioArtworkFolder['id'] {
  if (selectedSlug) {
    const hit = groups.find((group) => group.artworks.some((a) => a.slug === selectedSlug));
    if (hit) return hit.folder.id;
  }
  return groups[0]?.folder.id ?? 'signature';
}
