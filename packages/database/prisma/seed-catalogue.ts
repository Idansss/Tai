import {
  ArtworkStatus,
  ArtworkVersionStatus,
  CompatibilityStatus,
  GarmentType,
  GarmentView,
  InventoryMovementKind,
  PromotionKind,
  PromotionStatus,
  StoryBlockType,
  TagKind,
  UserStatus,
} from '../generated/client/client.js';
import type { Prisma, PrismaClient } from '../generated/client/client.js';

/**
 * Development catalogue seed. Populates a runnable local database that mirrors the real
 * storefront: the eight artwork slugs the storefront already uses, garment templates with
 * colours/sizes/variants/placements/scale presets, approved and priced artwork↔garment pairs,
 * inventory (including a low-stock and an out-of-stock variant), a collection, a live drop, a
 * shoppable story, a limited edition, and two promotion codes.
 *
 * Every write is idempotent so the seed can be re-run without `migrate reset`. Money is integer
 * minor units (kobo, NGN) per ADR-015; floating point is never used.
 */

const NGN = 'NGN';
const SEED_ADMIN_EMAIL = 'studio@taimanic.dev';

type ArtworkSeed = {
  slug: string;
  title: string;
  shortStory: string;
  story: string;
  inspiration: string;
  tags: string[];
};

const ARTWORKS: ArtworkSeed[] = [
  {
    slug: 'midnight-in-lagos',
    title: 'Midnight in Lagos',
    shortStory: 'The city exhales after dark — danfo headlights, generator hum, and neon.',
    story:
      'A study of Lagos after midnight, when the traffic thins and the city becomes a river of light. Ink and gouache on paper.',
    inspiration: 'Third Mainland Bridge at 1am, seen from the back of an okada.',
    tags: ['lagos', 'night', 'ink'],
  },
  {
    slug: 'paper-tigers',
    title: 'Paper Tigers',
    shortStory: 'Bravado drawn thin — a menagerie folded from newsprint and boast.',
    story:
      'Big cats rendered as origami headlines, a comment on the posturing that passes for power.',
    inspiration: 'A stack of old newspapers and a childhood habit of folding them into animals.',
    tags: ['satire', 'ink'],
  },
  {
    slug: 'harmattan-bloom',
    title: 'Harmattan Bloom',
    shortStory: 'Dust in the air, and still something insists on flowering.',
    story:
      'The dry season palette — ochre haze, brittle light — interrupted by a single defiant bloom.',
    inspiration: 'The first harmattan morning, when the sun is a coin behind the dust.',
    tags: ['nature', 'season'],
  },
  {
    slug: 'lantern-keeper',
    title: 'The Lantern Keeper',
    shortStory: 'Someone has to hold the light while the rest of us sleep.',
    story: 'A quiet figure tending a wall of lanterns, painted in warm graphite and gold.',
    inspiration: 'Night markets where a single trader keeps their lamp lit longest.',
    tags: ['lagos', 'night'],
  },
  {
    slug: 'the-getaway',
    title: 'The Getaway',
    shortStory: 'Two friends, one bike, and the whole coast road ahead.',
    story: 'Motion study of an escape south — the blur of palms, the tilt into a corner.',
    inspiration: 'Every road trip that started as a bad idea and became the best day.',
    tags: ['motion'],
  },
  {
    slug: 'rainy-season',
    title: 'Rainy Season',
    shortStory: 'The sky opens and the whole street becomes a mirror.',
    story: 'Wet-into-wet washes of a downpour, umbrellas as punctuation.',
    inspiration: 'The particular smell of the first real rain after the dry months.',
    tags: ['nature', 'season'],
  },
  {
    slug: 'market-day',
    title: 'Market Day',
    shortStory: 'Colour as commerce — a hundred negotiations in one frame.',
    story: 'The controlled chaos of a market at full tilt, drawn as overlapping planes of pattern.',
    inspiration: 'Balogun market on a Saturday, where nobody stands still.',
    tags: ['lagos', 'pattern'],
  },
  {
    slug: 'okada-run',
    title: 'Okada Run',
    shortStory: 'Weaving through gridlock like it owes you money.',
    story:
      'A single okada threading a wall of stalled traffic, rendered in urgent diagonal strokes.',
    inspiration: 'The commute that taught me what courage looks like.',
    tags: ['lagos', 'motion'],
  },
];

