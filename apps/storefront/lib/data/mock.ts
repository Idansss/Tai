import type { CursorPage } from '@tms/contracts';
import { artworkVersionId, passportSerial } from '../passport';
import { artworkMatchesQuery } from '../search';
import { filterApproved } from '../community';
import { summariseReviews } from '../reviews';
import { artworkImage } from '../artwork-images';
import { countShoppableItems, storyHotspotTargets } from '../stories';
import { suppliedArtworkSeeds, suppliedShopDesigns } from './supplied-catalogue';
import type {
  ArtworkDetail,
  ArtworkPassport,
  ArtworkSummary,
  Availability,
  CollectionDetail,
  CollectionSummary,
  CommunityPhoto,
  DeliveryOption,
  DropDetail,
  DropSummary,
  ListArtworksParams,
  LoyaltyProfile,
  LoyaltyReward,
  ProductDetail,
  ProductSummary,
  ProvenanceEvent,
  Review,
  ReviewCollection,
  ReviewTargetType,
  StorefrontDataProvider,
  StoryBlock,
  StoryDetail,
  StoryHotspotTarget,
  StorySummary,
  StudioGarment,
  StudioOptions,
  StudioPlacement,
} from './types';

const COLOUR_PALETTE: Record<string, string> = {
  Black: '#1a1a1a',
  Bone: '#efeae0',
  Sand: '#d8c7a8',
  Olive: '#5f6046',
  Slate: '#3a4654',
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

interface ProductSeed {
  slug: string;
  artworkSlug: string;
  artworkTitle: string;
  collection: string;
  garment: string;
  priceMinor: number;
  availability: Availability;
  colours: string[];
  unavailableColours?: string[];
  soldOutSizes?: string[];
  /** Shop-facing title when it should differ from `artwork — garment`. */
  displayTitle?: string;
  /** Product photograph when the studio supplied a flat-lay / worn shot. */
  image?: string;
}

const productSeeds: ProductSeed[] = [
  {
    slug: 'midnight-in-lagos-classic-tee',
    artworkSlug: 'midnight-in-lagos',
    artworkTitle: 'Midnight in Lagos',
    collection: 'Night Studies',
    garment: 'Classic T-shirt',
    priceMinor: 1200000,
    availability: 'available',
    colours: ['Black', 'Bone', 'Slate'],
    soldOutSizes: ['XS'],
  },
  {
    slug: 'paper-tigers-oversized-tee',
    artworkSlug: 'paper-tigers',
    artworkTitle: 'Paper Tigers',
    collection: 'Comic Line',
    garment: 'Oversized T-shirt',
    priceMinor: 1500000,
    availability: 'limited',
    colours: ['Black', 'Bone', 'Sand'],
    unavailableColours: ['Sand'],
    soldOutSizes: ['XXL'],
  },
  {
    slug: 'harmattan-bloom-classic-tee',
    artworkSlug: 'harmattan-bloom',
    artworkTitle: 'Harmattan Bloom',
    collection: 'Season Sketches',
    garment: 'Classic T-shirt',
    priceMinor: 1100000,
    availability: 'available',
    colours: ['Bone', 'Sand', 'Olive'],
  },
  {
    slug: 'market-day-longsleeve',
    artworkSlug: 'market-day',
    artworkTitle: 'Market Day',
    collection: 'City Portraits',
    garment: 'Long-sleeve shirt',
    priceMinor: 1800000,
    availability: 'limited',
    colours: ['Black', 'Slate', 'Olive'],
    soldOutSizes: ['S', 'XXL'],
  },
  {
    slug: 'okada-run-oversized-tee',
    artworkSlug: 'okada-run',
    artworkTitle: 'Okada Run',
    collection: 'City Portraits',
    garment: 'Oversized T-shirt',
    priceMinor: 1250000,
    availability: 'sold_out',
    colours: ['Black', 'Bone'],
  },
  {
    slug: 'lantern-keeper-classic-tee',
    artworkSlug: 'lantern-keeper',
    artworkTitle: 'Lantern Keeper',
    collection: 'Night Studies',
    garment: 'Classic T-shirt',
    priceMinor: 1300000,
    availability: 'available',
    colours: ['Black', 'Slate', 'Sand'],
  },
  // Studio-supplied clothing photographs — buyable products in Shop (not Design Studio links).
  ...suppliedShopDesigns.map<ProductSeed>((design) => {
    const artwork = suppliedArtworkSeeds.find((a) => a.slug === design.artworkSlug);
    const isBlack = design.garment.toLowerCase().includes('black');
    return {
      slug: design.slug,
      artworkSlug: design.artworkSlug,
      artworkTitle: suppliedArtworkTitle(design.artworkSlug),
      collection: artwork?.collection ?? 'Africa United',
      garment: 'Classic T-shirt',
      displayTitle: design.title,
      image: design.image,
      priceMinor: 1400000,
      availability: 'available',
      colours: isBlack ? ['Black', 'Slate'] : ['Bone', 'Sand'],
    };
  }),
];

function toProductSummary(seed: ProductSeed): ProductSummary {
  return {
    id: seed.slug,
    slug: seed.slug,
    title: seed.displayTitle ?? `${seed.artworkTitle} — ${seed.garment}`,
    artworkSlug: seed.artworkSlug,
    artworkTitle: seed.artworkTitle,
    collection: seed.collection,
    garment: seed.garment,
    priceMinor: seed.priceMinor,
    currency: 'NGN',
    availability: seed.availability,
    colourCount: seed.colours.length,
    image: seed.image ?? null,
  };
}

function toProductDetail(seed: ProductSeed): ProductDetail {
  return {
    ...toProductSummary(seed),
    description: `${seed.artworkTitle} printed on our ${seed.garment.toLowerCase()}. A gallery piece you can wear.`,
    fabric: '100% organic combed cotton, 180gsm.',
    fit: seed.garment.includes('Oversized')
      ? 'Relaxed, boxy fit — size down for a classic cut.'
      : 'True to size, regular fit.',
    printMethod: 'Water-based screen print, cured for durability.',
    care: 'Machine wash cold, inside out. Do not tumble dry.',
    deliveryEstimate: '3–6 working days within Nigeria.',
    returnSummary: '14-day returns on unworn items.',
    colours: seed.colours.map((name) => ({
      name,
      hex: COLOUR_PALETTE[name] ?? '#888888',
      available: !seed.unavailableColours?.includes(name),
    })),
    sizes: SIZES.map((label) => ({
      label,
      available: seed.availability !== 'sold_out' && !seed.soldOutSizes?.includes(label),
    })),
  };
}

/** Collection metadata keyed by the collection name used on artworks. */
const collectionMeta: { slug: string; name: string; description: string }[] = [
  {
    slug: 'night-studies',
    name: 'Night Studies',
    description:
      'The city after dark in warm coloured pencil — dusk light, street life and the last colour of the day.',
  },
  {
    slug: 'comic-line',
    name: 'Comic Line',
    description:
      'Comic-panel storytelling — gutters, speech bubbles and the recurring muse, a panel at a time.',
  },
  {
    slug: 'season-sketches',
    name: 'Season Sketches',
    description: 'Pieces that follow the turning of the seasons — harmattan dust, rain and bloom.',
  },
  {
    slug: 'city-portraits',
    name: 'City Portraits',
    description:
      'Street-level scenes across African cities — the muse at market and on the move, in full colour.',
  },
  {
    slug: 'africa-united',
    name: 'Africa United',
    description:
      'Portraits of shared heritage, family and creative life, drawn through textiles, symbols and community.',
  },
  {
    slug: 'resilience',
    name: 'Resilience',
    description:
      'Bold poster studies celebrating origin, heritage, power and the confidence to stand tall.',
  },
  {
    slug: 'studio-muses',
    name: 'Studio Muses',
    description:
      'Character and styling studies from the studio — caps, colour, markets and everyday movement.',
  },
];

function suppliedArtworkTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => (word === 'africa' ? 'Africa' : word[0]?.toUpperCase() + word.slice(1)))
    .join(' ');
}

