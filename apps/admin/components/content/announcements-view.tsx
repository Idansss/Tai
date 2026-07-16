'use client';

import { Alert, Badge, Button, EmptyState, Heading, Select, Spinner, Text, cn } from '@tms/ui';
import { Megaphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AnnouncementDTO } from '@/lib/cms/announcement-dto';
import type { Permission } from '@/lib/admin-auth';

const controlClass =
  'h-10 rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

type StatusFilter = 'all' | 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
type Tone = AnnouncementDTO['tone'];

interface FormState {
  message: string;
  href: string;
  linkLabel: string;
  tone: Tone;
  startsAt: string;
  endsAt: string;
}

const EMPTY_FORM: FormState = {
  message: '',
  href: '',
  linkLabel: '',
  tone: 'DEFAULT',
  startsAt: '',
  endsAt: '',
};

const TONE_BADGE: Record<Tone, 'neutral' | 'info' | 'success' | 'warning'> = {
  DEFAULT: 'neutral',
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
};

function statusBadge(item: AnnouncementDTO): {
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'error';
  label: string;
} {
  if (item.deletedAt) return { tone: 'error', label: 'Deleted' };
  switch (item.status) {
    case 'PUBLISHED':
      return { tone: 'success', label: 'Published' };
    case 'SCHEDULED':
      return { tone: 'info', label: 'Scheduled' };
    case 'ARCHIVED':
      return { tone: 'warning', label: 'Archived' };
    default:
      return { tone: 'neutral', label: 'Draft' };
  }
}

