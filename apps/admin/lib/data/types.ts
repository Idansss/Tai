import type { OrderStatus, PaymentStatus, ShippingStatus } from '@tms/contracts';

/**
 * Admin view models. These are the operational shapes the mock adapter produces
 * today and the API adapter will map real admin read endpoints into once Codex
 * publishes them (see docs/coordination/FRONTEND_TO_BACKEND.md). Shared enums
 * (order/payment/shipping status) come from @tms/contracts so the mock and the
 * real backend speak the same language.
 *
 * The admin platform has **no backend yet** — every screen runs on the typed
 * mock adapter and is recorded in FRONTEND_HANDOFF.md until it is swapped.
 */

/** A headline metric for the dashboard, with an optional delta vs. prior period. */
export interface DashboardMetric {
  id: string;
  label: string;
  /** Preformatted display value (currency/number already rendered). */
  value: string;
  /** Optional supporting caption, e.g. "30 days" or "vs. last week". */
  caption?: string;
  /** Optional trend for the caption chip. */
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  /** Draws attention (e.g. failed payments, delivery exceptions) when > 0. */
  tone?: 'default' | 'warning' | 'danger';
}

/** A live operational queue tile (production, QC, dispatch, exceptions…). */
export interface QueueTile {
  id: string;
  label: string;
  count: number;
  /** Route this tile deep-links into once the section exists. */
  href: string;
  tone?: 'default' | 'warning' | 'danger';
}

/** A ranked "best performing" list row. */
export interface RankedItem {
  id: string;
  label: string;
  /** Preformatted secondary value, e.g. "42 sold" or "₦1.2m". */
  value: string;
}

export interface RankedList {
  id: string;
  title: string;
  items: RankedItem[];
}

/** A recent order row for the dashboard's activity panel. */
export interface RecentOrderRow {
  reference: string;
  customerName: string;
  placedAt: string;
  status: OrderStatus;
  totalMinor: number;
  currency: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  queues: QueueTile[];
  rankedLists: RankedList[];
  recentOrders: RecentOrderRow[];
  /** Count of unresolved entries in the error centre (integration failures). */
  openIssues: number;
}

// --- Orders (F4-002) -----------------------------------------------------------

export type PrintStatus = 'queued' | 'printing' | 'printed' | 'qc_passed' | 'reprint';

export interface AdminOrderItem {
  id: string;
  artworkTitle: string;
  garment: string;
  colour: string;
  size: string;
  placement?: string;
  quantity: number;
  unitPriceMinor: number;
  /** Production/print state for this line. */
  printStatus: PrintStatus;
}

export interface AdminOrderSummary {
  reference: string;
  customerName: string;
  customerEmail: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  itemCount: number;
  totalMinor: number;
  currency: string;
}

export interface AdminCustomerDetail {
  name: string;
  email: string;
  phone: string;
  /** Count of the customer's prior orders (for context). */
  previousOrders: number;
}

export interface AdminDeliveryAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
}

export interface AdminPaymentDetail {
  method: 'card' | 'transfer';
  status: PaymentStatus;
  providerReference: string;
  paidAt?: string;
}

export interface AdminShipmentDetail {
  carrier: string;
  trackingNumber?: string;
  status: ShippingStatus;
  eta: string;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  items: AdminOrderItem[];
  customer: AdminCustomerDetail;
  delivery: AdminDeliveryAddress;
  deliveryMethodLabel: string;
  payment: AdminPaymentDetail;
  shipment: AdminShipmentDetail;
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number;
  taxMinor: number;
}

export interface AdminOrderListParams {
  /** Free-text search over reference / customer name / email. */
  query?: string;
  /** Filter to a single order status, or all. */
  status?: OrderStatus | 'all';
  /** 1-based page number. */
  page?: number;
  pageSize?: number;
}

export interface AdminOrderListResult {
  items: AdminOrderSummary[];
  /** Total matching the filter (before pagination). */
  total: number;
  page: number;
  pageSize: number;
}

// --- Artworks (F4-003) ---------------------------------------------------------