const artworks: ArtworkSummary[] = [
  {
    id: 'a1',
    slug: 'midnight-in-lagos',
    title: 'Midnight in Lagos',
    collection: 'Night Studies',
    shortStory: 'The muse against the Lagos skyline at dusk, in warm coloured pencil.',
    availability: 'available',
    startingPriceMinor: 1200000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt', 'Oversized T-shirt'],
    limitedEdition: false,
  },
  {
    id: 'a2',
    slug: 'paper-tigers',
    title: 'Paper Tigers',
    collection: 'Comic Line',
    shortStory: 'A comic-panel spread on courage that is mostly bluff — in full colour.',
    availability: 'limited',
    startingPriceMinor: 1500000,
    currency: 'NGN',
    compatibleGarments: ['Oversized T-shirt', 'Long-sleeve shirt'],
    limitedEdition: true,
  },
  {
    id: 'a3',
    slug: 'harmattan-bloom',
    title: 'Harmattan Bloom',
    collection: 'Season Sketches',
    shortStory: 'Harmattan-season blooms in warm coloured pencil — dust-gold and pink.',
    availability: 'available',
    startingPriceMinor: 1100000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt'],
    limitedEdition: false,
  },
  {
    id: 'a4',
    slug: 'lantern-keeper',
    title: 'Lantern Keeper',
    collection: 'Night Studies',
    shortStory: 'A quiet figure holding the only warm light on the street.',
    availability: 'available',
    startingPriceMinor: 1300000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt', 'Long-sleeve shirt'],
    limitedEdition: false,
  },
  {
    id: 'a5',
    slug: 'the-getaway',
    title: 'The Getaway',
    collection: 'Comic Line',
    shortStory: 'Three panels, one bad decision, and a very fast bicycle.',
    availability: 'sold_out',
    startingPriceMinor: 1600000,
    currency: 'NGN',
    compatibleGarments: ['Oversized T-shirt'],
    limitedEdition: true,
  },
  {
    id: 'a6',
    slug: 'rainy-season',
    title: 'Rainy Season',
    collection: 'Season Sketches',
    shortStory: 'Umbrellas as punctuation across a grey afternoon.',
    availability: 'available',
    startingPriceMinor: 1150000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt', 'Oversized T-shirt'],
    limitedEdition: false,
  },
  {
    id: 'a7',
    slug: 'market-day',
    title: 'Market Day',
    collection: 'City Portraits',
    shortStory: 'A crowded market stall in full sunset colour — the muse mid-haggle.',
    availability: 'limited',
    startingPriceMinor: 1400000,
    currency: 'NGN',
    compatibleGarments: ['Classic T-shirt', 'Oversized T-shirt', 'Long-sleeve shirt'],
    limitedEdition: true,
  },
  {
    id: 'a8',
    slug: 'okada-run',
    title: 'Okada Run',
    collection: 'City Portraits',
    shortStory: 'Motion blur on two wheels — an okada run through the city, in colour.',
    availability: 'available',
    startingPriceMinor: 1250000,
    currency: 'NGN',
    compatibleGarments: ['Oversized T-shirt'],
    limitedEdition: false,
  },
  ...suppliedArtworkSeeds.map<ArtworkSummary>((seed, index) => ({
    id: `studio-supplied-${index + 1}`,
    slug: seed.slug,
    title: suppliedArtworkTitle(seed.slug),
    collection: seed.collection,
    shortStory: `A studio-supplied piece from the ${seed.collection} collection.`,
    availability: null,
    startingPriceMinor: null,
    currency: null,
    compatibleGarments:
      seed.slug === 'resilience-hands-high' || seed.slug.startsWith('africa-united-')
        ? ['Classic T-shirt']
        : [],
    limitedEdition: false,
  })),
];

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Drop seeds (TMS-F5-001). Timings are offsets in ms relative to "now" so the
 * preview always shows a live countdown for each state; the real API
 * (TMS-FBR-008) will send absolute server timestamps. `earlyOffset`/`endOffset`
 * are null when there is no early window / the drop is open-ended.
 */
