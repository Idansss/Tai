import type { OrderStatus, PaymentStatus, ShippingStatus } from '@tms/contracts';
import { buildDailySeries, statusBreakdown, type AnalyticsOrderInput } from '../analytics';
import { filterArtworks } from '../artworks';
import {
  deriveCustomerProfile,
  deriveCustomers,
  filterCustomers,
  type CustomerOrderInput,
} from '../customers';
import { filterErrors } from '../errors';
import { countLowStock, filterGarments, totalStock } from '../garments';
import { filterOrders, paginate } from '../orders';
import { filterJobs, printStatusForOrderStatus, productionStageForStatus } from '../production';
import type {
  AdminAnalytics,
  AdminArtworkDetail,
  AdminArtworkListParams,
  AdminArtworkSummary,
  AdminCustomerListParams,
  AdminCustomerSummary,
  AdminDataProvider,
  AdminErrorEntry,
  AdminErrorListParams,
  AdminGarmentDetail,
  AdminGarmentListParams,
  AdminGarmentSummary,
  AdminOrderDetail,
  AdminOrderItem,
  AdminOrderListParams,
  AdminOrderListResult,
  AdminOrderSummary,
  AdminProductionJob,
  AdminProductionListParams,
  DashboardData,
  GarmentColour,
  GarmentVariant,
  PlacementRule,
  PrintArea,
  RankedList,
  SizeChartRow,
} from './types';

/**
 * Typed mock admin adapter. The figures below are representative sample data so
 * the operational surfaces can be designed and reviewed; they are **not real**.
 * Every consuming screen is flagged in FRONTEND_HANDOFF.md until the admin read
 * endpoints land and `apiProvider` replaces this.
 */

/** Format minor units (kobo) as Naira for display, e.g. 486500000 → "₦4,865,000". */
function naira(minor: number): string {
  return `₦${Math.round(minor / 100).toLocaleString('en-NG')}`;
}

// --- Order dataset -------------------------------------------------------------

const paymentForStatus: Partial<Record<OrderStatus, PaymentStatus>> = {
  DRAFT: 'CREATED',
  AWAITING_PAYMENT: 'PENDING',
  PAYMENT_PROCESSING: 'PROCESSING',
  PAYMENT_FAILED: 'FAILED',
  PAYMENT_CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

function paymentStatusFor(status: OrderStatus): PaymentStatus {
  return paymentForStatus[status] ?? 'SUCCEEDED';
}

function shipmentStatusFor(status: OrderStatus): ShippingStatus {
  switch (status) {
    case 'SHIPMENT_BOOKED':
      return 'BOOKED';
    case 'SHIPPED':
      return 'IN_TRANSIT';
    case 'DELIVERED':
    case 'COMPLETED':
      return 'DELIVERED';
    case 'DELIVERY_EXCEPTION':
      return 'DELIVERY_FAILED';
    case 'READY_FOR_DISPATCH':
      return 'PICKUP_SCHEDULED';
    default:
      return 'QUOTE_PENDING';
  }
}

interface OrderSeed {
  reference: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  placedAt: string;
  status: OrderStatus;
  method: 'card' | 'transfer';
  previousOrders: number;
  items: Array<Omit<AdminOrderItem, 'id' | 'printStatus'>>;
}

const SEEDS: OrderSeed[] = [
  {
    reference: 'TMS-5HWEUR',
    name: 'Ada Verify',
    email: 'ada.verify@example.com',
    phone: '08031234567',
    city: 'Lagos',
    state: 'Lagos',
    placedAt: '2026-07-15T09:12:00.000Z',
    status: 'PAID',
    method: 'card',
    previousOrders: 2,
    items: [
      {
        artworkTitle: 'Midnight in Lagos',
        garment: 'Classic T-shirt',
        colour: 'Black',
        size: 'M',
        placement: 'Centre chest',
        quantity: 1,
        unitPriceMinor: 1_200_000,
      },
    ],
  },
  {
    reference: 'TMS-QK83MN',
    name: 'Bola Okoro',
    email: 'bola.okoro@example.com',
    phone: '08029876543',
    city: 'Ibadan',
    state: 'Oyo',
    placedAt: '2026-07-15T07:48:00.000Z',
    status: 'PRINTING',
    method: 'transfer',
    previousOrders: 0,
    items: [
      {
        artworkTitle: 'Harmattan Bloom',
        garment: 'Oversized T-shirt',
        colour: 'Bone',
        size: 'L',
        placement: 'Full front',
        quantity: 1,
        unitPriceMinor: 1_300_000,
      },
      {
        artworkTitle: 'Okada Run',
        garment: 'Classic T-shirt',
        colour: 'Slate',
        size: 'M',
        placement: 'Left chest',
        quantity: 1,
        unitPriceMinor: 1_000_000,
      },
    ],
  },
  {
    reference: 'TMS-7P2XVR',
    name: 'Chidi Nwosu',
    email: 'chidi.nwosu@example.com',
    phone: '08051112222',
    city: 'Enugu',
    state: 'Enugu',
    placedAt: '2026-07-14T16:20:00.000Z',
    status: 'SHIPPED',
    method: 'card',
    previousOrders: 5,
    items: [
      {
        artworkTitle: 'Midnight in Lagos',
        garment: 'Classic T-shirt',
        colour: 'Black',
        size: 'XL',
        placement: 'Centre chest',
        quantity: 1,
        unitPriceMinor: 1_200_000,
      },
    ],
  },
  {
    reference: 'TMS-LM49QP',
    name: 'Ngozi Balogun',
    email: 'ngozi.balogun@example.com',
    phone: '08063334444',
    city: 'Abuja',
    state: 'FCT — Abuja',
    placedAt: '2026-07-14T11:05:00.000Z',
    status: 'PAYMENT_FAILED',
    method: 'card',
    previousOrders: 1,
    items: [
      {
        artworkTitle: 'Paper Tigers',
        garment: 'Oversized T-shirt',
        colour: 'Olive',
        size: 'S',
        placement: 'Full front',
        quantity: 1,
        unitPriceMinor: 1_500_000,
      },
    ],
  },
  {
    reference: 'TMS-33FKDR',
    name: 'Emeka Ade',
    email: 'emeka.ade@example.com',
    phone: '08075556666',
    city: 'Port Harcourt',
    state: 'Rivers',
    placedAt: '2026-07-14T08:30:00.000Z',
    status: 'DELIVERED',
    method: 'transfer',
    previousOrders: 3,
    items: [
      {
        artworkTitle: 'Lantern Keeper',
        garment: 'Classic T-shirt',
        colour: 'Bone',
        size: 'M',
        placement: 'Centre chest',
        quantity: 2,
        unitPriceMinor: 1_250_000,
      },
    ],
  },
];

// A pool used to generate additional representative orders for pagination.
const POOL_NAMES = [
  ['Funke Adeyemi', 'funke.adeyemi@example.com', 'Lagos', 'Lagos'],
  ['Tunde Bakare', 'tunde.bakare@example.com', 'Ibadan', 'Oyo'],
  ['Amaka Obi', 'amaka.obi@example.com', 'Onitsha', 'Anambra'],
  ['Yusuf Bello', 'yusuf.bello@example.com', 'Kano', 'Kano'],
  ['Zainab Musa', 'zainab.musa@example.com', 'Kaduna', 'Kaduna'],
  ['Segun Cole', 'segun.cole@example.com', 'Abeokuta', 'Ogun'],
  ['Ifeoma Eze', 'ifeoma.eze@example.com', 'Awka', 'Anambra'],
  ['Kelechi Umeh', 'kelechi.umeh@example.com', 'Owerri', 'Imo'],
] as const;

const POOL_STATUSES: OrderStatus[] = [
  'PAID',
  'PRODUCTION_QUEUED',
  'PRINTING',
  'QUALITY_CHECK',
  'READY_FOR_DISPATCH',
  'SHIPMENT_BOOKED',
  'SHIPPED',
  'DELIVERED',
  'AWAITING_PAYMENT',
  'DELIVERY_EXCEPTION',
];

const POOL_ARTWORKS = [
  ['Rainy Season', 'Classic T-shirt', 'Black', 1_150_000],
  ['Market Day', 'Oversized T-shirt', 'Sand', 1_350_000],
  ['The Getaway', 'Classic T-shirt', 'Slate', 1_200_000],
  ['Harmattan Bloom', 'Classic T-shirt', 'Bone', 1_250_000],
] as const;

/** Cyclically pick a defined element (modulo keeps the index in range). */
function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length] as T;
}

