import type { StorefrontDataProvider } from './types';

/**
 * Real API adapter placeholder. The catalogue endpoints do not exist yet
 * (only /api/v1/health/* is published at B0). When Codex delivers
 * TMS-FBR-001, implement these against the typed `/api/v1` client and switch
 * DATA_SOURCE=api. Until then this throws so a misconfiguration fails loudly
 * rather than silently returning nothing.
 */
const notImplemented = (name: string): never => {
  throw new Error(
    `apiProvider.${name} is not implemented yet — catalogue endpoints are pending (TMS-FBR-001). Use DATA_SOURCE=mock.`,
  );
};

export const apiProvider: StorefrontDataProvider = {
  listArtworks() {
    return notImplemented('listArtworks');
  },
  getArtwork() {
    return notImplemented('getArtwork');
  },
  listCollections() {
    return notImplemented('listCollections');
  },
  searchArtworks() {
    return notImplemented('searchArtworks');
  },
};