interface DropSeed {
  slug: string;
  title: string;
  tagline: string;
  story: string;
  collection: string;
  earlyOffset: number | null;
  releaseOffset: number;
  endOffset: number | null;
  soldOut: boolean;
}

const dropSeeds: DropSeed[] = [
  {
    slug: 'night-market',
    title: 'Night Market',
    tagline: 'The Night Studies drop, live now.',
    story:
      'Four pieces from the city after dark — dusk light, street life and the last warm colour of the day. Made to order in a limited run.',
    collection: 'Night Studies',
    earlyOffset: -2 * DAY_MS,
    releaseOffset: -1 * DAY_MS,
    endOffset: 3 * DAY_MS,
    soldOut: false,
  },
  {
    slug: 'city-portraits-vol-1',
    title: 'City Portraits, Vol. 1',
    tagline: 'Early access is open for members.',
    story:
      'Street-level scenes across African cities, in full colour. Members get first access before the public release.',
    collection: 'City Portraits',
    earlyOffset: -1 * HOUR_MS,
    releaseOffset: 1 * DAY_MS,
    endOffset: 8 * DAY_MS,
    soldOut: false,
  },
  {
    slug: 'harmattan-editions',
    title: 'Harmattan Editions',
    tagline: 'Dust-season florals, dropping soon.',
    story:
      'A short seasonal set in warm coloured pencil — harmattan dust and bloom. Join early access to be first in the queue when it opens.',
    collection: 'Season Sketches',
    earlyOffset: 1 * DAY_MS,
    releaseOffset: 2 * DAY_MS,
    endOffset: 9 * DAY_MS,
    soldOut: false,
  },
  {
    slug: 'comic-line-reprint',
    title: 'Comic Line — Reprint',
    tagline: 'Sold out in record time.',
    story:
      'A one-week reprint of the Comic Line favourites. This run has fully sold through — join the waitlist for the next one.',
    collection: 'Comic Line',
    earlyOffset: -6 * DAY_MS,
    releaseOffset: -5 * DAY_MS,
    endOffset: 2 * DAY_MS,
    soldOut: true,
  },
  {
    slug: 'first-light',
    title: 'First Light',
    tagline: 'The drop that started it all — now closed.',
    story:
      'The studio’s first limited release, archived here for the record. Closed to new orders.',
    collection: 'Night Studies',
    earlyOffset: -12 * DAY_MS,
    releaseOffset: -11 * DAY_MS,
    endOffset: -2 * DAY_MS,
    soldOut: false,
  },
];

function dropArtworks(collection: string): ArtworkSummary[] {
  return artworks.filter((a) => a.collection === collection);
}

function toDropSummary(seed: DropSeed, now: number): DropSummary {
  const iso = (offset: number | null): string | null =>
    offset === null ? null : new Date(now + offset).toISOString();
  return {
    slug: seed.slug,
    title: seed.title,
    tagline: seed.tagline,
    collection: seed.collection,
    earlyAccessAt: iso(seed.earlyOffset),
    releaseAt: iso(seed.releaseOffset)!,
    endsAt: iso(seed.endOffset),
    pieceCount: dropArtworks(seed.collection).length,
    soldOut: seed.soldOut,
  };
}