const SIZES = ['S', 'M', 'L', 'XL'] as const;
const REF_A = ['A', 'B', 'C', 'D'] as const;
const REF_B = ['3', '7', '9', '2'] as const;

function makeAdditionalSeeds(): OrderSeed[] {
  const seeds: OrderSeed[] = [];
  for (let i = 0; i < 19; i += 1) {
    const [name, email, city, state] = pick(POOL_NAMES, i);
    const status = pick(POOL_STATUSES, i);
    const [artworkTitle, garment, colour, price] = pick(POOL_ARTWORKS, i);
    const day = 13 - Math.floor(i / 2);
    const hour = 8 + (i % 10);
    seeds.push({
      reference: `TMS-${(i + 1).toString().padStart(2, '0')}${pick(REF_A, i)}K${pick(REF_B, i)}`,
      name,
      email,
      phone: `0803${(1000000 + i * 13337).toString().slice(0, 7)}`,
      city,
      state,
      placedAt: `2026-07-${day.toString().padStart(2, '0')}T${hour
        .toString()
        .padStart(2, '0')}:15:00.000Z`,
      status,
      method: i % 2 === 0 ? 'card' : 'transfer',
      previousOrders: i % 5,
      items: [
        {
          artworkTitle,
          garment,
          colour,
          size: pick(SIZES, i),
          placement: 'Centre chest',
          quantity: (i % 2) + 1,
          unitPriceMinor: price,
        },
      ],
    });
  }
  return seeds;
}

const VAT_RATE = 0.075;

function buildOrder(seed: OrderSeed): AdminOrderDetail {
  const items: AdminOrderItem[] = seed.items.map((it, i) => ({
    ...it,
    id: `${seed.reference}-L${i + 1}`,
    printStatus: printStatusForOrderStatus(seed.status),
  }));
  const subtotalMinor = items.reduce((sum, it) => sum + it.unitPriceMinor * it.quantity, 0);
  const discountMinor = 0;
  const deliveryMinor = 250_000; // ₦2,500
  const taxMinor = Math.round((subtotalMinor - discountMinor) * VAT_RATE);
  const totalMinor = subtotalMinor - discountMinor + deliveryMinor + taxMinor;
  const paymentStatus = paymentStatusFor(seed.status);
  const paid = paymentStatus === 'SUCCEEDED';

  return {
    reference: seed.reference,
    customerName: seed.name,
    customerEmail: seed.email,
    placedAt: seed.placedAt,
    status: seed.status,
    paymentStatus,
    itemCount: items.reduce((n, it) => n + it.quantity, 0),
    totalMinor,
    currency: 'NGN',
    items,
    customer: {
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      previousOrders: seed.previousOrders,
    },
    delivery: {
      fullName: seed.name,
      addressLine1: `${(seed.reference.charCodeAt(4) % 40) + 1} Studio Way`,
      city: seed.city,
      state: seed.state,
    },
    deliveryMethodLabel: 'Standard delivery',
    payment: {
      method: seed.method,
      status: paymentStatus,
      providerReference: `FLW-${seed.reference.slice(4)}`,
      paidAt: paid ? seed.placedAt : undefined,
    },
    shipment: {
      carrier: 'GIG Logistics',
      trackingNumber: ['SHIPPED', 'DELIVERED', 'DELIVERY_EXCEPTION'].includes(seed.status)
        ? `GIG${seed.reference.slice(4)}`
        : undefined,
      status: shipmentStatusFor(seed.status),
      eta: '2–4 working days',
    },
    subtotalMinor,
    discountMinor,
    deliveryMinor,
    taxMinor,
  };
}

