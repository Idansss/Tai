import { describe, expect, it } from 'vitest';
import type { AdminProductionJob } from './data/types';
import {
  PRODUCTION_LANES,
  applyStageAction,
  filterJobs,
  formatAge,
  formatPrintStatus,
  groupByStage,
  isPriority,
  printStatusForOrderStatus,
  productionStageForStatus,
  stageActions,
  stageCounts,
  stageLabel,
} from './production';

function job(over: Partial<AdminProductionJob>): AdminProductionJob {
  return {
    reference: 'TMS-AAA111',
    customerName: 'Ada Verify',
    placedAt: '2026-07-15T09:00:00.000Z',
    status: 'PRODUCTION_QUEUED',
    stage: 'queued',
    itemCount: 1,
    items: [],
    shippingStatus: 'QUOTE_PENDING',
    deliveryMethodLabel: 'Standard delivery',
    ...over,
  };
}

describe('productionStageForStatus', () => {
  it('maps in-flight order statuses onto board lanes', () => {
    expect(productionStageForStatus('PAID')).toBe('paid');
    expect(productionStageForStatus('PRODUCTION_QUEUED')).toBe('queued');
    expect(productionStageForStatus('PRINTING')).toBe('printing');
    expect(productionStageForStatus('QUALITY_CHECK')).toBe('quality_check');
    expect(productionStageForStatus('READY_FOR_DISPATCH')).toBe('ready_for_dispatch');
    expect(productionStageForStatus('SHIPMENT_BOOKED')).toBe('dispatched');
    expect(productionStageForStatus('SHIPPED')).toBe('dispatched');
    expect(productionStageForStatus('DELIVERY_EXCEPTION')).toBe('exception');
  });
  it('returns null for off-board statuses', () => {
    expect(productionStageForStatus('AWAITING_PAYMENT')).toBeNull();
    expect(productionStageForStatus('DELIVERED')).toBeNull();
    expect(productionStageForStatus('COMPLETED')).toBeNull();
    expect(productionStageForStatus('CANCELLED')).toBeNull();
    expect(productionStageForStatus('REFUNDED')).toBeNull();
  });
});

describe('stageLabel', () => {
  it('renders readable labels for every lane', () => {
    expect(PRODUCTION_LANES.every((s) => stageLabel(s).length > 0)).toBe(true);
    expect(stageLabel('quality_check')).toBe('Quality check');
    expect(stageLabel('ready_for_dispatch')).toBe('Ready for dispatch');
  });
});

describe('stageActions + applyStageAction', () => {
  it('advances the happy path', () => {
    expect(applyStageAction('PAID', 'queue')).toBe('PRODUCTION_QUEUED');
    expect(applyStageAction('PRODUCTION_QUEUED', 'print')).toBe('PRINTING');
    expect(applyStageAction('PRINTING', 'qc')).toBe('QUALITY_CHECK');
    expect(applyStageAction('QUALITY_CHECK', 'pass')).toBe('READY_FOR_DISPATCH');
    expect(applyStageAction('READY_FOR_DISPATCH', 'dispatch')).toBe('SHIPMENT_BOOKED');
    expect(applyStageAction('SHIPMENT_BOOKED', 'delivered')).toBe('DELIVERED');
  });
  it('offers QC pass + reprint from quality check', () => {
    expect(stageActions('QUALITY_CHECK').map((a) => a.id)).toEqual(['pass', 'reprint']);
    expect(applyStageAction('QUALITY_CHECK', 'reprint')).toBe('PRINTING');
  });
  it('offers a corrective retry from an exception', () => {
    expect(applyStageAction('DELIVERY_EXCEPTION', 'retry')).toBe('READY_FOR_DISPATCH');
  });
  it('ignores actions not offered from the current status', () => {
    expect(applyStageAction('PAID', 'dispatch')).toBe('PAID');
    expect(applyStageAction('DELIVERED', 'queue')).toBe('DELIVERED');
  });
});