/**
 * Shoppable story seeds (TMS-F5-007). Hotspot targets are built from the same
 * artwork/product/collection data the rest of the catalogue uses, so titles and
 * prices never drift. `StorySummary` (index) is derived from each detail by
 * dropping the body and counting shoppable hotspots.
 */
function artworkTarget(slug: string): StoryHotspotTarget {
  const a = artworks.find((x) => x.slug === slug);
  return { kind: 'artwork', slug, label: a?.title ?? slug };
}

function productTarget(slug: string): StoryHotspotTarget {
  const p = productSeeds.find((x) => x.slug === slug);
  return {
    kind: 'product',
    slug,
    label: p ? `${p.artworkTitle} — ${p.garment}` : slug,
    priceMinor: p?.priceMinor ?? 0,
    currency: 'NGN',
  };
}

function collectionTarget(slug: string): StoryHotspotTarget {
  const c = collectionMeta.find((x) => x.slug === slug);
  return { kind: 'collection', slug, label: c?.name ?? slug };
}

const studioTarget: StoryHotspotTarget = { kind: 'studio', label: 'Design Studio' };

type StorySeed = Omit<StoryDetail, 'shoppableCount'>;

const storySeeds: StorySeed[] = [
  {
    slug: 'how-midnight-in-lagos-came-together',
    title: 'How Midnight in Lagos came together',
    category: 'Process',
    excerpt:
      'From a blurred phone photo on a night bus to a finished coloured-pencil drawing — the making of our most-worn piece.',
    readMinutes: 5,
    publishedOn: '2026-06-20',
    intro:
      'Every piece starts on paper. Midnight in Lagos began as a photograph taken through a bus window and ended as a drawing we could not stop returning to.',
    blocks: [
      { kind: 'heading', text: 'From a photograph to a drawing' },
      {
        kind: 'paragraph',
        text: 'The first sketches chased every light in the frame — too much of it. Building the scene up from a graphite construction and spending colour only where it mattered was what finally made the city feel awake rather than lit up.',
      },
      {
        kind: 'scene',
        scene: {
          id: 'scene-drawing',
          caption: 'The finished drawing, pinned in the studio',
          hotspots: [
            {
              id: 'h-artwork',
              x: 32,
              y: 42,
              caption: 'The finished piece in the gallery',
              target: artworkTarget('midnight-in-lagos'),
            },
            {
              id: 'h-collection',
              x: 70,
              y: 64,
              caption: 'More drawings from after dark',
              target: collectionTarget('night-studies'),
            },
          ],
        },
      },
      { kind: 'heading', text: 'Onto the garment' },
      {
        kind: 'paragraph',
        text: 'A water-based screen print keeps the line crisp without sitting heavy on the cotton. The first proof went straight onto our classic tee.',
      },
      {
        kind: 'scene',
        scene: {
          id: 'scene-proof',
          caption: 'The first press proof on a classic tee',
          hotspots: [
            {
              id: 'h-product',
              x: 46,
              y: 50,
              caption: 'Wear the piece',
              target: productTarget('midnight-in-lagos-classic-tee'),
            },
            {
              id: 'h-studio',
              x: 76,
              y: 30,
              caption: 'Place it your way',
              target: studioTarget,
            },
          ],
        },
      },
    ],
  },
  {
    slug: 'styling-the-city-portraits-drop',
    title: 'Styling the City Portraits drop',
    category: 'Lookbook',
    excerpt:
      'Three street scenes, three ways to wear them — from the market run to the evening out.',
    readMinutes: 4,
    publishedOn: '2026-07-02',
    intro:
      'The City Portraits drop is built for the everyday. Here is how we styled three of its pieces across a single Lagos day.',
    blocks: [
      { kind: 'heading', text: 'The street, by daylight' },
      {
        kind: 'paragraph',
        text: 'Market Day wants room to breathe, so we paired the long-sleeve with soft neutrals and let the colour do the talking.',
      },
      {
        kind: 'scene',
        scene: {
          id: 'scene-day',
          caption: 'Market Day, styled for the everyday',
          hotspots: [
            {
              id: 'h-market',
              x: 40,
              y: 46,
              caption: 'The long-sleeve',
              target: productTarget('market-day-longsleeve'),
            },
            {
              id: 'h-okada',
              x: 66,
              y: 60,
              caption: 'Okada Run in the gallery',
              target: artworkTarget('okada-run'),
            },
            {
              id: 'h-collection',
              x: 20,
              y: 72,
              caption: 'The full collection',
              target: collectionTarget('city-portraits'),
            },
          ],
        },
      },
      { kind: 'heading', text: 'Layered up for the evening' },
      {
        kind: 'paragraph',
        text: 'As the light drops, the oversized cut takes over. Paper Tigers reads bolder at night.',
      },
      {
        kind: 'scene',
        scene: {
          id: 'scene-night',
          caption: 'Layered up for the evening',
          hotspots: [
            {
              id: 'h-paper',
              x: 50,
              y: 40,
              caption: 'Paper Tigers, oversized',
              target: productTarget('paper-tigers-oversized-tee'),
            },
            {
              id: 'h-studio',
              x: 78,
              y: 66,
              caption: 'Build your own look',
              target: studioTarget,
            },
          ],
        },
      },
    ],
  },
  {
    slug: 'comic-line-telling-it-in-panels',
    title: 'Comic Line: telling it in panels',
    category: 'Studio notes',
    excerpt:
      'The rule behind the Comic Line collection: tell a whole story on a single page of panels.',
    readMinutes: 6,
    publishedOn: '2026-05-15',
    intro:
      'Comic Line borrows the grammar of a comic page — panels, gutters and the occasional speech bubble — to tell a whole story on one sheet. The page is the point.',
    blocks: [
      { kind: 'heading', text: 'The page is the frame' },
      {
        kind: 'paragraph',
        text: 'Composing across panels forces every beat to earn its place. The gutters carry the time between them, so each panel has to land the moment it holds.',
      },
      {
        kind: 'scene',
        scene: {
          id: 'scene-page',
          caption: 'Laying out a Comic Line page',
          hotspots: [
            {
              id: 'h-paper',
              x: 34,
              y: 44,
              caption: 'Paper Tigers',
              target: artworkTarget('paper-tigers'),
            },
            {
              id: 'h-getaway',
              x: 64,
              y: 54,
              caption: 'The Getaway',
              target: artworkTarget('the-getaway'),
            },
            {
              id: 'h-collection',
              x: 50,
              y: 76,
              caption: 'The whole Comic Line',
              target: collectionTarget('comic-line'),
            },
          ],
        },
      },
    ],
  },
];