const ORDERS: AdminOrderDetail[] = [...SEEDS, ...makeAdditionalSeeds()].map(buildOrder);

function toSummary(o: AdminOrderDetail): AdminOrderSummary {
  return {
    reference: o.reference,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    placedAt: o.placedAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    itemCount: o.itemCount,
    totalMinor: o.totalMinor,
    currency: o.currency,
  };
}

const ORDER_SUMMARIES: AdminOrderSummary[] = ORDERS.map(toSummary).sort((a, b) =>
  b.placedAt.localeCompare(a.placedAt),
);

// --- Production board (derived from orders) ------------------------------------

/** Map an order onto a production job, or null when it is off the board. */
function toProductionJob(o: AdminOrderDetail): AdminProductionJob | null {
  const stage = productionStageForStatus(o.status);
  if (!stage) return null;
  return {
    reference: o.reference,
    customerName: o.customerName,
    placedAt: o.placedAt,
    status: o.status,
    stage,
    itemCount: o.itemCount,
    items: o.items,
    shippingStatus: o.shipment.status,
    deliveryMethodLabel: o.deliveryMethodLabel,
  };
}

/** Active jobs, oldest first — the studio works the production queue FIFO. */
const PRODUCTION_JOBS: AdminProductionJob[] = ORDERS.map(toProductionJob)
  .filter((j): j is AdminProductionJob => j !== null)
  .sort((a, b) => a.placedAt.localeCompare(b.placedAt));

// --- Dashboard -----------------------------------------------------------------

const DASHBOARD: DashboardData = {
  metrics: [
    {
      id: 'revenue',
      label: 'Revenue',
      value: naira(486_500_000),
      caption: 'Last 30 days',
      trend: { direction: 'up', label: '+12%' },
    },
    {
      id: 'paid-orders',
      label: 'Paid orders',
      value: '128',
      caption: 'Last 30 days',
      trend: { direction: 'up', label: '+9%' },
    },
    {
      id: 'aov',
      label: 'Average order value',
      value: naira(3_800_000),
      caption: 'Last 30 days',
      trend: { direction: 'flat', label: '±0%' },
    },
    {
      id: 'pending-payments',
      label: 'Pending payments',
      value: '6',
      caption: 'Awaiting confirmation',
      tone: 'warning',
    },
    {
      id: 'failed-payments',
      label: 'Failed payments',
      value: '3',
      caption: 'Last 7 days',
      tone: 'danger',
    },
    {
      id: 'low-stock',
      label: 'Low-stock variants',
      value: '4',
      caption: 'Below threshold',
      tone: 'warning',
    },
  ],
  queues: [
    {
      id: 'production',
      label: 'Production queue',
      count: PRODUCTION_JOBS.filter((j) => j.stage === 'queued' || j.stage === 'printing').length,
      href: '/production',
    },
    {
      id: 'qc',
      label: 'Quality check',
      count: PRODUCTION_JOBS.filter((j) => j.stage === 'quality_check').length,
      href: '/production?stage=quality_check',
    },
    {
      id: 'dispatch',
      label: 'Ready for dispatch',
      count: PRODUCTION_JOBS.filter((j) => j.stage === 'ready_for_dispatch').length,
      href: '/production?stage=ready_for_dispatch',
    },
    {
      id: 'exceptions',
      label: 'Delivery exceptions',
      count: PRODUCTION_JOBS.filter((j) => j.stage === 'exception').length,
      href: '/production?stage=exception',
      tone: 'danger',
    },
  ],
  rankedLists: [
    {
      id: 'top-artwork',
      title: 'Top artwork',
      items: [
        { id: 'a1', label: 'Midnight in Lagos', value: '42 sold' },
        { id: 'a2', label: 'Harmattan Bloom', value: '31 sold' },
        { id: 'a3', label: 'Okada Run', value: '27 sold' },
      ],
    },
    {
      id: 'best-garment',
      title: 'Best garments',
      items: [
        { id: 'g1', label: 'Classic T-shirt', value: '96 sold' },
        { id: 'g2', label: 'Oversized T-shirt', value: '54 sold' },
      ],
    },
    {
      id: 'best-colours',
      title: 'Best colours',
      items: [
        { id: 'c1', label: 'Black', value: '61 sold' },
        { id: 'c2', label: 'Bone', value: '38 sold' },
        { id: 'c3', label: 'Slate', value: '22 sold' },
      ],
    },
  ],
  // Derived from the order dataset so the dashboard's links resolve to real detail.
  recentOrders: ORDER_SUMMARIES.slice(0, 5).map((o) => ({
    reference: o.reference,
    customerName: o.customerName,
    placedAt: o.placedAt,
    status: o.status,
    totalMinor: o.totalMinor,
    currency: o.currency,
  })),
  openIssues: 2,
};

// --- Artworks ------------------------------------------------------------------

const GARMENTS = ['Classic T-shirt', 'Oversized T-shirt'];
const PLACEMENTS = ['Left chest', 'Centre chest', 'Full front', 'Back'];

