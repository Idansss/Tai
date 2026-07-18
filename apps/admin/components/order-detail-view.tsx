'use client';

import { Alert, Badge, Heading, Skeleton, Text, cn } from '@tms/ui';
import { Check, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminPageHeader } from '@/components/admin-page-header';
import { adminDataProvider, type AdminOrderDetail } from '@/lib/data';
import { useAdminAuth } from './admin-auth-provider';
import {
  formatEnumLabel,
  formatOrderStatus,
  formatPaymentStatus,
  formatShippingStatus,
  orderStatusTone,
  paymentStatusTone,
} from '@/lib/order-status';
import { orderTimeline } from '@/lib/orders';
import { formatPrintStatus, printStatusTone } from '@/lib/production';
import {
  addNote,
  type InternalNote,
  makeNote,
  readNotes,
  removeNote,
  writeNotes,
} from '@/lib/order-notes';

function money(minor: number): string {
  return `₦${Math.round(minor / 100).toLocaleString('en-NG')}`;
}

function Panel({ title, children, id }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-[var(--radius-lg)] border border-line bg-surface p-5"
    >
      <Heading
        as={2}
        id={id}
        size="md"
        className="mb-4 font-display text-sm font-bold uppercase tracking-wide"
      >
        {title}
      </Heading>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

export function OrderDetailView({ reference }: { reference: string }) {
  const { user } = useAdminAuth();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [draft, setDraft] = useState('');
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminDataProvider.getOrder(reference).then((o) => {
      if (!active) return;
      setOrder(o);
      setLoaded(true);
    });
    setNotes(readNotes(reference));
    return () => {
      active = false;
    };
  }, [reference]);

  function submitNote(event: React.FormEvent) {
    event.preventDefault();
    const note = makeNote(draft, user?.name ?? 'Staff');
    if (!note) return;
    const next = addNote(notes, note);
    setNotes(next);
    writeNotes(reference, next);
    setDraft('');
  }

  function deleteNote(id: string) {
    const next = removeNote(notes, id);
    setNotes(next);
    writeNotes(reference, next);
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

  if (!order) {
    return (
      <div className="space-y-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 rounded-sm text-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Orders
        </Link>
        <Alert tone="warning" title="Order not found">
          No order matches reference <span className="font-medium">{reference}</span>. It may have
          been removed or the link is incorrect.
        </Alert>
      </div>
    );
  }

  const timeline = orderTimeline(order.status);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 rounded-sm text-xs font-medium uppercase tracking-[0.08em] text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Orders
        </Link>
        <AdminPageHeader
          title={order.reference}
          lead={`Placed ${new Date(order.placedAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}`}
          action={
            <div className="flex items-center gap-2">
              <Badge tone={orderStatusTone(order.status)}>{formatOrderStatus(order.status)}</Badge>
              <Badge tone={paymentStatusTone(order.payment.status)}>
                {formatPaymentStatus(order.payment.status)}
              </Badge>
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        {/* Main column */}
        <div className="space-y-6">
          {/* Timeline */}
          <Panel title="Status timeline" id="timeline-heading">
            <ol className="space-y-0">
              {timeline.map((step, i) => {
                const done = step.state === 'done';
                return (
                  <li key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-full border',
                          done
                            ? 'border-transparent bg-[var(--color-success)] text-white'
                            : 'border-[var(--color-accent-primary)] text-accent',
                        )}
                        aria-hidden
                      >
                        {done ? (
                          <Check className="size-3.5" />
                        ) : (
                          <span className="size-2 rounded-full bg-accent" />
                        )}
                      </span>
                      {i < timeline.length - 1 ? (
                        <span className="mt-1 w-px flex-1 bg-[var(--color-success)]" />
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        'pb-5 text-sm',
                        step.state === 'current' ? 'font-medium text-ink' : 'text-ink-2',
                      )}
                    >
                      {step.label}
                      {step.state === 'current' ? (
                        <span className="ml-2 text-xs text-accent">Current</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>

          {/* Items + production */}
          <Panel title="Items & production" id="items-heading">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-[0.06em] text-muted">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Item
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Production
                    </th>
                    <th scope="col" className="px-3 py-2 text-center font-medium">
                      Qty
                    </th>
                    <th scope="col" className="py-2 pl-3 text-right font-medium">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-line last:border-b-0">
                      <td className="py-3 pr-3">
                        <span className="block text-ink">{item.artworkTitle}</span>
                        <span className="block text-xs text-muted">
                          {item.garment} · {item.colour} · {item.size}
                          {item.placement ? ` · ${item.placement}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={printStatusTone(item.printStatus)}>
                          {formatPrintStatus(item.printStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums text-ink-2">
                        {item.quantity}
                      </td>
                      <td className="py-3 pl-3 text-right tabular-nums text-ink">
                        {money(item.unitPriceMinor * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Payment + shipment */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Panel title="Payment" id="payment-heading">
              <dl>
                <DetailRow label="Method" value={formatEnumLabel(order.payment.method)} />
                <DetailRow
                  label="Status"
                  value={
                    <Badge tone={paymentStatusTone(order.payment.status)}>
                      {formatPaymentStatus(order.payment.status)}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Provider ref"
                  value={
                    <span className="font-mono text-xs">{order.payment.providerReference}</span>
                  }
                />
                {order.payment.paidAt ? (
                  <DetailRow
                    label="Paid"
                    value={new Date(order.payment.paidAt).toLocaleDateString()}
                  />
                ) : null}
              </dl>
            </Panel>

            <Panel title="Shipment" id="shipment-heading">
              <dl>
                <DetailRow label="Carrier" value={order.shipment.carrier} />
                <DetailRow label="Status" value={formatShippingStatus(order.shipment.status)} />
                <DetailRow
                  label="Tracking"
                  value={
                    order.shipment.trackingNumber ? (
                      <span className="font-mono text-xs">{order.shipment.trackingNumber}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )
                  }
                />
                <DetailRow label="ETA" value={order.shipment.eta} />
              </dl>
            </Panel>
          </div>

          {/* Internal notes */}
          <Panel title="Internal notes" id="notes-heading">
            <form onSubmit={submitNote} className="space-y-2">
              <label htmlFor="note" className="sr-only">
                Add an internal note
              </label>
              <textarea
                id="note"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Add a note for the team (visible to staff only)…"
                className="w-full rounded-md border border-line-2 bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add note
                </button>
              </div>
            </form>
            {notes.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {notes.map((note) => (
                  <li key={note.id} className="rounded-md border border-line p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span>
                        {note.author} · {new Date(note.at).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        className="rounded-sm text-muted underline-offset-2 outline-none hover:text-error hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-ink-2">{note.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Text size="sm" tone="muted" className="mt-3">
                No notes yet. Notes are stored locally in this preview build.
              </Text>
            )}
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Panel title="Customer" id="customer-heading">
            <div className="space-y-1 text-sm">
              <p className="font-medium text-ink">{order.customer.name}</p>
              <p className="text-ink-2">{order.customer.email}</p>
              <p className="text-ink-2">{order.customer.phone}</p>
              <p className="pt-1 text-xs text-muted">
                {order.customer.previousOrders} previous order
                {order.customer.previousOrders === 1 ? '' : 's'}
              </p>
            </div>
          </Panel>

          <Panel title="Delivery" id="delivery-heading">
            <address className="text-sm not-italic text-ink-2">
              {order.delivery.fullName}
              <br />
              {order.delivery.addressLine1}
              {order.delivery.addressLine2 ? (
                <>
                  <br />
                  {order.delivery.addressLine2}
                </>
              ) : null}
              <br />
              {order.delivery.city}, {order.delivery.state}
            </address>
            <Text size="sm" tone="muted" className="mt-2">
              {order.deliveryMethodLabel}
            </Text>
          </Panel>

          <Panel title="Totals" id="totals-heading">
            <dl>
              <DetailRow label="Subtotal" value={money(order.subtotalMinor)} />
              {order.discountMinor > 0 ? (
                <DetailRow label="Discount" value={`−${money(order.discountMinor)}`} />
              ) : null}
              <DetailRow label="Delivery" value={money(order.deliveryMinor)} />
              <DetailRow label="VAT" value={money(order.taxMinor)} />
              <div className="mt-1 border-t border-line pt-2">
                <DetailRow
                  label="Total"
                  value={<span className="text-base font-medium">{money(order.totalMinor)}</span>}
                />
              </div>
            </dl>
          </Panel>

          <Panel title="Actions" id="actions-heading">
            <div className="grid grid-cols-1 gap-2">
              {['Print asset', 'Packing slip', 'Resend notification', 'Refund', 'Return'].map(
                (label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setActionNote(
                        `“${label}” will be available once the admin order API is connected — no action was taken.`,
                      )
                    }
                    className="inline-flex h-10 items-center justify-center rounded-md border border-line-2 px-3 text-sm text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
            <div aria-live="polite" className="mt-3 empty:hidden">
              {actionNote ? (
                <Alert tone="info" title="Not connected yet">
                  {actionNote}
                </Alert>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