function toStoryDetail(seed: StorySeed): StoryDetail {
  return { ...seed, shoppableCount: countShoppableItems(seed.blocks) };
}

/**
 * The story's index cover: the drawing behind its first artwork hotspot. Stories carry no cover
 * field of their own, but every one leads with a piece from the gallery, so that piece is the
 * honest tile image. Falls back to null (the dark editorial tile) if none has a plate yet.
 */
function storyCoverImage(blocks: StoryBlock[]): string | null {
  for (const target of storyHotspotTargets(blocks)) {
    if (target.kind === 'artwork') {
      const image = artworkImage(target.slug);
      if (image) return image;
    }
  }
  return null;
}

function toStorySummary(seed: StorySeed): StorySummary {
  const { slug, title, category, excerpt, readMinutes, publishedOn } = seed;
  return {
    slug,
    title,
    category,
    excerpt,
    readMinutes,
    publishedOn,
    shoppableCount: countShoppableItems(seed.blocks),
    coverImage: storyCoverImage(seed.blocks),
  };
}

/**
 * Review seeds (TMS-F5-004), keyed `${targetType}:${slug}`. Deterministic so the
 * aggregate stars match the list. `verifiedPurchase` is a server-vouched flag in
 * the seed data; some targets have no reviews to exercise the empty state. Real
 * read/write/moderation is server-authoritative (TMS-FBR-008).
 */
const reviewSeeds: Record<string, Review[]> = {
  'product:africa-united-white-tee': [
    {
      id: 'rv-auw-1',
      rating: 5,
      title: 'Wears like the studio shot',
      body: 'Print is crisp on the white cotton and the fit is true to size. Exactly what I ordered from Shop.',
      author: 'Amaka D.',
      createdAt: '2026-07-12T10:00:00.000Z',
      verifiedPurchase: true,
    },
  ],
  'product:africa-united-black-tee': [
    {
      id: 'rv-aub-1',
      rating: 5,
      title: 'Black tee, loud print',
      body: 'The duo graphic pops on black. Soft hand-feel after one wash and no fading yet.',
      author: 'Chidi O.',
      createdAt: '2026-07-10T15:20:00.000Z',
      verifiedPurchase: true,
    },
  ],
  'product:resilience-white-tee': [
    {
      id: 'rv-rw-1',
      rating: 4,
      title: 'Poster energy on cotton',
      body: 'Love the type and the heritage symbols. Sized up for a looser street fit and it works.',
      author: 'Zainab M.',
      createdAt: '2026-07-08T09:10:00.000Z',
      verifiedPurchase: true,
    },
  ],
  'product:africa-united-model-tee': [
    {
      id: 'rv-aum-1',
      rating: 5,
      title: 'Looks like the worn photo',
      body: 'Bought the black worn piece and it matches the shop photo. Easy add-to-bag flow, arrived in five days.',
      author: 'Ifeanyi B.',
      createdAt: '2026-07-14T12:40:00.000Z',
      verifiedPurchase: true,
    },
  ],
  'product:midnight-in-lagos-classic-tee': [
    {
      id: 'rv-mil-1',
      rating: 5,
      title: 'The print is the star',
      body: 'Wore it to a gallery opening and got stopped three times. The line work holds up beautifully after a wash.',
      author: 'Ada O.',
      createdAt: '2026-06-28T10:00:00.000Z',
      verifiedPurchase: true,
    },
    {
      id: 'rv-mil-2',
      rating: 4,
      title: 'Lovely, runs a touch large',
      body: 'Gorgeous heavyweight cotton and the colour reads exactly like the artwork. I would size down for a classic fit.',
      author: 'Tunde A.',
      createdAt: '2026-06-15T09:30:00.000Z',
      verifiedPurchase: true,
    },
    {
      id: 'rv-mil-3',
      rating: 5,
      title: 'My most-complimented tee',
      body: 'Soft, well cut and the design feels like wearing a drawing. Delivery to Lagos took four days.',
      author: 'Ngozi E.',
      createdAt: '2026-05-30T14:00:00.000Z',
      verifiedPurchase: false,
    },
  ],
  'product:paper-tigers-oversized-tee': [
    {
      id: 'rv-pt-1',
      rating: 5,
      title: 'Bold and comfortable',
      body: 'The oversized cut is exactly right and the ink sits flat — no cracking after several washes.',
      author: 'Kelechi N.',
      createdAt: '2026-07-01T08:00:00.000Z',
      verifiedPurchase: true,
    },
    {
      id: 'rv-pt-2',
      rating: 3,
      title: 'Great print, wanted heavier fabric',
      body: 'The design is fantastic. The cotton is a little lighter than I expected for the price, but the fit is good.',
      author: 'Bisi K.',
      createdAt: '2026-06-20T11:15:00.000Z',
      verifiedPurchase: true,
    },
  ],
  'artwork:midnight-in-lagos': [
    {
      id: 'rv-a-mil-1',
      rating: 5,
      title: 'A piece with a mood',
      body: 'Bought it on a longsleeve and the artwork carries the whole garment. It really does feel like the city after dark.',
      author: 'Chidi M.',
      createdAt: '2026-06-10T16:45:00.000Z',
      verifiedPurchase: true,
    },
    {
      id: 'rv-a-mil-2',
      rating: 4,
      title: 'Beautiful colour',
      body: 'One of my favourite pieces in the collection. Would love to see it on more garment types.',
      author: 'Zainab I.',
      createdAt: '2026-05-22T12:00:00.000Z',
      verifiedPurchase: false,
    },
  ],
};