const ARTWORKS: AdminArtworkDetail[] = [
  {
    id: 'aw-midnight-in-lagos',
    slug: 'midnight-in-lagos',
    title: 'Midnight in Lagos',
    collection: 'Night Studies',
    status: 'published',
    versionCount: 2,
    mockupCount: 2,
    updatedAt: '2026-07-14T10:00:00.000Z',
    story: 'A neon-soaked ode to Lagos after dark — okadas streaking past shuttered stalls.',
    tags: ['lagos', 'night', 'comic-line'],
    seoTitle: 'Midnight in Lagos — art-led apparel',
    seoDescription: 'Original comic-line artwork of Lagos at night, printed on considered apparel.',
    limitedEdition: true,
    editionSize: 100,
    compatibleGarments: GARMENTS,
    placements: ['Centre chest', 'Full front', 'Back'],
    versions: [
      { id: 'v1', label: 'v1 — master', processing: 'ready', issues: [] },
      { id: 'v2', label: 'v2 — recolour', processing: 'ready', issues: [] },
    ],
    mockups: [
      { id: 'm1', label: 'Black · front', view: 'front', approval: 'approved' },
      { id: 'm2', label: 'Black · back', view: 'back', approval: 'approved' },
    ],
  },
  {
    id: 'aw-harmattan-bloom',
    slug: 'harmattan-bloom',
    title: 'Harmattan Bloom',
    collection: 'Season Sketches',
    status: 'ready',
    versionCount: 1,
    mockupCount: 2,
    updatedAt: '2026-07-13T14:30:00.000Z',
    story: 'Dust-hazed florals from the dry season, drawn in fine ink line.',
    tags: ['harmattan', 'floral'],
    seoTitle: 'Harmattan Bloom',
    seoDescription: 'Fine-line floral artwork inspired by the harmattan season.',
    limitedEdition: false,
    compatibleGarments: GARMENTS,
    placements: ['Centre chest', 'Full front'],
    versions: [{ id: 'v1', label: 'v1 — master', processing: 'ready', issues: [] }],
    mockups: [
      { id: 'm1', label: 'Bone · front', view: 'front', approval: 'approved' },
      { id: 'm2', label: 'Bone · back', view: 'back', approval: 'pending' },
    ],
  },
  {
    id: 'aw-okada-run',
    slug: 'okada-run',
    title: 'Okada Run',
    collection: 'Street',
    status: 'needs_review',
    versionCount: 1,
    mockupCount: 1,
    updatedAt: '2026-07-15T08:05:00.000Z',
    story: 'A blur of motion — the everyday sprint of the okada rider.',
    tags: ['okada', 'motion', 'street'],
    seoTitle: 'Okada Run',
    seoDescription: 'Motion-blur comic artwork of a Lagos okada rider.',
    limitedEdition: false,
    compatibleGarments: ['Classic T-shirt'],
    placements: ['Left chest', 'Full front'],
    versions: [
      {
        id: 'v1',
        label: 'v1 — master',
        processing: 'failed',
        issues: ['Resolution below 300dpi at print size', 'Transparent background not detected'],
      },
    ],
    mockups: [{ id: 'm1', label: 'Slate · front', view: 'front', approval: 'pending' }],
  },
  {
    id: 'aw-lantern-keeper',
    slug: 'lantern-keeper',
    title: 'Lantern Keeper',
    collection: 'Night Studies',
    status: 'scheduled',
    versionCount: 1,
    mockupCount: 2,
    updatedAt: '2026-07-12T09:00:00.000Z',
    story: 'A quiet figure tending lanterns along the waterfront.',
    tags: ['lantern', 'night'],
    seoTitle: 'Lantern Keeper',
    seoDescription: 'Nocturne artwork of a lantern keeper on the waterfront.',
    limitedEdition: true,
    editionSize: 50,
    compatibleGarments: GARMENTS,
    placements: PLACEMENTS,
    scheduledFor: '2026-07-20T09:00:00.000Z',
    versions: [{ id: 'v1', label: 'v1 — master', processing: 'ready', issues: [] }],
    mockups: [
      { id: 'm1', label: 'Bone · front', view: 'front', approval: 'approved' },
      { id: 'm2', label: 'Bone · back', view: 'back', approval: 'approved' },
    ],
  },
  {
    id: 'aw-paper-tigers',
    slug: 'paper-tigers',
    title: 'Paper Tigers',
    collection: 'Street',
    status: 'processing',
    versionCount: 1,
    mockupCount: 0,
    updatedAt: '2026-07-15T09:40:00.000Z',
    story: 'Bold poster-style tigers cut from newsprint textures.',
    tags: ['tiger', 'poster'],
    seoTitle: 'Paper Tigers',
    seoDescription: 'Poster-style tiger artwork with newsprint texture.',
    limitedEdition: false,
    compatibleGarments: ['Oversized T-shirt'],
    placements: ['Full front'],
    versions: [{ id: 'v1', label: 'v1 — master', processing: 'processing', issues: [] }],
    mockups: [],
  },
  {
    id: 'aw-market-day',
    slug: 'market-day',
    title: 'Market Day',
    collection: 'Season Sketches',
    status: 'draft',
    versionCount: 1,
    mockupCount: 2,
    updatedAt: '2026-07-11T16:20:00.000Z',
    story: 'The choreography of a busy market morning.',
    tags: ['market', 'crowd'],
    seoTitle: 'Market Day',
    seoDescription: 'Line artwork capturing a Lagos market morning.',
    limitedEdition: false,
    compatibleGarments: GARMENTS,
    placements: ['Centre chest', 'Full front'],
    versions: [{ id: 'v1', label: 'v1 — master', processing: 'ready', issues: [] }],
    mockups: [
      { id: 'm1', label: 'Sand · front', view: 'front', approval: 'pending' },
      { id: 'm2', label: 'Sand · back', view: 'back', approval: 'pending' },
    ],
  },
  {
    id: 'aw-rainy-season',
    slug: 'rainy-season',
    title: 'Rainy Season',
    collection: 'Season Sketches',
    status: 'archived',
    versionCount: 1,
    mockupCount: 2,
    updatedAt: '2026-06-30T12:00:00.000Z',
    story: 'Umbrellas and puddles under a heavy sky.',
    tags: ['rain', 'season'],
    seoTitle: 'Rainy Season',
    seoDescription: 'Rainy-season street artwork.',
    limitedEdition: false,
    compatibleGarments: GARMENTS,
    placements: ['Centre chest'],
    versions: [{ id: 'v1', label: 'v1 — master', processing: 'ready', issues: [] }],
    mockups: [
      { id: 'm1', label: 'Black · front', view: 'front', approval: 'approved' },
      { id: 'm2', label: 'Black · back', view: 'back', approval: 'approved' },
    ],
  },
];

