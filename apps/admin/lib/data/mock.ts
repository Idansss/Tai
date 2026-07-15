import type { AdminDataProvider, DashboardData } from './types';

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
  recentOrders: [
    {
      reference: 'TMS-5HWEUR',
      customerName: 'Ada Verify',
      placedAt: '2026-07-15T09:12:00.000Z',
      status: 'PAID',
      totalMinor: 1_540_000,
      currency: 'NGN',
    },
    {
      reference: 'TMS-QK83MN',
      customerName: 'Bola Okoro',
      placedAt: '2026-07-15T07:48:00.000Z',
      status: 'PRINTING',
      totalMinor: 2_290_000,
      currency: 'NGN',
    },
    {
      reference: 'TMS-7P2XVR',
      customerName: 'Chidi Nwosu',
      placedAt: '2026-07-14T16:20:00.000Z',
      status: 'SHIPPED',
      totalMinor: 1_200_000,
      currency: 'NGN',
    },
    {
      reference: 'TMS-LM49QP',
      customerName: 'Ngozi Balogun',
      placedAt: '2026-07-14T11:05:00.000Z',
      status: 'PAYMENT_FAILED',
      totalMinor: 1_800_000,
      currency: 'NGN',
    },
    {
      reference: 'TMS-33FKDR',
      customerName: 'Emeka Ade',
      placedAt: '2026-07-14T08:30:00.000Z',
      status: 'DELIVERED',
      totalMinor: 3_100_000,
      currency: 'NGN',
    },
  ],
  openIssues: 2,
};

export const mockAdminProvider: AdminDataProvider = {
  getDashboard() {
    return Promise.resolve(DASHBOARD);
  },
};