/**
 * Community photo seeds (TMS-F5-005). Includes a couple of non-approved photos
 * on purpose so the moderation-aware filter is exercised — the public methods
 * must never surface them. Real UGC + moderation is server-side (TMS-FBR-008).
 */
const communityPhotoSeeds: CommunityPhoto[] = [
  {
    id: 'cp-1',
    artworkSlug: 'midnight-in-lagos',
    artworkTitle: 'Midnight in Lagos',
    handle: '@ada.wears',
    caption: 'Caught the colour just right on the island bridge.',
    status: 'approved',
    createdAt: '2026-07-05T18:00:00.000Z',
  },
  {
    id: 'cp-2',
    artworkSlug: 'paper-tigers',
    artworkTitle: 'Paper Tigers',
    handle: '@kelechi.k',
    caption: 'Oversized fit, all the confidence.',
    status: 'approved',
    createdAt: '2026-07-03T12:30:00.000Z',
  },
  {
    id: 'cp-3',
    artworkSlug: 'market-day',
    artworkTitle: 'Market Day',
    handle: '@bisi.styles',
    caption: 'Market run in the long-sleeve.',
    status: 'approved',
    createdAt: '2026-06-29T09:15:00.000Z',
  },
  {
    id: 'cp-4',
    artworkSlug: 'midnight-in-lagos',
    artworkTitle: 'Midnight in Lagos',
    handle: '@tunde.a',
    caption: 'Layered for the evening.',
    status: 'approved',
    createdAt: '2026-06-25T20:00:00.000Z',
  },
  {
    id: 'cp-5',
    artworkSlug: 'harmattan-bloom',
    artworkTitle: 'Harmattan Bloom',
    handle: '@ngozi.e',
    caption: 'Soft neutrals for dust season.',
    status: 'approved',
    createdAt: '2026-06-20T11:00:00.000Z',
  },
  // Non-approved — must never appear in the public gallery.
  {
    id: 'cp-6',
    artworkSlug: 'paper-tigers',
    artworkTitle: 'Paper Tigers',
    handle: '@pending.user',
    caption: 'Awaiting moderation.',
    status: 'pending',
    createdAt: '2026-07-06T08:00:00.000Z',
  },
  {
    id: 'cp-7',
    artworkSlug: 'okada-run',
    artworkTitle: 'Okada Run',
    handle: '@rejected.user',
    caption: 'Off-brand submission.',
    status: 'rejected',
    createdAt: '2026-07-02T08:00:00.000Z',
  },
];

/**
 * Loyalty rewards catalogue (TMS-F5-010). Illustrative — real earning/redemption
 * is server-authoritative (TMS-FBR-008).
 */
const loyaltyRewards: LoyaltyReward[] = [
  {
    id: 'free-delivery',
    name: 'Free standard delivery',
    description: 'Standard delivery on your next order, on us.',
    pointsCost: 250,
  },
  {
    id: 'off-2k',
    name: '₦2,000 off',
    description: 'Money off your next order of ₦10,000 or more.',
    pointsCost: 400,
  },
  {
    id: 'early-access',
    name: 'Early drop access',
    description: 'A 48-hour head start on the next limited drop.',
    pointsCost: 800,
  },
  {
    id: 'studio-print',
    name: 'Signed studio print',
    description: 'A small signed print tucked into your next order.',
    pointsCost: 1200,
  },
];