function toArtworkSummary(a: AdminArtworkDetail): AdminArtworkSummary {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    collection: a.collection,
    status: a.status,
    versionCount: a.versionCount,
    mockupCount: a.mockupCount,
    updatedAt: a.updatedAt,
  };
}

const ARTWORK_SUMMARIES: AdminArtworkSummary[] = ARTWORKS.map(toArtworkSummary).sort((a, b) =>
  b.updatedAt.localeCompare(a.updatedAt),
);

// --- Garments ------------------------------------------------------------------

/** A shared colour palette; each garment offers a subset. */
const COLOUR_LIB: Record<string, Omit<GarmentColour, 'available'>> = {
  black: { id: 'black', name: 'Black', hex: '#1b1b1b' },
  bone: { id: 'bone', name: 'Bone', hex: '#e8e2d6' },
  slate: { id: 'slate', name: 'Slate', hex: '#4a5568' },
  olive: { id: 'olive', name: 'Olive', hex: '#5b6236' },
  sand: { id: 'sand', name: 'Sand', hex: '#c9b191' },
  grey: { id: 'grey', name: 'Heather grey', hex: '#9aa0a6' },
  natural: { id: 'natural', name: 'Natural', hex: '#d8ccb4' },
};

const TEE_SIZE_CHART: SizeChartRow[] = [
  { size: 'XS', chestCm: 46, lengthCm: 66, sleeveCm: 19 },
  { size: 'S', chestCm: 51, lengthCm: 69, sleeveCm: 20 },
  { size: 'M', chestCm: 56, lengthCm: 72, sleeveCm: 21 },
  { size: 'L', chestCm: 61, lengthCm: 74, sleeveCm: 22 },
  { size: 'XL', chestCm: 66, lengthCm: 76, sleeveCm: 23 },
  { size: 'XXL', chestCm: 71, lengthCm: 78, sleeveCm: 24 },
];

const TEE_PRINT_AREAS: PrintArea[] = [
  { id: 'pa-front', view: 'front', label: 'Front A3', widthCm: 30, heightCm: 40 },
  { id: 'pa-back', view: 'back', label: 'Back A3', widthCm: 32, heightCm: 42 },
];

const TEE_PLACEMENTS: PlacementRule[] = [
  { id: 'pl-left-chest', view: 'front', label: 'Left chest', allowed: true },
  { id: 'pl-centre-chest', view: 'front', label: 'Centre chest', allowed: true },
  { id: 'pl-full-front', view: 'front', label: 'Full front', allowed: true },
  { id: 'pl-back', view: 'back', label: 'Full back', allowed: true },
];

interface GarmentSeed {
  id: string;
  slug: string;
  name: string;
  template: string;
  status: AdminGarmentSummary['status'];
  priceMinor: number;
  updatedAt: string;
  description: string;
  fabric: string;
  fit: string;
  care: string[];
  colourIds: string[];
  /** Colour ids that are currently discontinued (offered = false). */
  discontinued?: string[];
  sizes: string[];
  sizeChart: SizeChartRow[];
  printAreas: PrintArea[];
  placements: PlacementRule[];
  /** Placement ids that are disallowed for this garment. */
  disallowedPlacements?: string[];
  /** Deterministic base stock; varied per variant so low/out states appear. */
  baseStock: number;
}

