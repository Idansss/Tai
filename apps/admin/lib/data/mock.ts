import type { OrderStatus, PaymentStatus, ShippingStatus } from '@tms/contracts';
import { filterArtworks } from '../artworks';
import { filterOrders, paginate } from '../orders';
import type {
  AdminArtworkDetail,
  AdminArtworkListParams,
  AdminArtworkSummary,
  AdminDataProvider,
  AdminOrderDetail,
  AdminOrderItem,
  AdminOrderListParams,
  AdminOrderListResult,
  AdminOrderSummary,
  DashboardData,
  PrintStatus,
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

function printStatusFor(status: OrderStatus): PrintStatus {
  switch (status) {
    case 'PRINTING':
      return 'printing';
    case 'QUALITY_CHECK':
      return 'printed';
    case 'READY_FOR_DISPATCH':
    case 'SHIPMENT_BOOKED':
    case 'SHIPPED':
    case 'DELIVERED':
    case 'COMPLETED':
      return 'qc_passed';
    case 'DELIVERY_EXCEPTION':
      return 'qc_passed';
    default:
      return 'queued';
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
    printStatus: printStatusFor(seed.status),
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
    { id: 'production', label: 'Production queue', count: 14, href: '/production' },
    { id: 'qc', label: 'Quality check', count: 5, href: '/production' },
    { id: 'dispatch', label: 'Ready for dispatch', count: 8, href: '/orders' },
    {
      id: 'exceptions',
      label: 'Delivery exceptions',
      count: 2,
      href: '/orders',
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
};