describe('filterJobs', () => {
  const jobs = [
    job({ reference: 'TMS-QUEUED1', stage: 'queued', customerName: 'Ada' }),
    job({ reference: 'TMS-PRINT01', stage: 'printing', customerName: 'Bola' }),
    job({ reference: 'TMS-QC00001', stage: 'quality_check', customerName: 'Chidi' }),
  ];
  it('filters by stage', () => {
    expect(filterJobs(jobs, { stage: 'printing' }).map((j) => j.reference)).toEqual([
      'TMS-PRINT01',
    ]);
  });
  it('searches reference and customer name', () => {
    expect(filterJobs(jobs, { query: 'chidi' }).map((j) => j.reference)).toEqual(['TMS-QC00001']);
    expect(filterJobs(jobs, { query: 'queued1' }).map((j) => j.reference)).toEqual(['TMS-QUEUED1']);
  });
  it('returns all with no params', () => {
    expect(filterJobs(jobs)).toHaveLength(3);
  });
});

describe('groupByStage', () => {
  it('groups into pipeline order and drops empty lanes', () => {
    const jobs = [job({ stage: 'printing' }), job({ stage: 'paid' }), job({ stage: 'printing' })];
    const groups = groupByStage(jobs);
    expect(groups.map((g) => g.stage)).toEqual(['paid', 'printing']); // lane order preserved
    expect(groups.find((g) => g.stage === 'printing')?.jobs).toHaveLength(2);
  });
});

describe('stageCounts', () => {
  it('counts every lane, zero when empty', () => {
    const counts = stageCounts([
      job({ stage: 'queued' }),
      job({ stage: 'queued' }),
      job({ stage: 'exception' }),
    ]);
    expect(counts.queued).toBe(2);
    expect(counts.exception).toBe(1);
    expect(counts.printing).toBe(0);
  });
});

describe('formatAge', () => {
  const now = new Date('2026-07-15T12:00:00.000Z');
  it('formats hours and days since placed', () => {
    expect(formatAge('2026-07-15T11:30:00.000Z', now)).toBe('just now');
    expect(formatAge('2026-07-15T08:00:00.000Z', now)).toBe('4h');
    expect(formatAge('2026-07-12T12:00:00.000Z', now)).toBe('3d');
  });
});

describe('isPriority', () => {
  const now = new Date('2026-07-15T12:00:00.000Z');
  it('flags in-production jobs older than the threshold', () => {
    expect(isPriority(job({ stage: 'queued', placedAt: '2026-07-12T12:00:00.000Z' }), now)).toBe(
      true,
    );
    expect(isPriority(job({ stage: 'queued', placedAt: '2026-07-15T09:00:00.000Z' }), now)).toBe(
      false,
    );
  });
  it('never flags dispatched jobs (already out the door)', () => {
    expect(
      isPriority(job({ stage: 'dispatched', placedAt: '2026-07-01T12:00:00.000Z' }), now),
    ).toBe(false);
  });
});

describe('formatPrintStatus', () => {
  it('renders readable per-line labels', () => {
    expect(formatPrintStatus('qc_passed')).toBe('QC passed');
    expect(formatPrintStatus('reprint')).toBe('Reprint');
    expect(formatPrintStatus('queued')).toBe('Queued');
  });
});

describe('printStatusForOrderStatus', () => {
  it('derives the per-line print state from the order status', () => {
    expect(printStatusForOrderStatus('PRODUCTION_QUEUED')).toBe('queued');
    expect(printStatusForOrderStatus('PRINTING')).toBe('printing');
    expect(printStatusForOrderStatus('QUALITY_CHECK')).toBe('printed');
    expect(printStatusForOrderStatus('READY_FOR_DISPATCH')).toBe('qc_passed');
    expect(printStatusForOrderStatus('DELIVERED')).toBe('qc_passed');
    expect(printStatusForOrderStatus('PAID')).toBe('queued');
  });
});
