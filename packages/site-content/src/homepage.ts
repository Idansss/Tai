import type { HomepageSection } from '../generated/client/client.js';
import { recordAudit, type AuditActor } from './audit.js';
import type { SiteContentClient } from './client.js';
import { ValidationError } from './errors.js';

/**
 * Editable homepage sections. The hero and the "studio" band are stored as one
 * record each (keyed `hero` / `studio`), with their content in the `body` JSON.
 * The storefront falls back to DEFAULTS below when a section isn't published, so
 * the page renders identically until an admin customises it.
 */
export type HomepageKey = 'hero' | 'studio';
export const HOMEPAGE_KEYS: HomepageKey[] = ['hero', 'studio'];

export interface HeroContent {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  titleTail: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  imageUrl: string;
  imageCaption: string;
  imageTitle: string;
  imageHref: string;
}

export interface StudioContent {
  eyebrow: string;
  headingLine1: string;
  headingLine2: string;
  body: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  imageUrl: string;
}

export type HomepageContent = { hero: HeroContent; studio: StudioContent };

export const DEFAULT_HERO: HeroContent = {
  eyebrow: 'Independent art-fashion studio · Heritage in every line',
  titleLead: 'From ',
  titleAccent: 'Africa',
  titleTail: ', to you.',
  subtitle:
    'Original illustration rooted in African heritage — Nigeria, Ghana, Ethiopia, Kenya and beyond — drawn by hand and printed on considered garments. Explore the gallery, then step into the studio to make a piece your own.',
  primaryCtaLabel: 'Explore artworks',
  primaryCtaHref: '/artworks',
  secondaryCtaLabel: 'Open Design Studio',
  secondaryCtaHref: '/design-studio',
  imageUrl: '/artworks/midnight-in-lagos.jpg',
  imageCaption: 'Featured · Night Studies',
  imageTitle: 'Midnight in Lagos',
  imageHref: '/artworks/midnight-in-lagos',
};

export const DEFAULT_STUDIO: StudioContent = {
  eyebrow: 'The studio',
  headingLine1: 'Drawn by hand.',
  headingLine2: 'Rooted in heritage.',
  body: 'Every piece begins as ink and colour on paper — Adinkra symbols, market scenes, portraits of the diaspora. We print on considered garments so the linework keeps its weight and the colour reads the way it was drawn. No mass runs, no filler, nothing that gets in the way of the work.',
  primaryCtaLabel: 'The studio story',
  primaryCtaHref: '/about',
  secondaryCtaLabel: 'Browse collections',
  secondaryCtaHref: '/collections',
  imageUrl: '/artworks/flags-trio.jpg',
};

function defaultFor(key: HomepageKey): HeroContent | StudioContent {
  return key === 'hero' ? DEFAULT_HERO : DEFAULT_STUDIO;
}

/** Coerce/merge an untrusted body onto the section defaults (drops unknown keys). */
export function normaliseHomepageContent(
  key: HomepageKey,
  body: unknown,
): HeroContent | StudioContent {
  const base = defaultFor(key);
  const input = (body ?? {}) as Record<string, unknown>;
  const merged = { ...base } as Record<string, string>;
  for (const field of Object.keys(base)) {
    const value = input[field];
    if (typeof value === 'string') merged[field] = value;
  }
  return merged as unknown as HeroContent | StudioContent;
}

function validate(key: HomepageKey, content: HeroContent | StudioContent): void {
  const fieldErrors: Record<string, string> = {};
  const requireField = (field: string, label: string) => {
    if (!(content as unknown as Record<string, string>)[field]?.trim()) {
      fieldErrors[field] = `${label} is required.`;
    }
  };
  const checkHref = (field: string) => {
    const v = (content as unknown as Record<string, string>)[field];
    if (v && !/^(https?:\/\/|\/)/.test(v.trim())) {
      fieldErrors[field] = 'Use an absolute URL or a site path starting with "/".';
    }
  };
  if (key === 'hero') {
    requireField('titleAccent', 'Title (accent word)');
    requireField('subtitle', 'Subtitle');
    requireField('imageUrl', 'Featured image');
    ['primaryCtaHref', 'secondaryCtaHref', 'imageUrl', 'imageHref'].forEach(checkHref);
  } else {
    requireField('headingLine1', 'Heading');
    requireField('body', 'Body');
    requireField('imageUrl', 'Image');
    ['primaryCtaHref', 'secondaryCtaHref', 'imageUrl'].forEach(checkHref);
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('Homepage section is invalid.', fieldErrors);
  }
}