const GARMENT_SEEDS: GarmentSeed[] = [
  {
    id: 'gm-classic-tee',
    slug: 'classic-t-shirt',
    name: 'Classic T-shirt',
    template: 'Classic T-shirt',
    status: 'active',
    priceMinor: 1_200_000,
    updatedAt: '2026-07-14T10:00:00.000Z',
    description: 'The studio staple — a mid-weight crew tee cut for an everyday, true-to-size fit.',
    fabric: '100% combed ring-spun cotton, 180gsm',
    fit: 'Regular, true to size',
    care: ['Machine wash cold, inside out', 'Do not tumble dry', 'Warm iron, avoid the print'],
    colourIds: ['black', 'bone', 'slate', 'olive'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    sizeChart: TEE_SIZE_CHART,
    printAreas: TEE_PRINT_AREAS,
    placements: TEE_PLACEMENTS,
    baseStock: 14,
  },
  {
    id: 'gm-oversized-tee',
    slug: 'oversized-t-shirt',
    name: 'Oversized T-shirt',
    template: 'Oversized T-shirt',
    status: 'active',
    priceMinor: 1_500_000,
    updatedAt: '2026-07-13T09:30:00.000Z',
    description:
      'A relaxed, boxy tee with dropped shoulders — the gallery canvas for full-front art.',
    fabric: '100% heavyweight cotton, 240gsm',
    fit: 'Oversized, size down for a regular fit',
    care: ['Machine wash cold, inside out', 'Do not tumble dry', 'Cool iron, avoid the print'],
    colourIds: ['bone', 'sand', 'black'],
    sizes: ['S', 'M', 'L', 'XL'],
    sizeChart: TEE_SIZE_CHART.slice(1, 5),
    printAreas: TEE_PRINT_AREAS,
    placements: TEE_PLACEMENTS,
    disallowedPlacements: ['pl-left-chest'],
    baseStock: 9,
  },
  {
    id: 'gm-long-sleeve',
    slug: 'long-sleeve-tee',
    name: 'Long-sleeve Tee',
    template: 'Long-sleeve Tee',
    status: 'active',
    priceMinor: 1_600_000,
    updatedAt: '2026-07-12T15:10:00.000Z',
    description: 'A clean long-sleeve crew for harmattan mornings and layered looks.',
    fabric: '100% combed cotton, 200gsm',
    fit: 'Regular, true to size',
    care: ['Machine wash cold', 'Do not tumble dry', 'Warm iron, avoid the print'],
    colourIds: ['black', 'slate', 'bone'],
    discontinued: ['bone'],
    sizes: ['S', 'M', 'L', 'XL'],
    sizeChart: TEE_SIZE_CHART.slice(1, 5),
    printAreas: TEE_PRINT_AREAS,
    placements: TEE_PLACEMENTS,
    baseStock: 7,
  },
  {
    id: 'gm-crewneck',
    slug: 'crewneck-sweatshirt',
    name: 'Crewneck Sweatshirt',
    template: 'Sweatshirt',
    status: 'draft',
    priceMinor: 2_400_000,
    updatedAt: '2026-07-11T11:45:00.000Z',
    description:
      'A brushed-back crewneck in development — colours and stock still being finalised.',
    fabric: '80% cotton / 20% polyester fleece, 320gsm',
    fit: 'Regular, true to size',
    care: ['Machine wash cold', 'Do not tumble dry', 'Do not iron the print'],
    colourIds: ['grey', 'black'],
    sizes: ['S', 'M', 'L', 'XL'],
    sizeChart: TEE_SIZE_CHART.slice(1, 5),
    printAreas: [
      { id: 'pa-front', view: 'front', label: 'Front A4', widthCm: 28, heightCm: 35 },
      { id: 'pa-back', view: 'back', label: 'Back A3', widthCm: 32, heightCm: 42 },
    ],
    placements: TEE_PLACEMENTS,
    baseStock: 0,
  },
  {
    id: 'gm-hoodie',
    slug: 'pullover-hoodie',
    name: 'Pullover Hoodie',
    template: 'Hoodie',
    status: 'active',
    priceMinor: 2_800_000,
    updatedAt: '2026-07-13T16:20:00.000Z',
    description: 'A heavyweight pullover hoodie with a kangaroo pocket and double-lined hood.',
    fabric: '80% cotton / 20% polyester fleece, 350gsm',
    fit: 'Regular, roomy through the body',
    care: ['Machine wash cold', 'Do not tumble dry', 'Do not iron the print'],
    colourIds: ['black', 'olive', 'grey'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    sizeChart: TEE_SIZE_CHART.slice(1),
    printAreas: [
      {
        id: 'pa-front',
        view: 'front',
        label: 'Front A4 (below pocket)',
        widthCm: 26,
        heightCm: 32,
      },
      { id: 'pa-back', view: 'back', label: 'Back A3', widthCm: 32, heightCm: 42 },
    ],
    placements: [
      { id: 'pl-left-chest', view: 'front', label: 'Left chest', allowed: true },
      { id: 'pl-centre-chest', view: 'front', label: 'Centre chest', allowed: false },
      { id: 'pl-full-front', view: 'front', label: 'Full front', allowed: true },
      { id: 'pl-back', view: 'back', label: 'Full back', allowed: true },
    ],
    baseStock: 5,
  },
  {
    id: 'gm-cap',
    slug: 'studio-cap',
    name: 'Studio Cap',
    template: 'Cap',
    status: 'active',
    priceMinor: 900_000,
    updatedAt: '2026-07-10T08:00:00.000Z',
    description: 'A six-panel cotton cap with an adjustable strap — one size fits most.',
    fabric: '100% cotton twill',
    fit: 'One size, adjustable',
    care: ['Spot clean only', 'Do not machine wash', 'Reshape while damp'],
    colourIds: ['black', 'bone'],
    sizes: ['OS'],
    sizeChart: [{ size: 'OS', chestCm: 0, lengthCm: 0, sleeveCm: 0 }],
    printAreas: [{ id: 'pa-front', view: 'front', label: 'Front panel', widthCm: 10, heightCm: 6 }],
    placements: [{ id: 'pl-front-panel', view: 'front', label: 'Front panel', allowed: true }],
    baseStock: 12,
  },
  {
    id: 'gm-tote',
    slug: 'canvas-tote',
    name: 'Canvas Tote',
    template: 'Tote',
    status: 'archived',
    priceMinor: 700_000,
    updatedAt: '2026-06-28T12:00:00.000Z',
    description: 'A retired heavyweight canvas tote — kept for reference and reprints.',
    fabric: '100% cotton canvas, 340gsm',
    fit: 'One size',
    care: ['Machine wash cold', 'Do not tumble dry', 'Iron inside out'],
    colourIds: ['natural'],
    sizes: ['OS'],
    sizeChart: [{ size: 'OS', chestCm: 0, lengthCm: 0, sleeveCm: 0 }],
    printAreas: [{ id: 'pa-front', view: 'front', label: 'Front', widthCm: 24, heightCm: 30 }],
    placements: [{ id: 'pl-front', view: 'front', label: 'Front', allowed: true }],
    baseStock: 3,
  },
];

/**
 * Deterministic per-variant stock so low/out states appear predictably: the base
 * stock is nudged by the colour and size indices, and every 5th cell is emptied.
 */
function stockFor(base: number, colourIdx: number, sizeIdx: number): number {
  const cell = colourIdx * 4 + sizeIdx;
  if (cell % 5 === 0) return 0;
  const value = base + ((colourIdx * 3 + sizeIdx * 2) % 9) - 3;
  return Math.max(0, value);
}

function buildGarment(seed: GarmentSeed): AdminGarmentDetail {
  const colours: GarmentColour[] = seed.colourIds.map((id) => ({
    ...COLOUR_LIB[id]!,
    available: !(seed.discontinued ?? []).includes(id),
  }));
  const variants: GarmentVariant[] = [];
  seed.colourIds.forEach((colourId, ci) => {
    seed.sizes.forEach((size, si) => {
      variants.push({ colourId, size, stock: stockFor(seed.baseStock, ci, si) });
    });
  });
  const placements = seed.placements.map((p) =>
    (seed.disallowedPlacements ?? []).includes(p.id) ? { ...p, allowed: false } : p,
  );

  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    template: seed.template,
    status: seed.status,
    colourCount: colours.filter((c) => c.available).length,
    sizeCount: seed.sizes.length,
    priceMinor: seed.priceMinor,
    currency: 'NGN',
    lowStockCount: countLowStock(variants, colours),
    totalStock: totalStock(variants),
    updatedAt: seed.updatedAt,
    description: seed.description,
    fabric: seed.fabric,
    fit: seed.fit,
    care: seed.care,
    frontMediaLabel: `${seed.name} — front (flat lay)`,
    backMediaLabel: `${seed.name} — back (flat lay)`,
    colours,
    sizes: seed.sizes.map((label) => ({ label })),
    variants,
    sizeChart: seed.sizeChart,
    printAreas: seed.printAreas,
    placements,
  };
}

const GARMENT_RECORDS: AdminGarmentDetail[] = GARMENT_SEEDS.map(buildGarment);

function toGarmentSummary(g: AdminGarmentDetail): AdminGarmentSummary {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    template: g.template,
    status: g.status,
    colourCount: g.colourCount,
    sizeCount: g.sizeCount,
    priceMinor: g.priceMinor,
    currency: g.currency,
    lowStockCount: g.lowStockCount,
    totalStock: g.totalStock,
    updatedAt: g.updatedAt,
  };
}