const TAGS: { slug: string; name: string; kind: TagKind }[] = [
  { slug: 'lagos', name: 'Lagos', kind: TagKind.THEME },
  { slug: 'night', name: 'Night', kind: TagKind.MOOD },
  { slug: 'nature', name: 'Nature', kind: TagKind.THEME },
  { slug: 'season', name: 'Season', kind: TagKind.THEME },
  { slug: 'motion', name: 'Motion', kind: TagKind.MOOD },
  { slug: 'pattern', name: 'Pattern', kind: TagKind.THEME },
  { slug: 'satire', name: 'Satire', kind: TagKind.MOOD },
  { slug: 'ink', name: 'Ink', kind: TagKind.COLOUR_FAMILY },
];

type PlacementSeed = {
  slug: string;
  name: string;
  view: GarmentView;
  xPermille: number;
  yPermille: number;
  widthPermille: number;
  heightPermille: number;
  printWidthMm: number;
  printHeightMm: number;
  scalePresets: { slug: string; name: string; scalePercent: number }[];
};

const STANDARD_PRESETS = [
  { slug: 'standard', name: 'Standard', scalePercent: 100 },
  { slug: 'medium', name: 'Medium', scalePercent: 85 },
  { slug: 'small', name: 'Small', scalePercent: 70 },
];

const FRONT_BACK_PLACEMENTS: PlacementSeed[] = [
  {
    slug: 'front-chest',
    name: 'Front chest',
    view: GarmentView.FRONT,
    xPermille: 300,
    yPermille: 250,
    widthPermille: 400,
    heightPermille: 400,
    printWidthMm: 280,
    printHeightMm: 360,
    scalePresets: STANDARD_PRESETS,
  },
  {
    slug: 'full-back',
    name: 'Full back',
    view: GarmentView.BACK,
    xPermille: 250,
    yPermille: 200,
    widthPermille: 500,
    heightPermille: 550,
    printWidthMm: 320,
    printHeightMm: 400,
    scalePresets: STANDARD_PRESETS,
  },
];

type GarmentSeed = {
  slug: string;
  title: string;
  description: string;
  type: GarmentType;
  fabric: string;
  fit: string;
  care: string;
  priceMinor: number;
  colours: { slug: string; name: string; hex: string }[];
  sizes: { code: string; label: string }[];
  placements: PlacementSeed[];
};

const GARMENTS: GarmentSeed[] = [
  {
    slug: 'classic-tee',
    title: 'Classic T-shirt',
    description: 'Mid-weight 100% combed cotton, ribbed crew neck, print-ready front and back.',
    type: GarmentType.CLASSIC_TSHIRT,
    fabric: '180gsm combed ring-spun cotton',
    fit: 'Regular unisex fit',
    care: 'Machine wash cold, inside out. Do not tumble dry the print.',
    priceMinor: 1_400_000,
    colours: [
      { slug: 'black', name: 'Black', hex: '#111111' },
      { slug: 'white', name: 'White', hex: '#F5F5F0' },
      { slug: 'sand', name: 'Sand', hex: '#D9C9A8' },
    ],
    sizes: [
      { code: 'S', label: 'Small' },
      { code: 'M', label: 'Medium' },
      { code: 'L', label: 'Large' },
      { code: 'XL', label: 'X-Large' },
    ],
    placements: FRONT_BACK_PLACEMENTS,
  },
  {
    slug: 'heavyweight-hoodie',
    title: 'Heavyweight Hoodie',
    description: 'Brushed-back 380gsm fleece, double-lined hood, roomy kangaroo pocket.',
    type: GarmentType.HOODIE,
    fabric: '380gsm brushed-back cotton-rich fleece',
    fit: 'Relaxed unisex fit',
    care: 'Machine wash cold. Do not iron directly on the print.',
    priceMinor: 2_800_000,
    colours: [
      { slug: 'black', name: 'Black', hex: '#111111' },
      { slug: 'ash', name: 'Ash', hex: '#8A8D91' },
    ],
    sizes: [
      { code: 'S', label: 'Small' },
      { code: 'M', label: 'Medium' },
      { code: 'L', label: 'Large' },
      { code: 'XL', label: 'X-Large' },
    ],
    placements: FRONT_BACK_PLACEMENTS,
  },
  {
    slug: 'canvas-tote',
    title: 'Canvas Tote',
    description: 'Heavy 12oz natural cotton canvas, boxed base, long shoulder straps.',
    type: GarmentType.TOTE_BAG,
    fabric: '12oz natural cotton canvas',
    fit: 'One size, 38 × 42cm',
    care: 'Spot clean or machine wash cold.',
    priceMinor: 900_000,
    colours: [{ slug: 'natural', name: 'Natural', hex: '#E9E2D0' }],
    sizes: [{ code: 'OS', label: 'One Size' }],
    placements: [
      {
        slug: 'front-panel',
        name: 'Front panel',
        view: GarmentView.FRONT,
        xPermille: 300,
        yPermille: 250,
        widthPermille: 400,
        heightPermille: 450,
        printWidthMm: 240,
        printHeightMm: 300,
        scalePresets: STANDARD_PRESETS,
      },
    ],
  },
];

