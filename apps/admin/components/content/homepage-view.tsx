'use client';

import { Alert, Badge, Button, Heading, Text, cn } from '@tms/ui';
import { useState } from 'react';
import type { Permission } from '@/lib/admin-auth';

type Content = Record<string, string>;

interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'image';
  hint?: string;
}

const HERO_FIELDS: FieldDef[] = [
  { name: 'eyebrow', label: 'Eyebrow' },
  { name: 'titleLead', label: 'Title — lead', hint: 'Text before the accent word (e.g. "From ")' },
  { name: 'titleAccent', label: 'Title — accent word', hint: 'Shown in the amber accent colour' },
  { name: 'titleTail', label: 'Title — tail', hint: 'Text after the accent (e.g. ", to you.")' },
  { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
  { name: 'primaryCtaLabel', label: 'Primary button label' },
  { name: 'primaryCtaHref', label: 'Primary button link' },
  { name: 'secondaryCtaLabel', label: 'Secondary button label' },
  { name: 'secondaryCtaHref', label: 'Secondary button link' },
  {
    name: 'imageUrl',
    label: 'Featured image',
    type: 'image',
    hint: 'A site path (/artworks/…jpg) or full URL',
  },
  { name: 'imageTitle', label: 'Featured caption — title' },
  { name: 'imageCaption', label: 'Featured caption — label' },
  { name: 'imageHref', label: 'Featured image link' },
];

const STUDIO_FIELDS: FieldDef[] = [
  { name: 'eyebrow', label: 'Eyebrow' },
  { name: 'headingLine1', label: 'Heading — line 1' },
  { name: 'headingLine2', label: 'Heading — line 2' },
  { name: 'body', label: 'Body', type: 'textarea' },
  { name: 'primaryCtaLabel', label: 'Primary button label' },
  { name: 'primaryCtaHref', label: 'Primary button link' },
  { name: 'secondaryCtaLabel', label: 'Secondary button label' },
  { name: 'secondaryCtaHref', label: 'Secondary button link' },
  {
    name: 'imageUrl',
    label: 'Image',
    type: 'image',
    hint: 'A site path (/artworks/…jpg) or full URL',
  },
];

const STOREFRONT = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? '';

function previewSrc(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${STOREFRONT}${url.startsWith('/') ? '' : '/'}${url}`;
}

const control =
  'w-full rounded-md border bg-canvas px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function SectionEditor({
  sectionKey,
  title,
  fields,
  initial,
  initialStatus,
  canWrite,
  canPublish,
}: {
  sectionKey: 'hero' | 'studio';
  title: string;
  fields: FieldDef[];
  initial: Content;
  initialStatus: string;
  canWrite: boolean;
  canPublish: boolean;
}) {
  const [form, setForm] = useState<Content>(initial);
  const [status, setStatus] = useState(initialStatus);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(publish: boolean) {
    setBusy(true);
    setBanner(null);
    setFieldErrors({});
    try {
      const res = await fetch(`/api/cms/homepage/${sectionKey}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: form, publish }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setBanner({ tone: 'error', text: data.error ?? 'Could not save.' });
        return;
      }
      if (data.status) setStatus(data.status);
      setBanner({
        tone: 'success',
        text: publish ? 'Published — live on the homepage.' : 'Saved as draft.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Heading as={2} size="md">
          {title}
        </Heading>
        <Badge tone={status === 'PUBLISHED' ? 'success' : 'neutral'}>
          {status === 'PUBLISHED' ? 'Published' : 'Draft'}
        </Badge>
      </div>

      {banner ? (
        <Alert
          tone={banner.tone}
          title={banner.tone === 'success' ? 'Done' : 'Problem'}
          className="mb-4"
        >
          {banner.text}
        </Alert>
      ) : null}

      <div className="grid gap-4">
        {fields.map((field) => {
          const value = form[field.name] ?? '';
          const error = fieldErrors[field.name];
          return (
            <div key={field.name}>
              <label
                htmlFor={`${sectionKey}-${field.name}`}
                className="block text-sm font-medium text-ink"
              >
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={`${sectionKey}-${field.name}`}
                  value={value}
                  disabled={!canWrite}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  rows={3}
                  className={cn(control, 'mt-1.5 py-2', error ? 'border-error' : 'border-line-2')}
                />
              ) : (
                <input
                  id={`${sectionKey}-${field.name}`}
                  value={value}
                  disabled={!canWrite}
                  onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  className={cn(control, 'mt-1.5 h-10', error ? 'border-error' : 'border-line-2')}
                />
              )}
              {field.hint ? <p className="mt-1 text-xs text-muted">{field.hint}</p> : null}
              {error ? (
                <p className="mt-1 text-xs text-error" role="alert">
                  {error}
                </p>
              ) : null}
              {field.type === 'image' && value ? (
                <img
                  src={previewSrc(value)}
                  alt="Preview"
                  className="mt-2 h-32 w-auto rounded-md border border-line object-cover"
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {canWrite ? (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={() => void save(false)} disabled={busy}>
            Save draft
          </Button>
          {canPublish ? (
            <Button variant="accent" onClick={() => void save(true)} disabled={busy}>
              Save &amp; publish
            </Button>
          ) : null}
        </div>
      ) : (
        <Text tone="muted" className="mt-4">
          You have read-only access to this section.
        </Text>
      )}
    </section>
  );
}

export function HomepageView({
  hero,
  studio,
  permissions,
}: {
  hero: { content: Content; status: string };
  studio: { content: Content; status: string };
  permissions: Permission[];
}) {
  const canWrite = permissions.includes('content.write');
  const canPublish = permissions.includes('content.publish');

  return (
    <div className="space-y-6">
      <div>
        <Heading as={1} size="lg">
          Homepage
        </Heading>
        <Text tone="secondary" className="mt-2 max-w-2xl">
          Edit the hero and the studio band shown on the storefront homepage. Save a draft while you
          work, then publish to make it live. Images accept a site path (e.g.
          <code className="mx-1 rounded bg-canvas-2 px-1 py-0.5 text-xs">/artworks/name.jpg</code>)
          or a full URL.
        </Text>
      </div>

      <SectionEditor
        sectionKey="hero"
        title="Hero"
        fields={HERO_FIELDS}
        initial={hero.content}
        initialStatus={hero.status}
        canWrite={canWrite}
        canPublish={canPublish}
      />
      <SectionEditor
        sectionKey="studio"
        title="Studio band"
        fields={STUDIO_FIELDS}
        initial={studio.content}
        initialStatus={studio.status}
        canWrite={canWrite}
        canPublish={canPublish}
      />
    </div>
  );
}