const GARMENT_SUMMARIES: AdminGarmentSummary[] = GARMENT_RECORDS.map(toGarmentSummary).sort(
  (a, b) => b.updatedAt.localeCompare(a.updatedAt),
);

// --- Error centre (F4-006) -----------------------------------------------------

/**
 * Representative integration failures. **Safe by construction** — each carries a
 * correlation ID + human summary only, never a stack trace, payload or secret.
 */
const ERRORS: AdminErrorEntry[] = [
  {
    id: 'err-01',
    correlationId: 'req_9f2ac31b',
    source: 'payment',
    severity: 'critical',
    resolution: 'open',
    message: 'Payment verification callback did not arrive within the timeout window.',
    occurredAt: '2026-07-15T09:20:00.000Z',
    affectedOrder: 'TMS-LM49QP',
    retryable: true,
  },
  {
    id: 'err-02',
    correlationId: 'whk_5c8de104',
    source: 'webhook',
    severity: 'error',
    resolution: 'investigating',
    message: 'Provider webhook signature could not be validated; event was rejected.',
    occurredAt: '2026-07-15T08:05:00.000Z',
    affectedOrder: 'TMS-QK83MN',
    retryable: true,
  },
  {
    id: 'err-03',
    correlationId: 'img_71b0aa9e',
    source: 'image_processing',
    severity: 'error',
    resolution: 'retrying',
    message: 'Artwork print-file rasterisation failed on the first attempt; a retry is queued.',
    occurredAt: '2026-07-14T17:42:00.000Z',
    retryable: true,
  },
  {
    id: 'err-04',
    correlationId: 'shp_2ad9f6c0',
    source: 'shipping',
    severity: 'warning',
    resolution: 'open',
    message: 'Carrier rate quote was unavailable for the destination; a fallback rate was used.',
    occurredAt: '2026-07-14T13:15:00.000Z',
    affectedOrder: 'TMS-7P2XVR',
    retryable: true,
  },
  {
    id: 'err-05',
    correlationId: 'eml_88c1247d',
    source: 'email',
    severity: 'warning',
    resolution: 'resolved',
    message: 'Order-confirmation email bounced once, then delivered on retry.',
    occurredAt: '2026-07-14T10:02:00.000Z',
    affectedOrder: 'TMS-33FKDR',
    retryable: false,
  },
  {
    id: 'err-06',
    correlationId: 'aig_4e6f0b22',
    source: 'ai',
    severity: 'warning',
    resolution: 'ignored',
    message: 'AI mockup suggestion timed out; the manual mockup flow was used instead.',
    occurredAt: '2026-07-13T15:48:00.000Z',
    retryable: true,
  },
  {
    id: 'err-07',
    correlationId: 'job_1d7c9f55',
    source: 'background_job',
    severity: 'error',
    resolution: 'open',
    message: 'Nightly inventory reconciliation job exited before completing all garments.',
    occurredAt: '2026-07-13T02:00:00.000Z',
    retryable: true,
  },
  {
    id: 'err-08',
    correlationId: 'pay_6b3e1af7',
    source: 'payment',
    severity: 'error',
    resolution: 'resolved',
    message: 'A refund request was declined by the provider; it was re-submitted successfully.',
    occurredAt: '2026-07-12T11:30:00.000Z',
    affectedOrder: 'TMS-5HWEUR',
    retryable: false,
  },
  {
    id: 'err-09',
    correlationId: 'whk_0aa4c7e9',
    source: 'webhook',
    severity: 'warning',
    resolution: 'resolved',
    message: 'A duplicate provider event was received and safely de-duplicated.',
    occurredAt: '2026-07-11T19:12:00.000Z',
    retryable: false,
  },
  {
    id: 'err-10',
    correlationId: 'shp_3f9b6d81',
    source: 'shipping',
    severity: 'critical',
    resolution: 'investigating',
    message: 'Dispatch booking was rejected by the carrier API; the shipment is on hold.',
    occurredAt: '2026-07-11T09:55:00.000Z',
    affectedOrder: 'TMS-7P2XVR',
    retryable: true,
  },
];