export async function getHomepageSection(
  client: SiteContentClient,
  key: HomepageKey,
): Promise<HomepageSection | null> {
  return client.homepageSection.findFirst({ where: { key, deletedAt: null } });
}

/** Content the admin edits: published body if present, else section defaults. */
export async function getHomepageEditable(
  client: SiteContentClient,
  key: HomepageKey,
): Promise<{ content: HeroContent | StudioContent; status: string; exists: boolean }> {
  const row = await getHomepageSection(client, key);
  return {
    content: normaliseHomepageContent(key, row?.body ?? null),
    status: row?.status ?? 'DRAFT',
    exists: Boolean(row),
  };
}

/** What the storefront renders: published content, or the defaults. */
export async function getPublishedHomepageContent(
  client: SiteContentClient,
  key: 'hero',
): Promise<HeroContent>;
export async function getPublishedHomepageContent(
  client: SiteContentClient,
  key: 'studio',
): Promise<StudioContent>;
export async function getPublishedHomepageContent(
  client: SiteContentClient,
  key: HomepageKey,
): Promise<HeroContent | StudioContent> {
  const row = await getHomepageSection(client, key);
  if (!row || row.status !== 'PUBLISHED') {
    return defaultFor(key);
  }
  return normaliseHomepageContent(key, row.body);
}

export async function saveHomepageSection(
  client: SiteContentClient,
  key: HomepageKey,
  body: unknown,
  actor: AuditActor,
  publish = false,
): Promise<HomepageSection> {
  const content = normaliseHomepageContent(key, body);
  validate(key, content);
  const before = await getHomepageSection(client, key);
  const data = {
    key,
    type: key,
    title: key === 'hero' ? 'Homepage hero' : 'Studio band',
    body: content as unknown as object,
    mediaUrl: (content as { imageUrl?: string }).imageUrl ?? null,
    status: publish ? ('PUBLISHED' as const) : (before?.status ?? ('DRAFT' as const)),
    publishedAt: publish ? (before?.publishedAt ?? new Date()) : (before?.publishedAt ?? null),
    updatedById: actor.id,
  };
  const saved = await client.homepageSection.upsert({
    where: { key },
    create: { ...data, createdById: actor.id },
    update: data,
  });
  await recordAudit(client, {
    actor,
    action: publish ? 'homepage.publish' : 'homepage.save',
    resourceType: 'homepage_section',
    resourceId: key,
    summary: `${publish ? 'Published' : 'Saved'} homepage "${key}" section`,
    before,
    after: saved,
  });
  return saved;
}

export async function setHomepageStatus(
  client: SiteContentClient,
  key: HomepageKey,
  status: 'PUBLISHED' | 'DRAFT',
  actor: AuditActor,
): Promise<HomepageSection> {
  const before = await getHomepageSection(client, key);
  if (!before) {
    throw new ValidationError('Save the section before changing its status.');
  }
  const saved = await client.homepageSection.update({
    where: { key },
    data: {
      status,
      publishedAt: status === 'PUBLISHED' ? (before.publishedAt ?? new Date()) : before.publishedAt,
      updatedById: actor.id,
    },
  });
  await recordAudit(client, {
    actor,
    action: status === 'PUBLISHED' ? 'homepage.publish' : 'homepage.unpublish',
    resourceType: 'homepage_section',
    resourceId: key,
    summary: `Set homepage "${key}" to ${status.toLowerCase()}`,
    before,
    after: saved,
  });
  return saved;
}