/** Deterministic 32-bit hash so a customer's illustrative balance is stable. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function delay<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The placements an administrator has "approved" in mock-land, mirroring the real model:
 * geometry belongs to the placement, and scale presets belong to a placement rather than to the
 * garment. Keeping the mock the same shape as the contract is what stops the UI from growing a
 * dependency the backend would reject (ADR-013).
 */
const MOCK_PLACEMENTS: Array<Omit<StudioPlacement, 'id'> & { slug: string }> = [
  {
    slug: 'left-chest',
    label: 'Left chest',
    area: 'front',
    x: 33,
    y: 30,
    printWidthMm: 100,
    printHeightMm: 125,
    scalePresets: [
      { slug: 'small', label: 'Small', widthPct: 14 },
      { slug: 'medium', label: 'Medium', widthPct: 20 },
    ],
  },
  {
    slug: 'centre-chest',
    label: 'Centre chest',
    area: 'front',
    x: 50,
    y: 38,
    printWidthMm: 280,
    printHeightMm: 350,
    scalePresets: [
      { slug: 'small', label: 'Small', widthPct: 30 },
      { slug: 'medium', label: 'Medium', widthPct: 44 },
      { slug: 'large', label: 'Large', widthPct: 56 },
    ],
  },
  {
    slug: 'full-front',
    label: 'Full front',
    area: 'front',
    x: 50,
    y: 52,
    printWidthMm: 320,
    printHeightMm: 400,
    scalePresets: [
      { slug: 'medium', label: 'Medium', widthPct: 52 },
      { slug: 'large', label: 'Large', widthPct: 64 },
    ],
  },
  {
    slug: 'back',
    label: 'Back',
    area: 'back',
    x: 50,
    y: 42,
    printWidthMm: 320,
    printHeightMm: 400,
    scalePresets: [
      { slug: 'medium', label: 'Medium', widthPct: 48 },
      { slug: 'large', label: 'Large', widthPct: 64 },
    ],
  },
];

/**
 * Build the approved canvas for one artwork+garment pair. Ids are derived from the pair so a
 * shared Studio URL keeps resolving across reloads, the way a real approved id would.
 */
function mockStudioGarment(artworkSlug: string, title: string): StudioGarment {
  const garmentSlug = slugify(title);
  const colours = Object.entries(COLOUR_PALETTE).map(([name, hex]) => ({
    name,
    hex,
    available: true,
  }));
  return {
    slug: garmentSlug,
    title,
    artworkVersionId: `mock-version-${artworkSlug}`,
    colours,
    sizes: SIZES,
    variants: colours.flatMap((colour) =>
      SIZES.map((size) => ({
        id: `mock-variant-${garmentSlug}-${slugify(colour.name)}-${size.toLowerCase()}`,
        colour: colour.name,
        size,
      })),
    ),
    placements: MOCK_PLACEMENTS.map((placement) => ({
      ...placement,
      id: `mock-placement-${artworkSlug}-${garmentSlug}-${placement.slug}`,
    })),
  };
}