// --- Customers + analytics (F4-006, derived from orders) -----------------------

/** The dataset's "today" — anchors derivations to the sample data, not the wall clock. */
const DATASET_NOW = new Date(
  ORDERS.reduce((latest, o) => (o.placedAt > latest ? o.placedAt : latest), ORDERS[0]!.placedAt),
);

function toCustomerOrder(o: AdminOrderDetail): CustomerOrderInput {
  return {
    reference: o.reference,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    phone: o.customer.phone,
    city: o.delivery.city,
    state: o.delivery.state,
    placedAt: o.placedAt,
    status: o.status,
    paid: o.paymentStatus === 'SUCCEEDED',
    itemCount: o.itemCount,
    totalMinor: o.totalMinor,
    currency: o.currency,
  };
}

const CUSTOMER_ORDERS: CustomerOrderInput[] = ORDERS.map(toCustomerOrder);
const CUSTOMERS: AdminCustomerSummary[] = deriveCustomers(CUSTOMER_ORDERS, DATASET_NOW);

const ANALYTICS_ORDERS: AnalyticsOrderInput[] = ORDERS.map((o) => ({
  placedAt: o.placedAt,
  status: o.status,
  paid: o.paymentStatus === 'SUCCEEDED',
  totalMinor: o.totalMinor,
}));

/** Build a top-N ranked list from order items by a chosen key. */
function rankItems(
  key: (item: AdminOrderItem) => string,
  id: string,
  title: string,
  limit = 3,
): RankedList {
  const tally = new Map<string, number>();
  for (const o of ORDERS) {
    for (const item of o.items) {
      tally.set(key(item), (tally.get(key(item)) ?? 0) + item.quantity);
    }
  }
  const items = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count], i) => ({ id: `${id}-${i}`, label, value: `${count} sold` }));
  return { id, title, items };
}

function buildAnalytics(): AdminAnalytics {
  const paid = ANALYTICS_ORDERS.filter((o) => o.paid);
  const revenueMinor = paid.reduce((sum, o) => sum + o.totalMinor, 0);
  const aovMinor = paid.length > 0 ? Math.round(revenueMinor / paid.length) : 0;
  return {
    currency: 'NGN',
    kpis: [
      { id: 'revenue', label: 'Revenue', value: naira(revenueMinor), caption: 'Last 14 days' },
      {
        id: 'orders',
        label: 'Orders',
        value: String(ANALYTICS_ORDERS.length),
        caption: 'Last 14 days',
      },
      { id: 'paid', label: 'Paid orders', value: String(paid.length), caption: 'Last 14 days' },
      { id: 'aov', label: 'Average order value', value: naira(aovMinor), caption: 'Paid orders' },
    ],
    daily: buildDailySeries(ANALYTICS_ORDERS, 14, DATASET_NOW),
    statusBreakdown: statusBreakdown(ANALYTICS_ORDERS),
    topArtwork: rankItems((i) => i.artworkTitle, 'top-artwork', 'Top artwork'),
    topGarments: rankItems((i) => i.garment, 'top-garments', 'Best garments'),
  };
}

const ANALYTICS: AdminAnalytics = buildAnalytics();

export const mockAdminProvider: AdminDataProvider = {
  getDashboard() {
    return Promise.resolve(DASHBOARD);
  },
  listOrders(params: AdminOrderListParams = {}) {
    const { query, status, page = 1, pageSize = 10 } = params;
    const filtered = filterOrders(ORDER_SUMMARIES, { query, status });
    const result: AdminOrderListResult = paginate(filtered, page, pageSize);
    return Promise.resolve(result);
  },
  getOrder(reference: string) {
    return Promise.resolve(ORDERS.find((o) => o.reference === reference) ?? null);
  },
  listArtworks(params: AdminArtworkListParams = {}) {
    return Promise.resolve(filterArtworks(ARTWORK_SUMMARIES, params));
  },
  getArtwork(id: string) {
    return Promise.resolve(ARTWORKS.find((a) => a.id === id) ?? null);
  },
  listGarments(params: AdminGarmentListParams = {}) {
    return Promise.resolve(filterGarments(GARMENT_SUMMARIES, params));
  },
  getGarment(id: string) {
    return Promise.resolve(GARMENT_RECORDS.find((g) => g.id === id) ?? null);
  },
  listProductionJobs(params: AdminProductionListParams = {}) {
    return Promise.resolve(filterJobs(PRODUCTION_JOBS, params));
  },
  listErrors(params: AdminErrorListParams = {}) {
    return Promise.resolve(filterErrors(ERRORS, params));
  },
  listCustomers(params: AdminCustomerListParams = {}) {
    return Promise.resolve(filterCustomers(CUSTOMERS, params));
  },
  getCustomer(id: string) {
    return Promise.resolve(deriveCustomerProfile(CUSTOMER_ORDERS, id, DATASET_NOW));
  },
  getAnalytics() {
    return Promise.resolve(ANALYTICS);
  },
};
