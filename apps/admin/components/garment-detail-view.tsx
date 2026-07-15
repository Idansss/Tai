'use client';

import { Alert, Badge, Heading, Skeleton, Text, cn } from '@tms/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  adminDataProvider,
  type AdminGarmentDetail,
  type GarmentColour,
  type GarmentStatus,
  type GarmentVariant,
} from '@/lib/data';
import {
  applyGarmentAction,
  countLowStock,
  findVariant,
  formatGarmentStatus,
  formatNaira,
  type GarmentAction,
  garmentActions,
  garmentStatusTone,
  setColourAvailability,
  setVariantStock,
  stockLevel,
  stockLevelLabel,
  stockLevelTone,
  totalStock,
} from '@/lib/garments';

function Panel({ title, children, id }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-[var(--radius-lg)] border border-line bg-surface p-5"
    >
      <Heading as={2} id={id} size="md" className="mb-4">
        {title}
      </Heading>
      {children}
    </section>
  );
}

/** A tile standing in for garment media until the asset store exists. */
function MediaTile({ label }: { label: string }) {
  return (
    <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-canvas-2 p-4 text-center">
      <span className="text-xs uppercase tracking-[0.08em] text-muted">No image</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function GarmentDetailView({ id }: { id: string }) {
  const [garment, setGarment] = useState<AdminGarmentDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<GarmentStatus>('draft');
  const [colours, setColours] = useState<GarmentColour[]>([]);
  const [variants, setVariants] = useState<GarmentVariant[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminDataProvider.getGarment(id).then((g) => {
      if (!active) return;
      setGarment(g);
      if (g) {
        setStatus(g.status);
        setColours(g.colours);
        setVariants(g.variants);
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [id]);

  function runAction(action: GarmentAction) {
    const next = applyGarmentAction(status, action);
    setStatus(next);
    setNotice(
      `Preview build — this would call the catalogue API. Status set to “${formatGarmentStatus(next)}” locally.`,
    );
  }

  function editStock(colourId: string, size: string, value: string) {
    const parsed = Number.parseInt(value, 10);
    setVariants((current) => setVariantStock(current, colourId, size, parsed));
    setNotice('Preview build — stock edits update the table locally and are not saved.');
  }

  function toggleColour(colourId: string, available: boolean) {
    setColours((current) => setColourAvailability(current, colourId, available));
    setNotice('Preview build — colour availability changes are not saved.');
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!garment) {
    return (
      <div className="space-y-6">
        <Link
          href="/garments"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Garments
        </Link>
        <Alert tone="warning" title="Garment not found">
          No garment matches <span className="font-medium">{id}</span>.
        </Alert>
      </div>
    );
  }

  const actions = garmentActions(status);
  const sizes = garment.sizes;
  const lowCount = countLowStock(variants, colours);
  const stockTotal = totalStock(variants);
  const frontPlacements = garment.placements.filter((p) => p.view === 'front');
  const backPlacements = garment.placements.filter((p) => p.view === 'back');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/garments"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Garments
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <Heading as={1} size="display-lg">
                {garment.name}
              </Heading>
              <Badge tone={garmentStatusTone(status)}>{formatGarmentStatus(status)}</Badge>
            </div>
            <Text tone="secondary" className="mt-1">
              {garment.template} · {formatNaira(garment.priceMinor)}
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => runAction(a.id)}
                className={cn(
                  'inline-flex h-10 items-center rounded-md px-4 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                  a.primary
                    ? 'bg-accent text-on-accent hover:brightness-110'
                    : 'border border-line-2 text-ink hover:bg-canvas-2',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {notice ? (
          <Alert tone="info" title="Preview">
            {notice}
          </Alert>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          {/* Media */}
          <Panel title="Media" id="media-heading">
            <div className="grid grid-cols-2 gap-4 sm:max-w-md">
              <div>
                <span className="mb-2 block text-xs uppercase tracking-[0.06em] text-muted">
                  Front
                </span>
                <MediaTile label={garment.frontMediaLabel} />
              </div>
              <div>
                <span className="mb-2 block text-xs uppercase tracking-[0.06em] text-muted">
                  Back
                </span>
                <MediaTile label={garment.backMediaLabel} />
              </div>
            </div>
            <Text size="sm" tone="muted" className="mt-3">
              Flat-lay media is uploaded once the catalogue API lands — placeholders shown for now.
            </Text>
          </Panel>

          {/* Colours */}
          <Panel title="Colours" id="colours-heading">
            <ul className="flex flex-wrap gap-2">
              {colours.map((c) => (
                <li key={c.id}>
                  <label
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
                      c.available ? 'border-line-2 text-ink' : 'border-line text-muted',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={c.available}
                      onChange={(e) => toggleColour(c.id, e.target.checked)}
                      className="size-4 accent-[var(--color-accent)]"
                    />
                    <span
                      className="inline-block size-4 shrink-0 rounded-full border border-line"
                      style={{ backgroundColor: c.hex }}
                      aria-hidden
                    />
                    {c.name}
                    {!c.available ? <span className="text-xs">(discontinued)</span> : null}
                  </label>
                </li>
              ))}
            </ul>
            <Text size="sm" tone="muted" className="mt-3">
              Unchecking a colour retires it from the storefront and excludes it from low-stock
              alerts.
            </Text>
          </Panel>

          {/* Inventory matrix */}
          <Panel title="Inventory" id="inventory-heading">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="neutral">{stockTotal} units on hand</Badge>
              {lowCount > 0 ? (
                <Badge tone="warning">{lowCount} need restock</Badge>
              ) : (
                <Badge tone="success">Stock healthy</Badge>
              )}
            </div>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[32rem] text-sm">
                <caption className="sr-only">
                  On-hand stock by colour and size. Edit a cell to adjust the count.
                </caption>
                <thead>
                  <tr className="border-b border-line bg-canvas-2 text-left text-xs uppercase tracking-[0.06em] text-muted">
                    <th scope="col" className="px-3 py-2 font-medium">
                      Colour
                    </th>
                    {sizes.map((s) => (
                      <th key={s.label} scope="col" className="px-3 py-2 text-center font-medium">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colours.map((c) => (
                    <tr
                      key={c.id}
                      className={cn(
                        'border-b border-line last:border-b-0',
                        !c.available && 'opacity-50',
                      )}
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-left font-normal text-ink whitespace-nowrap"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-3 shrink-0 rounded-full border border-line"
                            style={{ backgroundColor: c.hex }}
                            aria-hidden
                          />
                          {c.name}
                        </span>
                      </th>
                      {sizes.map((s) => {
                        const v = findVariant(variants, c.id, s.label);
                        const stock = v?.stock ?? 0;
                        const level = stockLevel(stock);
                        return (
                          <td key={s.label} className="px-3 py-2 text-center">
                            <label className="sr-only" htmlFor={`stock-${c.id}-${s.label}`}>
                              {c.name} size {s.label} stock
                            </label>
                            <input
                              id={`stock-${c.id}-${s.label}`}
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={stock}
                              disabled={!c.available}
                              onChange={(e) => editStock(c.id, s.label, e.target.value)}
                              aria-describedby={`stocklvl-${c.id}-${s.label}`}
                              className={cn(
                                'h-9 w-16 rounded-md border bg-canvas px-2 text-center text-sm tabular-nums text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed',
                                level === 'out'
                                  ? 'border-[var(--color-error)]'
                                  : level === 'low'
                                    ? 'border-[var(--color-warning)]'
                                    : 'border-line-2',
                              )}
                            />
                            <span id={`stocklvl-${c.id}-${s.label}`} className="sr-only">
                              {stockLevelLabel(level)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-[var(--color-error)]" />
                {stockLevelLabel('out')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-[var(--color-warning)]" />
                {stockLevelLabel('low')} (≤ 6)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-[var(--color-success)]" />
                {stockLevelLabel('ok')}
              </span>
            </div>
          </Panel>

          {/* Size chart */}
          <Panel title="Size chart" id="sizechart-heading">
            {garment.sizeChart.some((r) => r.chestCm > 0) ? (
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full min-w-[24rem] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-canvas-2 text-left text-xs uppercase tracking-[0.06em] text-muted">
                      <th scope="col" className="px-3 py-2 font-medium">
                        Size
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Chest (cm)
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Length (cm)
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Sleeve (cm)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {garment.sizeChart.map((r) => (
                      <tr key={r.size} className="border-b border-line last:border-b-0">
                        <th scope="row" className="px-3 py-2 text-left font-normal text-ink">
                          {r.size}
                        </th>
                        <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                          {r.chestCm}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                          {r.lengthCm}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                          {r.sleeveCm}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Text size="sm" tone="muted">
                One-size garment — no size chart.
              </Text>
            )}
          </Panel>

          {/* Print-safe areas + placement rules */}
          <Panel title="Print areas & placement rules" id="print-heading">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-2 block text-xs uppercase tracking-[0.06em] text-muted">
                  Print-safe areas
                </span>
                <ul className="space-y-2">
                  {garment.printAreas.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm"
                    >
                      <span className="text-ink">
                        <span className="capitalize">{p.view}</span> · {p.label}
                      </span>
                      <span className="tabular-nums text-ink-2">
                        {p.widthCm} × {p.heightCm} cm
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="mb-2 block text-xs uppercase tracking-[0.06em] text-muted">
                  Placement rules
                </span>
                <ul className="space-y-2">
                  {[...frontPlacements, ...backPlacements].map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm"
                    >
                      <span className="text-ink">
                        {p.label} <span className="text-muted">({p.view})</span>
                      </span>
                      <Badge tone={p.allowed ? 'success' : 'neutral'}>
                        {p.allowed ? 'Allowed' : 'Disabled'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Panel title="Details" id="details-heading">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">Description</dt>
                <dd className="text-ink-2">{garment.description}</dd>
              </div>
              <div>
                <dt className="text-muted">Fabric</dt>
                <dd className="text-ink">{garment.fabric}</dd>
              </div>
              <div>
                <dt className="text-muted">Fit</dt>
                <dd className="text-ink">{garment.fit}</dd>
              </div>
              <div>
                <dt className="text-muted">Care</dt>
                <dd>
                  <ul className="mt-1 list-inside list-disc text-ink-2">
                    {garment.care.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Pricing & availability" id="pricing-heading">
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Price</dt>
                <dd className="tabular-nums text-ink">{formatNaira(garment.priceMinor)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Colours offered</dt>
                <dd className="tabular-nums text-ink-2">
                  {colours.filter((c) => c.available).length} / {colours.length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Total stock</dt>
                <dd className="tabular-nums text-ink-2">{stockTotal}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Need restock</dt>
                <dd>
                  <Badge tone={stockLevelTone(lowCount > 0 ? 'low' : 'ok')}>{lowCount}</Badge>
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
