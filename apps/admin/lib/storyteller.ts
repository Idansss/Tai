/**
 * Brand Storyteller — admin AI draft generation, mock generator (TMS-F5-009).
 * A deterministic, pure stand-in for the real generation endpoint
 * (TMS-FBR-009). The hard rule: this **never publishes**. It produces draft
 * variants with generation metadata; a human selects, edits, and approves a
 * draft, and even an approved draft is only ever a saved *draft* here — going
 * live is a separate, human, publish action elsewhere.
 */

export type SourceKind = 'artwork' | 'collection';

export type ContentType =
  'product_description' | 'social_caption' | 'collection_intro' | 'email_teaser';

export const CONTENT_TYPES: { id: ContentType; label: string; description: string }[] = [
  {
    id: 'product_description',
    label: 'Product description',
    description: 'A short, on-brand description for a product page.',
  },
  {
    id: 'social_caption',
    label: 'Social caption',
    description: 'A punchy caption for social, with a light call to action.',
  },
  {
    id: 'collection_intro',
    label: 'Collection intro',
    description: 'An editorial intro paragraph for a collection.',
  },
  {
    id: 'email_teaser',
    label: 'Email teaser',
    description: 'A subject line and one-line teaser for an email.',
  },
];

export function contentTypeLabel(type: ContentType): string {
  return CONTENT_TYPES.find((t) => t.id === type)?.label ?? type;
}

export interface GenerationInput {
  sourceKind: SourceKind;
  /** Artwork id or collection name. */
  sourceId: string;
  sourceTitle: string;
  contentType: ContentType;
  /** Optional extra steer from the operator. */
  brief?: string;
}

export interface GenerationMeta {
  model: string;
  temperature: number;
  variantCount: number;
  /** ISO timestamp the batch was generated. */
  createdAt: string;
  /** Short deterministic id for the batch. */
  batchId: string;
}

export interface GeneratedVariant {
  id: string;
  /** "Variant A" / "Variant B" … */
  label: string;
  /** The tone this variant leans into, e.g. "Editorial". */
  tone: string;
  text: string;
  meta: GenerationMeta;
}

/** A saved draft — always a draft. This tool never publishes (TMS-F5-009). */
export interface ContentDraft {
  id: string;
  sourceKind: SourceKind;
  sourceTitle: string;
  contentType: ContentType;
  tone: string;
  text: string;
  /** The only status this produces. Publishing is a separate human action. */
  status: 'draft';
  /** Whether the operator edited the generated text before saving. */
  edited: boolean;
  meta: GenerationMeta;
  savedAt: string;
}

export const MODEL_NAME = 'brand-storyteller-preview';

export function canGenerate(input: Partial<GenerationInput>): boolean {
  return Boolean(input.sourceId && input.sourceTitle && input.contentType);
}

/** Tiny deterministic hash → short uppercase id, for reproducible batch ids. */
function shortId(seed: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-6);
}

interface ToneTemplate {
  tone: string;
  build: (title: string) => string;
}

const TEMPLATES: Record<ContentType, ToneTemplate[]> = {
  product_description: [
    {
      tone: 'Editorial',
      build: (t) =>
        `${t} began as a single drawing and now lives on premium cotton. Wear it like a piece from the gallery — considered, quietly bold, and made to last.`,
    },
    {
      tone: 'Punchy',
      build: (t) =>
        `Meet ${t}. Gallery-grade art, screen-printed to wear every day. Yours to style.`,
    },
    {
      tone: 'Minimal',
      build: (t) => `${t}. Original artwork on organic cotton. Made to order in a limited run.`,
    },
  ],
  social_caption: [
    {
      tone: 'Editorial',
      build: (t) =>
        `Some drawings ask to be worn. ${t} is one of them. New in the studio → link in bio.`,
    },
    {
      tone: 'Punchy',
      build: (t) => `${t} just dropped. Art you can wear. Tap to shop 🖤`,
    },
    {
      tone: 'Minimal',
      build: (t) => `${t}. Out now.`,
    },
  ],
  collection_intro: [
    {
      tone: 'Editorial',
      build: (t) =>
        `${t} gathers the pieces we kept coming back to — a set of drawings that share a mood more than a subject. Read them as a series, or find the one that’s yours.`,
    },
    {
      tone: 'Punchy',
      build: (t) => `${t}: a tight edit of our favourite drawings, together for the first time.`,
    },
    {
      tone: 'Minimal',
      build: (t) => `${t}. A small collection of original pieces.`,
    },
  ],
  email_teaser: [
    {
      tone: 'Editorial',
      build: (t) =>
        `Subject: A closer look at ${t}\n\nWe pulled ${t} from the sketchbook and onto cotton. Here’s the story behind it.`,
    },
    {
      tone: 'Punchy',
      build: (t) =>
        `Subject: ${t} is here\n\nNew art, ready to wear. Take a look before it’s gone.`,
    },
    {
      tone: 'Minimal',
      build: (t) => `Subject: ${t}\n\nNew in the studio. Shop now.`,
    },
  ],
};

/**
 * Generate draft variants for a source + content type. Deterministic given the
 * input + clock, so it is fully unit-testable. In production this is a call to
 * the generation endpoint (TMS-FBR-009); the shape is the same.
 */
export function generateVariants(
  input: GenerationInput,
  now: number = Date.now(),
): GeneratedVariant[] {
  const templates = TEMPLATES[input.contentType];
  const createdAt = new Date(now).toISOString();
  const batchId = shortId(`${input.sourceId}|${input.contentType}|${now}`);
  const meta: GenerationMeta = {
    model: MODEL_NAME,
    temperature: 0.7,
    variantCount: templates.length,
    createdAt,
    batchId,
  };
  return templates.map((template, index) => {
    const briefLine = input.brief?.trim() ? ` ${input.brief.trim()}` : '';
    return {
      id: `${batchId}-${String.fromCharCode(65 + index)}`,
      label: `Variant ${String.fromCharCode(65 + index)}`,
      tone: template.tone,
      text: `${template.build(input.sourceTitle)}${briefLine}`,
      meta,
    };
  });
}

/** Build a saved draft from a (possibly edited) variant. Status is always draft. */
export function draftFromVariant(
  variant: GeneratedVariant,
  input: GenerationInput,
  text: string,
  now: number = Date.now(),
): ContentDraft {
  return {
    id: `draft-${variant.id}-${now}`,
    sourceKind: input.sourceKind,
    sourceTitle: input.sourceTitle,
    contentType: input.contentType,
    tone: variant.tone,
    text: text.trim(),
    status: 'draft',
    edited: text.trim() !== variant.text.trim(),
    meta: variant.meta,
    savedAt: new Date(now).toISOString(),
  };
}