/** ISO (UTC) → value for <input type="datetime-local"> (local time, no zone). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function AnnouncementsView({
  initialItems,
  permissions,
}: {
  initialItems: AnnouncementDTO[];
  permissions: Permission[];
}) {
  const canWrite = permissions.includes('content.write');
  const canPublish = permissions.includes('content.publish');
  const canDelete = permissions.includes('content.delete');

  const [items, setItems] = useState<AnnouncementDTO[]>(initialItems);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        includeDeleted: String(includeDeleted),
        pageSize: '100',
      });
      if (query.trim()) params.set('query', query.trim());
      const res = await fetch(`/api/cms/announcements?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load announcements.');
      const data = (await res.json()) as { items: AnnouncementDTO[] };
      setItems(data.items);
    } catch (error) {
      setBanner({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Failed to load.',
      });
    } finally {
      setLoading(false);
    }
  }, [status, query, includeDeleted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing('new');
    setForm(EMPTY_FORM);
    setFieldErrors({});
  }

  function openEdit(item: AnnouncementDTO) {
    setEditing(item.id);
    setForm({
      message: item.message,
      href: item.href ?? '',
      linkLabel: item.linkLabel ?? '',
      tone: item.tone,
      startsAt: toLocalInput(item.startsAt),
      endsAt: toLocalInput(item.endsAt),
    });
    setFieldErrors({});
  }

  function closeForm() {
    setEditing(null);
    setFieldErrors({});
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setBanner(null);
    const payload = {
      message: form.message,
      href: form.href || null,
      linkLabel: form.linkLabel || null,
      tone: form.tone,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
    };
    const isNew = editing === 'new';
    try {
      const res = await fetch(
        isNew ? '/api/cms/announcements' : `/api/cms/announcements/${editing}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setBanner({ tone: 'error', text: data.error ?? 'Could not save the announcement.' });
        return;
      }
      setBanner({
        tone: 'success',
        text: isNew ? 'Announcement created.' : 'Announcement updated.',
      });
      closeForm();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, run: () => Promise<Response>, successText: string) {
    setBusyId(id);
    setBanner(null);
    try {
      const res = await run();
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBanner({ tone: 'error', text: data.error ?? 'Action failed.' });
        return;
      }
      setBanner({ tone: 'success', text: successText });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const setStatusAction = (id: string, action: string, text: string) =>
    act(
      id,
      () =>
        fetch(`/api/cms/announcements/${id}/status`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        }),
      text,
    );

  function remove(item: AnnouncementDTO) {
    if (
      !window.confirm(
        `Delete this announcement? "${item.message.slice(0, 60)}"\n\nIt can be restored from the deleted view.`,
      )
    ) {
      return;
    }
    void act(
      item.id,
      () => fetch(`/api/cms/announcements/${item.id}`, { method: 'DELETE' }),
      'Announcement deleted.',
    );
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    setItems(next);
    await act(
      a.id,
      () =>
        fetch('/api/cms/announcements/reorder', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderedIds: next.map((i) => i.id) }),
        }),
      'Order updated.',
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading as={1} size="lg">
            Announcements
          </Heading>
          <Text tone="secondary" className="mt-2 max-w-2xl">
            The site-wide bar shown across the storefront. Published announcements within their
            schedule window appear live; drafts and archived items do not.
          </Text>
        </div>
        {canWrite ? (
          <Button variant="accent" onClick={openCreate}>
            New announcement
          </Button>
        ) : null}
      </div>

      {banner ? (
        <Alert tone={banner.tone} title={banner.tone === 'success' ? 'Done' : 'Problem'}>
          {banner.text}
        </Alert>
      ) : null}

      {editing ? (
        <form
          onSubmit={submitForm}
          className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-5"
        >
          <Heading as={2} size="md">
            {editing === 'new' ? 'New announcement' : 'Edit announcement'}
          </Heading>
          <div>
            <label htmlFor="a-message" className="block text-sm font-medium text-ink">
              Message
            </label>
            <textarea
              id="a-message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={2}
              maxLength={280}
              className={cn(
                controlClass,
                'mt-1.5 h-auto w-full py-2',
                fieldErrors.message && 'border-error',
              )}
            />
            {fieldErrors.message ? (
              <p className="mt-1 text-xs text-error" role="alert">
                {fieldErrors.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="a-href" className="block text-sm font-medium text-ink">
                Link URL (optional)
              </label>
              <input
                id="a-href"
                value={form.href}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
                placeholder="/shop or https://…"
                className={cn(controlClass, 'mt-1.5 w-full', fieldErrors.href && 'border-error')}
              />
              {fieldErrors.href ? (
                <p className="mt-1 text-xs text-error" role="alert">
                  {fieldErrors.href}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="a-label" className="block text-sm font-medium text-ink">
                Link label (optional)
              </label>
              <input
                id="a-label"
                value={form.linkLabel}
                onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                className={cn(
                  controlClass,
                  'mt-1.5 w-full',
                  fieldErrors.linkLabel && 'border-error',
                )}
              />
              {fieldErrors.linkLabel ? (
                <p className="mt-1 text-xs text-error" role="alert">
                  {fieldErrors.linkLabel}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className="block text-sm font-medium text-ink">Tone</span>
              <Select
                className="mt-1.5"
                value={form.tone}
                onChange={(next) => setForm({ ...form, tone: next as Tone })}
                options={[
                  { value: 'DEFAULT', label: 'Default' },
                  { value: 'INFO', label: 'Info' },
                  { value: 'SUCCESS', label: 'Success' },
                  { value: 'WARNING', label: 'Warning' },
                ]}
              />
            </div>
            <div>
              <label htmlFor="a-start" className="block text-sm font-medium text-ink">
                Starts (optional)
              </label>
              <input
                id="a-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className={cn(controlClass, 'mt-1.5 w-full')}
              />
            </div>
            <div>
              <label htmlFor="a-end" className="block text-sm font-medium text-ink">
                Ends (optional)
              </label>
              <input
                id="a-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className={cn(controlClass, 'mt-1.5 w-full', fieldErrors.endsAt && 'border-error')}
              />
              {fieldErrors.endsAt ? (
                <p className="mt-1 text-xs text-error" role="alert">
                  {fieldErrors.endsAt}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="accent" disabled={saving}>
              {saving ? 'Saving…' : editing === 'new' ? 'Create' : 'Save changes'}
            </Button>
            <Button type="button" variant="ghost" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search message"
          aria-label="Search announcements"
          className={cn(controlClass, 'w-56')}
        />
        <Select
          value={status}
          onChange={(next) => setStatus(next as StatusFilter)}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'SCHEDULED', label: 'Scheduled' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Show deleted
        </label>
        {loading ? <Spinner className="size-4" /> : null}
        <span className="ml-auto text-sm text-muted" aria-live="polite">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <EmptyState
          icon={<Megaphone aria-hidden />}
          title="No announcements"
          description={
            canWrite
              ? 'Create your first announcement to show a bar across the storefront.'
              : 'Nothing to show yet.'
          }
        />
      ) : (
        <ul className={cn('space-y-3 transition-opacity', loading && 'opacity-60')}>
          {items.map((item, index) => {
            const badge = statusBadge(item);
            const busy = busyId === item.id;
            return (
              <li
                key={item.id}
                className={cn(
                  'rounded-[var(--radius-lg)] border border-line bg-surface p-4',
                  item.deletedAt && 'opacity-70',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      <Badge tone={TONE_BADGE[item.tone]}>{item.tone.toLowerCase()}</Badge>
                      {item.href ? (
                        <span className="text-xs text-muted">
                          → {item.linkLabel ? `${item.linkLabel} · ` : ''}
                          {item.href}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-ink">{item.message}</p>
                    {(item.startsAt || item.endsAt) && (
                      <p className="mt-1 text-xs text-muted">
                        {item.startsAt ? `From ${new Date(item.startsAt).toLocaleString()}` : ''}
                        {item.startsAt && item.endsAt ? ' · ' : ''}
                        {item.endsAt ? `Until ${new Date(item.endsAt).toLocaleString()}` : ''}
                      </p>
                    )}
                  </div>

                  {!item.deletedAt ? (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={index === 0 || busy || !canWrite}
                          onClick={() => void move(index, -1)}
                          className="rounded border border-line-2 px-2 py-1 text-xs text-ink-2 hover:bg-canvas-2 disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={index === items.length - 1 || busy || !canWrite}
                          onClick={() => void move(index, 1)}
                          className="rounded border border-line-2 px-2 py-1 text-xs text-ink-2 hover:bg-canvas-2 disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  {item.deletedAt ? (
                    canWrite ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          void setStatusAction(item.id, 'restore', 'Announcement restored.')
                        }
                        disabled={busy}
                      >
                        Restore
                      </Button>
                    ) : (
                      <Text tone="muted">Deleted</Text>
                    )
                  ) : (
                    <>
                      {canWrite ? (
                        <Button variant="secondary" onClick={() => openEdit(item)} disabled={busy}>
                          Edit
                        </Button>
                      ) : null}
                      {canPublish && item.status !== 'PUBLISHED' ? (
                        <Button
                          variant="primary"
                          onClick={() =>
                            void setStatusAction(item.id, 'publish', 'Announcement published.')
                          }
                          disabled={busy}
                        >
                          Publish
                        </Button>
                      ) : null}
                      {canPublish && item.status === 'PUBLISHED' ? (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void setStatusAction(item.id, 'unpublish', 'Announcement unpublished.')
                          }
                          disabled={busy}
                        >
                          Unpublish
                        </Button>
                      ) : null}
                      {canPublish && item.status !== 'ARCHIVED' ? (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            void setStatusAction(item.id, 'archive', 'Announcement archived.')
                          }
                          disabled={busy}
                        >
                          Archive
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button variant="danger" onClick={() => remove(item)} disabled={busy}>
                          Delete
                        </Button>
                      ) : null}
                    </>
                  )}
                  {busy ? <Spinner className="size-4 self-center" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