/** Which garment each artwork is approved on. Every artwork sells on the tee and hoodie; a
 *  couple also sell on the tote so the catalogue has some shape. */
function garmentsForArtwork(slug: string): string[] {
  const base = ['classic-tee', 'heavyweight-hoodie'];
  if (slug === 'market-day' || slug === 'okada-run') base.push('canvas-tote');
  return base;
}

function sku(garmentSlug: string, colourSlug: string, sizeCode: string): string {
  const g = garmentSlug
    .split('-')
    .map((p) => p.slice(0, 3).toUpperCase())
    .join('');
  return `${g}-${colourSlug.slice(0, 3).toUpperCase()}-${sizeCode.toUpperCase()}`;
}

function json(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject;
}

export async function seedCatalogue(prisma: PrismaClient): Promise<void> {
  const now = new Date();

  // A single administrator owns all seeded content and approvals.
  const admin = await prisma.user.upsert({
    where: { normalizedEmail: SEED_ADMIN_EMAIL },
    update: { status: UserStatus.ACTIVE, emailVerifiedAt: now },
    create: {
      email: SEED_ADMIN_EMAIL,
      normalizedEmail: SEED_ADMIN_EMAIL,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: now,
      adminProfile: {
        create: { displayName: 'Studio Seed', status: 'ACTIVE', mfaRequired: false },
      },
    },
    select: { id: true },
  });
  const ownerRole = await prisma.role.findUnique({
    where: { code: 'OWNER' },
    select: { id: true },
  });
  if (ownerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: ownerRole.id } },
      update: {},
      create: { userId: admin.id, roleId: ownerRole.id },
    });
  }

  // Tags.
  const tagIds = new Map<string, string>();
  for (const tag of TAGS) {
    const record = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, kind: tag.kind },
      create: { slug: tag.slug, name: tag.name, kind: tag.kind },
      select: { id: true },
    });
    tagIds.set(tag.slug, record.id);
  }

  // Artworks + one published version each.
  const publishedVersionByArtworkSlug = new Map<string, string>();
  const artworkIdBySlug = new Map<string, string>();
  for (const art of ARTWORKS) {
    const artwork = await prisma.artwork.upsert({
      where: { slug: art.slug },
      update: { status: ArtworkStatus.PUBLISHED, publishedAt: now, archivedAt: null },
      create: {
        slug: art.slug,
        status: ArtworkStatus.PUBLISHED,
        publishedAt: now,
        createdAt: now,
        createdByUserId: admin.id,
      },
      select: { id: true },
    });
    artworkIdBySlug.set(art.slug, artwork.id);

    // Version content is immutable once created, so create only if absent.
    let version = await prisma.artworkVersion.findFirst({
      where: { artworkId: artwork.id, versionNumber: 1 },
      select: { id: true },
    });
    if (!version) {
      version = await prisma.artworkVersion.create({
        data: {
          artworkId: artwork.id,
          versionNumber: 1,
          status: ArtworkVersionStatus.PUBLISHED,
          publishedAt: now,
          createdAt: now,
          title: art.title,
          shortStory: art.shortStory,
          story: art.story,
          inspiration: art.inspiration,
          metadata: json({ medium: 'Mixed media on paper', orientation: 'portrait' }),
          createdByUserId: admin.id,
        },
        select: { id: true },
      });
    }
    publishedVersionByArtworkSlug.set(art.slug, version.id);

    for (const tagSlug of art.tags) {
      const tagId = tagIds.get(tagSlug);
      if (!tagId) continue;
      await prisma.artworkTag.upsert({
        where: { artworkId_tagId: { artworkId: artwork.id, tagId } },
        update: {},
        create: { artworkId: artwork.id, tagId },
      });
    }
  }

  // A limited numbered edition on the flagship, so the `limitedEdition` filter returns something.
  const flagshipId = artworkIdBySlug.get('midnight-in-lagos');
  if (flagshipId) {
    await prisma.edition.upsert({
      where: { artworkId_name: { artworkId: flagshipId, name: 'First Pressing' } },
      update: { status: ArtworkStatus.PUBLISHED, releasedAt: now },
      create: {
        artworkId: flagshipId,
        name: 'First Pressing',
        totalQuantity: 100,
        numbered: true,
        status: ArtworkStatus.PUBLISHED,
        releasedAt: now,
      },
    });
  }

  // Two collections.
  await upsertCollection(
    prisma,
    admin.id,
    now,
    'lagos-nights',
    'Lagos Nights',
    'The city after dark.',
    ['midnight-in-lagos', 'lantern-keeper', 'okada-run'],
    artworkIdBySlug,
  );
  await upsertCollection(
    prisma,
    admin.id,
    now,
    'seasons',
    'Seasons',
    'Weather as a state of mind.',
    ['harmattan-bloom', 'rainy-season'],
    artworkIdBySlug,
  );

  // A live drop (started two days ago, ends in two weeks).
  const drop = await prisma.drop.upsert({
    where: { slug: 'harmattan-2026' },
    update: {
      status: ArtworkStatus.PUBLISHED,
      publishedAt: now,
      startsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
    create: {
      slug: 'harmattan-2026',
      title: 'Harmattan 2026',
      description: 'A short run released for the dry season.',
      status: ArtworkStatus.PUBLISHED,
      publishedAt: now,
      startsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      createdByUserId: admin.id,
    },
    select: { id: true },
  });
  const dropMembers = ['harmattan-bloom', 'lantern-keeper'];
  for (const [position, slug] of dropMembers.entries()) {
    const artworkId = artworkIdBySlug.get(slug);
    if (!artworkId) continue;
    await prisma.dropArtwork.upsert({
      where: { dropId_artworkId: { dropId: drop.id, artworkId } },
      update: { position },
      create: { dropId: drop.id, artworkId, position },
    });
  }

  // A shoppable editorial story.
  const marketDayId = artworkIdBySlug.get('market-day');
  if (marketDayId) {
    const existingStory = await prisma.story.findUnique({
      where: { slug: 'making-of-market-day' },
      select: { id: true },
    });
    const blocks = [
      {
        type: StoryBlockType.TEXT,
        content: json({
          text: 'Market Day began as a single sketch made standing up, hemmed in by the crowd.',
        }),
      },
      {
        type: StoryBlockType.QUOTE,
        content: json({
          text: 'Nobody in a market stands still — so I stopped trying to make them.',
          attribution: 'Tai',
        }),
      },
      {
        type: StoryBlockType.TEXT,
        content: json({
          text: 'The final piece layers pattern over pattern until the eye has to keep moving, like the market itself.',
        }),
      },
    ];
    if (existingStory) {
      await prisma.storyBlock.deleteMany({ where: { storyId: existingStory.id } });
      await prisma.story.update({
        where: { id: existingStory.id },
        data: {
          title: 'The Making of Market Day',
          excerpt: 'How a standing-up sketch became a wall of pattern.',
          status: ArtworkStatus.PUBLISHED,
          publishedAt: now,
          artworkId: marketDayId,
          blocks: { create: blocks.map((block, position) => ({ ...block, position })) },
        },
      });
    } else {
      await prisma.story.create({
        data: {
          slug: 'making-of-market-day',
          title: 'The Making of Market Day',
          excerpt: 'How a standing-up sketch became a wall of pattern.',
          status: ArtworkStatus.PUBLISHED,
          publishedAt: now,
          artworkId: marketDayId,
          createdByUserId: admin.id,
          blocks: { create: blocks.map((block, position) => ({ ...block, position })) },
        },
      });
    }
  }

  // Garment templates with colours, sizes, variants, placements, and scale presets.
  type TemplateBuild = {
    id: string;
    variantIds: string[];
    placementIds: string[];
    priceMinor: number;
  };
  const templates = new Map<string, TemplateBuild>();
  for (const garment of GARMENTS) {
    const template = await prisma.garmentTemplate.upsert({
      where: { slug: garment.slug },
      update: {
        status: ArtworkStatus.PUBLISHED,
        publishedAt: now,
        title: garment.title,
        description: garment.description,
        fabric: garment.fabric,
        fit: garment.fit,
        care: garment.care,
      },
      create: {
        slug: garment.slug,
        title: garment.title,
        description: garment.description,
        type: garment.type,
        fabric: garment.fabric,
        fit: garment.fit,
        care: garment.care,
        status: ArtworkStatus.PUBLISHED,
        publishedAt: now,
        createdByUserId: admin.id,
      },
      select: { id: true },
    });

    const colourIds = new Map<string, string>();
    for (const [position, colour] of garment.colours.entries()) {
      const record = await prisma.garmentColour.upsert({
        where: { templateId_slug: { templateId: template.id, slug: colour.slug } },
        update: { name: colour.name, hex: colour.hex, position, status: ArtworkStatus.PUBLISHED },
        create: {
          templateId: template.id,
          slug: colour.slug,
          name: colour.name,
          hex: colour.hex,
          position,
          status: ArtworkStatus.PUBLISHED,
        },
        select: { id: true },
      });
      colourIds.set(colour.slug, record.id);
    }

    const sizeIds = new Map<string, string>();
    for (const [position, size] of garment.sizes.entries()) {
      const record = await prisma.garmentSize.upsert({
        where: { templateId_code: { templateId: template.id, code: size.code } },
        update: { label: size.label, position, status: ArtworkStatus.PUBLISHED },
        create: {
          templateId: template.id,
          code: size.code,
          label: size.label,
          position,
          status: ArtworkStatus.PUBLISHED,
        },
        select: { id: true },
      });
      sizeIds.set(size.code, record.id);
    }

    const variantIds: string[] = [];
    for (const colour of garment.colours) {
      for (const size of garment.sizes) {
        const colourId = colourIds.get(colour.slug);
        const sizeId = sizeIds.get(size.code);
        if (!colourId || !sizeId) continue;
        const record = await prisma.garmentVariant.upsert({
          where: { sku: sku(garment.slug, colour.slug, size.code) },
          update: { status: ArtworkStatus.PUBLISHED },
          create: {
            templateId: template.id,
            colourId,
            sizeId,
            sku: sku(garment.slug, colour.slug, size.code),
            status: ArtworkStatus.PUBLISHED,
          },
          select: { id: true },
        });
        variantIds.push(record.id);

        // Inventory: default healthy, one low-stock and one out-of-stock example.
        const onHand =
          garment.slug === 'heavyweight-hoodie' && colour.slug === 'ash' && size.code === 'XL'
            ? 3
            : garment.slug === 'classic-tee' && colour.slug === 'white' && size.code === 'XL'
              ? 0
              : 40;
        const item = await prisma.inventoryItem.upsert({
          where: { variantId: record.id },
          update: { onHand, lowStockThreshold: 5 },
          create: { variantId: record.id, onHand, lowStockThreshold: 5 },
          select: { id: true },
        });
        const movements = await prisma.inventoryMovement.count({ where: { itemId: item.id } });
        if (onHand > 0 && movements === 0) {
          await prisma.inventoryMovement.create({
            data: {
              itemId: item.id,
              kind: InventoryMovementKind.RECEIPT,
              quantityDelta: onHand,
              onHandAfter: onHand,
              reason: 'Development seed opening stock',
              createdByUserId: admin.id,
            },
          });
        }
      }
    }

    const placementIds: string[] = [];
    for (const [position, placement] of garment.placements.entries()) {
      const record = await prisma.garmentPlacement.upsert({
        where: { templateId_slug: { templateId: template.id, slug: placement.slug } },
        update: {
          name: placement.name,
          view: placement.view,
          xPermille: placement.xPermille,
          yPermille: placement.yPermille,
          widthPermille: placement.widthPermille,
          heightPermille: placement.heightPermille,
          printWidthMm: placement.printWidthMm,
          printHeightMm: placement.printHeightMm,
          position,
          status: ArtworkStatus.PUBLISHED,
        },
        create: {
          templateId: template.id,
          slug: placement.slug,
          name: placement.name,
          view: placement.view,
          xPermille: placement.xPermille,
          yPermille: placement.yPermille,
          widthPermille: placement.widthPermille,
          heightPermille: placement.heightPermille,
          printWidthMm: placement.printWidthMm,
          printHeightMm: placement.printHeightMm,
          position,
          status: ArtworkStatus.PUBLISHED,
        },
        select: { id: true },
      });
      placementIds.push(record.id);

      for (const [presetPosition, preset] of placement.scalePresets.entries()) {
        await prisma.garmentScalePreset.upsert({
          where: { placementId_slug: { placementId: record.id, slug: preset.slug } },
          update: {
            name: preset.name,
            scalePercent: preset.scalePercent,
            position: presetPosition,
            status: ArtworkStatus.PUBLISHED,
          },
          create: {
            placementId: record.id,
            slug: preset.slug,
            name: preset.name,
            scalePercent: preset.scalePercent,
            position: presetPosition,
            status: ArtworkStatus.PUBLISHED,
          },
        });
      }
    }

    templates.set(garment.slug, {
      id: template.id,
      variantIds,
      placementIds,
      priceMinor: garment.priceMinor,
    });
  }

  // Approved, priced artwork↔garment compatibilities with their placement allowlist.
  for (const art of ARTWORKS) {
    const versionId = publishedVersionByArtworkSlug.get(art.slug);
    if (!versionId) continue;
    for (const garmentSlug of garmentsForArtwork(art.slug)) {
      const template = templates.get(garmentSlug);
      if (!template) continue;
      const compatibility = await prisma.artworkGarmentCompatibility.upsert({
        where: {
          artworkVersionId_templateId: { artworkVersionId: versionId, templateId: template.id },
        },
        update: {
          status: CompatibilityStatus.APPROVED,
          unitPriceMinor: template.priceMinor,
          currency: NGN,
          approvedByUserId: admin.id,
          approvedAt: now,
          archivedAt: null,
        },
        create: {
          artworkVersionId: versionId,
          templateId: template.id,
          status: CompatibilityStatus.APPROVED,
          unitPriceMinor: template.priceMinor,
          currency: NGN,
          createdByUserId: admin.id,
          approvedByUserId: admin.id,
          approvedAt: now,
        },
        select: { id: true },
      });
      for (const placementId of template.placementIds) {
        await prisma.artworkGarmentPlacement.upsert({
          where: {
            compatibilityId_placementId: { compatibilityId: compatibility.id, placementId },
          },
          update: {},
          create: { compatibilityId: compatibility.id, placementId },
        });
      }
    }
  }

  // Promotions the storefront already references.
  await prisma.promotion.upsert({
    where: { code: 'STUDIO10' },
    update: {
      label: '10% off your design',
      kind: PromotionKind.PERCENT_OFF,
      value: 10,
      currency: null,
      status: PromotionStatus.ACTIVE,
    },
    create: {
      code: 'STUDIO10',
      label: '10% off your design',
      kind: PromotionKind.PERCENT_OFF,
      value: 10,
      status: PromotionStatus.ACTIVE,
      createdByUserId: admin.id,
    },
  });
  await prisma.promotion.upsert({
    where: { code: 'WELCOME' },
    update: {
      label: '₦2,000 off your first order',
      kind: PromotionKind.FIXED_AMOUNT,
      value: 200_000,
      currency: NGN,
      status: PromotionStatus.ACTIVE,
      minSubtotalMinor: 1_000_000,
    },
    create: {
      code: 'WELCOME',
      label: '₦2,000 off your first order',
      kind: PromotionKind.FIXED_AMOUNT,
      value: 200_000,
      currency: NGN,
      status: PromotionStatus.ACTIVE,
      minSubtotalMinor: 1_000_000,
      createdByUserId: admin.id,
    },
  });
}

async function upsertCollection(
  prisma: PrismaClient,
  ownerId: string,
  now: Date,
  slug: string,
  title: string,
  description: string,
  memberSlugs: string[],
  artworkIdBySlug: Map<string, string>,
): Promise<void> {
  const collection = await prisma.collection.upsert({
    where: { slug },
    update: { title, description, status: ArtworkStatus.PUBLISHED, publishedAt: now },
    create: {
      slug,
      title,
      description,
      status: ArtworkStatus.PUBLISHED,
      publishedAt: now,
      createdByUserId: ownerId,
    },
    select: { id: true },
  });
  for (const [position, artworkSlug] of memberSlugs.entries()) {
    const artworkId = artworkIdBySlug.get(artworkSlug);
    if (!artworkId) continue;
    await prisma.collectionArtwork.upsert({
      where: { collectionId_artworkId: { collectionId: collection.id, artworkId } },
      update: { position },
      create: { collectionId: collection.id, artworkId, position },
    });
  }
}
