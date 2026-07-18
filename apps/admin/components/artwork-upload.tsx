'use client';

import { Alert, Heading, Spinner, Text, cn } from '@tms/ui';
import { Check, ChevronLeft, FileUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AdminPageHeader } from '@/components/admin-page-header';
import { validateUpload, type UploadValidation } from '@/lib/artworks';

type Phase = 'idle' | 'uploading' | 'processing' | 'validating' | 'done';

interface Picked {
  name: string;
  sizeBytes: number;
}

const SAMPLES: Array<{ label: string; file: Picked }> = [
  { label: 'Valid PNG (8MB)', file: { name: 'midnight-in-lagos.png', sizeBytes: 8 * 1024 * 1024 } },
  { label: 'Low-res PNG (1MB)', file: { name: 'quick-sketch.png', sizeBytes: 1 * 1024 * 1024 } },
  { label: 'Unsupported JPG', file: { name: 'photo.jpg', sizeBytes: 3 * 1024 * 1024 } },
  {
    label: 'Oversized TIFF (60MB)',
    file: { name: 'huge-master.tif', sizeBytes: 60 * 1024 * 1024 },
  },
];

export function ArtworkUpload() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [validation, setValidation] = useState<UploadValidation | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('idle');
    setProgress(0);
    setPicked(null);
    setValidation(null);
  }

  function start(file: Picked) {
    const result = validateUpload(file.name, file.sizeBytes);
    setPicked(file);
    setValidation(result);
    if (!result.ok) {
      setPhase('idle');
      return;
    }
    // Simulate upload → processing → validation → draft created.
    setPhase('uploading');
    setProgress(0);
    let pct = 0;
    const tick = () => {
      pct += 25;
      setProgress(Math.min(100, pct));
      if (pct < 100) {
        timers.current.push(setTimeout(tick, 180));
      } else {
        timers.current.push(setTimeout(() => setPhase('processing'), 300));
        timers.current.push(setTimeout(() => setPhase('validating'), 1100));
        timers.current.push(setTimeout(() => setPhase('done'), 1800));
      }
    };
    timers.current.push(setTimeout(tick, 180));
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) start({ name: file.name, sizeBytes: file.size });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/artworks"
          className="inline-flex items-center gap-1 rounded-sm text-xs font-medium uppercase tracking-[0.08em] text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Artworks
        </Link>
        <AdminPageHeader
          eyebrow="Catalogue"
          title="New artwork"
          lead="Upload a print-ready file. It’s validated, processed and turned into a draft you can review and publish."
        />
      </div>

      <Alert tone="info" title="Preview build">
        No file is uploaded or stored — this simulates the upload, processing and validation states.
      </Alert>

      {phase === 'idle' ? (
        <div className="space-y-4">
          <label
            htmlFor="artwork-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-line-2 bg-surface p-8 text-center outline-none hover:bg-canvas-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-focus-ring)]"
          >
            <FileUp className="size-6 text-muted" aria-hidden />
            <span className="text-sm font-medium text-ink">Choose a file to upload</span>
            <span className="text-xs text-muted">Print-ready PNG, TIFF or SVG · up to 40MB</span>
            <input
              id="artwork-file"
              type="file"
              accept=".png,.tif,.tiff,.svg"
              onChange={onFile}
              className="sr-only"
            />
          </label>

          <div>
            <span className="text-xs uppercase tracking-[0.06em] text-muted">Or try a sample</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => start(s.file)}
                  className="inline-flex h-9 items-center rounded-md border border-line-2 px-3 text-xs text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {validation && !validation.ok ? (
            <Alert tone="error" title="This file can’t be used">
              <ul className="list-inside list-disc">
                {validation.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {phase === 'uploading' || phase === 'processing' || phase === 'validating' ? (
        <div
          className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-6"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <Spinner className="size-5 text-accent" aria-hidden />
            <span className="text-sm font-medium text-ink">
              {phase === 'uploading'
                ? `Uploading ${picked?.name}…`
                : phase === 'processing'
                  ? 'Processing artwork…'
                  : 'Running validation checks…'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas-2">
            <div
              className={cn('h-full rounded-full bg-accent transition-all')}
              style={{ width: `${phase === 'uploading' ? progress : 100}%` }}
            />
          </div>
          <Text size="sm" tone="muted">
            {phase === 'uploading'
              ? `${progress}%`
              : phase === 'processing'
                ? 'Generating print-safe assets and mockups.'
                : 'Checking resolution, colour profile and print-safe areas.'}
          </Text>
        </div>
      ) : null}

      {phase === 'done' ? (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-success)] text-white">
              <Check className="size-4" aria-hidden />
            </span>
            <div>
              <Heading
                as={2}
                size="md"
                className="font-display text-sm font-bold uppercase tracking-wide"
              >
                Draft created
              </Heading>
              <Text size="sm" tone="secondary" className="mt-1">
                {picked?.name} was validated and processed into a draft artwork.
              </Text>
            </div>
          </div>

          {validation && validation.warnings.length > 0 ? (
            <Alert tone="warning" title="Passed with warnings">
              <ul className="list-inside list-disc">
                {validation.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Alert>
          ) : (
            <Alert tone="success" title="All checks passed">
              Resolution, colour profile and print-safe areas look good.
            </Alert>
          )}

          <Text size="sm" tone="muted">
            In the preview build the draft isn’t persisted — once the catalogue API is connected
            this opens the new artwork for review.
          </Text>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/artworks"
              className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Back to artworks
            </Link>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center rounded-md border border-line-2 px-4 text-sm text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Upload another
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