/** Deterministic in-memory provider. Types match the real contract for a clean swap. */
export const mockProvider: StorefrontDataProvider = {
  async listArtworks(params: ListArtworksParams = {}): Promise<CursorPage<ArtworkSummary>> {
    let items = [...artworks];
    if (params.collection) {
      items = items.filter((a) => a.collection === params.collection);
    }
    if (params.availability) {
      items = items.filter((a) => a.availability === params.availability);
    }
    // "newest" keeps insertion order; "popular" is a stable deterministic reordering.
    if (params.sort === 'popular') {
      items = items.slice().reverse();
    }
    const limit = params.limit ?? 20;
    return delay({ items: items.slice(0, limit), nextCursor: null });
  },

  async getArtwork(slug: string): Promise<ArtworkDetail | null> {
    const summary = artworks.find((a) => a.slug === slug);
    if (!summary) return delay(null);
    return delay({
      ...summary,
      story: `${summary.shortStory} The full piece is coloured pencil and marker on paper, with colour spent where it matters most.`,
      inspiration: 'Street photography, comic-panel composition, and West African textiles.',
      edition: summary.limitedEdition ? 'Limited edition of 100' : 'Open edition',
      release: '2026',
      related: artworks.filter((a) => a.id !== summary.id).slice(0, 3),
    });
  },

  async getArtworkPassport(slug: string): Promise<ArtworkPassport | null> {
    const detail = await this.getArtwork(slug);
    if (!detail) return delay(null);

    const editionSize = detail.limitedEdition ? 100 : null;
    const edition = detail.edition ?? 'Open edition';
    const release = detail.release ?? '2026';
    const versionId = artworkVersionId({ slug: detail.slug, edition, release });

    const provenance: ProvenanceEvent[] = [
      {
        label: 'Drawn in the studio',
        detail: `${detail.title} — original drawing by the From Africa To You team.`,
        date: release,
      },
      {
        label: 'Published',
        detail: `Released into the ${detail.collection} collection.`,
        date: release,
      },
      editionSize
        ? {
            label: 'Edition opened',
            detail: `A numbered run of ${editionSize} — each piece is serialised when it is purchased.`,
            date: release,
          }
        : {
            label: 'Open edition',
            detail: 'Printed to order with no fixed run size; every piece shares this passport.',
            date: release,
          },
    ];

    return delay({
      artworkSlug: detail.slug,
      title: detail.title,
      collection: detail.collection,
      versionId,
      edition,
      editionSize,
      // Illustrative only — a real serial is assigned to a piece at purchase.
      serialExample: editionSize ? passportSerial(42, editionSize) : null,
      releasedOn: release,
      issuedBy: 'From Africa To You',
      provenance,
    });
  },

  async listCollections(): Promise<string[]> {
    return delay([...new Set(artworks.map((a) => a.collection))].sort());
  },

  async searchArtworks(query: string, limit = 24): Promise<ArtworkSummary[]> {
    return delay(artworks.filter((a) => artworkMatchesQuery(a, query)).slice(0, limit));
  },

  async listCollectionSummaries(): Promise<CollectionSummary[]> {
    return delay(
      collectionMeta.map((c) => ({
        ...c,
        artworkCount: artworks.filter((a) => a.collection === c.name).length,
      })),
    );
  },

  async getCollection(slug: string): Promise<CollectionDetail | null> {
    const meta = collectionMeta.find((c) => c.slug === slug);
    if (!meta) return delay(null);
    const members = artworks.filter((a) => a.collection === meta.name);
    return delay({ ...meta, artworkCount: members.length, artworks: members });
  },

  async listProducts(): Promise<ProductSummary[]> {
    return delay(productSeeds.map(toProductSummary));
  },

  async getProduct(slug: string): Promise<ProductDetail | null> {
    const seed = productSeeds.find((p) => p.slug === slug);
    return delay(seed ? toProductDetail(seed) : null);
  },

  async getStudioOptions(artworkSlug: string): Promise<StudioOptions> {
    const artwork = artworks.find((entry) => entry.slug === artworkSlug);
    if (!artwork) return delay({ garments: [] });
    return delay({
      garments: artwork.compatibleGarments.map((title) => mockStudioGarment(artworkSlug, title)),
    });
  },

  async getDeliveryOptions(): Promise<DeliveryOption[]> {
    return delay([
      {
        id: 'standard',
        label: 'Standard delivery',
        description: 'Tracked courier across Nigeria.',
        priceMinor: 250000,
        currency: 'NGN',
        eta: '3–6 working days',
      },
      {
        id: 'express',
        label: 'Express delivery',
        description: 'Priority dispatch to major cities.',
        priceMinor: 500000,
        currency: 'NGN',
        eta: '1–2 working days',
      },
      {
        id: 'pickup',
        label: 'Studio pickup — Lagos',
        description: 'Collect from the studio in Lagos. We email when it is ready.',
        priceMinor: 0,
        currency: 'NGN',
        eta: 'Ready in 2–4 working days',
      },
    ]);
  },

  async listDrops(): Promise<DropSummary[]> {
    const now = Date.now();
    return delay(dropSeeds.map((seed) => toDropSummary(seed, now)));
  },

  async getDrop(slug: string): Promise<DropDetail | null> {
    const seed = dropSeeds.find((d) => d.slug === slug);
    if (!seed) return delay(null);
    return delay({
      ...toDropSummary(seed, Date.now()),
      story: seed.story,
      artworks: dropArtworks(seed.collection),
    });
  },

  async listStories(): Promise<StorySummary[]> {
    // Newest first.
    return delay(
      storySeeds.map(toStorySummary).sort((a, b) => b.publishedOn.localeCompare(a.publishedOn)),
    );
  },

  async getStory(slug: string): Promise<StoryDetail | null> {
    const seed = storySeeds.find((s) => s.slug === slug);
    return delay(seed ? toStoryDetail(seed) : null);
  },

  async getReviews(targetType: ReviewTargetType, slug: string): Promise<ReviewCollection> {
    const items = (reviewSeeds[`${targetType}:${slug}`] ?? [])
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return delay({ stats: summariseReviews(items), items });
  },

  async listCommunityPhotos(): Promise<CommunityPhoto[]> {
    // Moderation-aware: approved only, newest first.
    return delay(
      filterApproved(communityPhotoSeeds).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async listArtworkCommunityPhotos(slug: string): Promise<CommunityPhoto[]> {
    return delay(
      filterApproved(communityPhotoSeeds)
        .filter((p) => p.artworkSlug === slug)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async getLoyalty(email: string): Promise<LoyaltyProfile> {
    // Deterministic, illustrative balance derived from the email so it is stable
    // per customer across reloads. The real ledger lives server-side.
    const h = hashString(email.trim().toLowerCase());
    const points = 300 + (h % 1300); // 300–1599: spans the Silver/Gold bands
    const lifetimePoints = points + (h % 600);
    const referralCode = `TAI-${h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
    return delay({
      points,
      lifetimePoints,
      memberSince: '2026-01-15',
      referralCode,
      referralRewardText:
        'You both get ₦2,000 off when a friend places their first order with your link.',
      rewards: loyaltyRewards,
    });
  },
};
