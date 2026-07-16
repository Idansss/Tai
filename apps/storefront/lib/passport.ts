/**
 * Pure domain logic for the Artwork Passport (TMS-F5-006) — authenticity &
 * provenance for a specific artwork *version*. Everything here is a pure,
 * deterministic function of the artwork's stable content, so the "immutable
 * version id" is reproducible and unit-testable. The real version id + a
 * per-piece serial ledger are server-authoritative once TMS-FBR-001 lands; the
 * client never mints authenticity it cannot prove.
 */

/** 32-bit FNV-1a hash of a string. Deterministic and dependency-free. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // Multiply by the 32-bit FNV prime, kept in the unsigned 32-bit range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Last four hex digits of a 32-bit number, upper-cased and zero-padded. */
const group = (n: number): string => n.toString(16).toUpperCase().padStart(4, '0').slice(-4);

export interface VersionIdInput {
  slug: string;
  edition: string;
  release: string;
}

/**
 * Immutable, content-addressed version id for an artwork release. Same content
 * → same id; any change to an identifying field yields a new id (a new
 * "version"). Formatted `AP-XXXX-XXXX` for a passport-like read.
 */
export function artworkVersionId(input: VersionIdInput): string {
  const seed = `${input.slug}|${input.edition}|${input.release}`;
  const high = fnv1a(seed);
  const low = fnv1a(`${seed}|${high.toString(16)}`);
  return `AP-${group(high)}-${group(low)}`;
}

/**
 * A formatted edition serial, e.g. `No. 007 / 100`. The number is zero-padded to
 * the width of the run size so serials line up. Illustrative only — the real
 * serial is assigned to a piece at purchase (TMS-FBR-001).
 */
export function passportSerial(index: number, editionSize: number): string {
  const width = String(editionSize).length;
  return `No. ${String(index).padStart(width, '0')} / ${editionSize}`;
}