export type ArtworkStatus =
  'draft' | 'processing' | 'needs_review' | 'ready' | 'scheduled' | 'published' | 'archived';

export type MockupApproval = 'pending' | 'approved' | 'rejected';
export type VersionProcessing = 'processing' | 'ready' | 'failed';

export interface AdminArtworkSummary {
  id: string;
  slug: string;
  title: string;
  collection: string;
  status: ArtworkStatus;
  versionCount: number;
  mockupCount: number;
  updatedAt: string;
}

export interface ArtworkVersion {
  id: string;
  label: string;
  processing: VersionProcessing;
  /** Validation problems the processor flagged (empty when clean). */
  issues: string[];
}

export interface ArtworkMockup {
  id: string;
  label: string;
  view: 'front' | 'back';
  approval: MockupApproval;
}

export interface AdminArtworkDetail extends AdminArtworkSummary {
  story: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  limitedEdition: boolean;
  editionSize?: number;
  compatibleGarments: string[];
  placements: string[];
  versions: ArtworkVersion[];
  mockups: ArtworkMockup[];
  /** ISO date a scheduled artwork goes live (when status is 'scheduled'). */
  scheduledFor?: string;
}

export interface AdminArtworkListParams {
  query?: string;
  status?: ArtworkStatus | 'all';
}

// --- Garments (F4-004) ---------------------------------------------------------

export type GarmentStatus = 'active' | 'draft' | 'archived';

export interface GarmentColour {
  id: string;
  name: string;
  /** Swatch colour, e.g. "#1c1c1c". */
  hex: string;
  /** Whether this colourway is currently offered. */
  available: boolean;
}

export interface GarmentSize {
  label: string;
}

/** Stock for one colour×size variant. */
export interface GarmentVariant {
  colourId: string;
  size: string;
  stock: number;
}

/** A row of the printed size chart (body measurements, in cm). */
export interface SizeChartRow {
  size: string;
  chestCm: number;
  lengthCm: number;
  sleeveCm: number;
}

/** A print-safe area — the maximum printable box on the front or back. */
export interface PrintArea {
  id: string;
  view: 'front' | 'back';
  label: string;
  widthCm: number;
  heightCm: number;
}

/** A placement rule — where artwork may sit, and whether it's currently allowed. */
export interface PlacementRule {
  id: string;
  label: string;
  view: 'front' | 'back';
  allowed: boolean;
}

export interface AdminGarmentSummary {
  id: string;
  slug: string;
  name: string;
  /** The base template this garment derives from (e.g. "Classic T-shirt"). */
  template: string;
  status: GarmentStatus;
  colourCount: number;
  sizeCount: number;
  priceMinor: number;
  currency: string;
  /** Variants at or below the low-stock threshold (incl. out of stock), available colours only. */
  lowStockCount: number;
  totalStock: number;
  updatedAt: string;
}

export interface AdminGarmentDetail extends AdminGarmentSummary {
  description: string;
  fabric: string;
  fit: string;
  care: string[];
  /** Placeholder media descriptors (no real asset store yet). */
  frontMediaLabel: string;
  backMediaLabel: string;
  colours: GarmentColour[];
  sizes: GarmentSize[];
  /** The colour×size stock matrix. */
  variants: GarmentVariant[];
  sizeChart: SizeChartRow[];
  printAreas: PrintArea[];
  placements: PlacementRule[];
}

export interface AdminGarmentListParams {
  query?: string;
  status?: GarmentStatus | 'all';
}

/** The admin data access surface. Extended per F4 task (garments, …). */
export interface AdminDataProvider {
  getDashboard(): Promise<DashboardData>;
  listOrders(params?: AdminOrderListParams): Promise<AdminOrderListResult>;
  getOrder(reference: string): Promise<AdminOrderDetail | null>;
  listArtworks(params?: AdminArtworkListParams): Promise<AdminArtworkSummary[]>;
  getArtwork(id: string): Promise<AdminArtworkDetail | null>;
  listGarments(params?: AdminGarmentListParams): Promise<AdminGarmentSummary[]>;
  getGarment(id: string): Promise<AdminGarmentDetail | null>;
}
