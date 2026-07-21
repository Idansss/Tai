'use client';

import { buttonVariants, cn, Price } from '@tms/ui';
import { ArrowRight, Minimize2, RotateCw, Send, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { BrandLogo } from '@/components/site/brand-logo';
import { type ConciergeMessage, useConcierge } from './concierge-provider';

export function ConciergePanel() {
  const {
    panel,
    close,
    minimise,
    messages,
    pending,
    send,
    retryLast,
    assistantName,
    quickActions,
  } = useConcierge();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel === 'open') {
      if (!dialog.open) dialog.showModal();
      inputRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [panel]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={assistantName}
      onClose={() => {
        if (panel === 'open') close();
      }}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className={cn(
        'fixed inset-0 z-50 m-0 max-h-none max-w-none flex-col border-0 bg-transparent p-0',
        'backdrop:bg-ink/40 md:backdrop:bg-ink/25',
        'open:flex',
      )}
    >
      <div
        className={cn(
          'ml-auto flex h-dvh w-full flex-col border-l border-line bg-surface shadow-2xl',
          'md:my-4 md:mr-4 md:h-[min(720px,calc(100dvh-2rem))] md:w-[420px] md:rounded-[var(--radius-lg)] md:border',
          'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
        )}
      >
        <header className="flex items-start gap-3 border-b border-line bg-canvas-2 p-4">
          <BrandLogo className="size-10 shrink-0 rounded-full" alt="" sizes="40px" priority />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg text-ink">{assistantName}</p>
            <p className="text-sm text-muted">
              Artwork, sizing, delivery, Design Studio, and orders — grounded in studio sources.
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={minimise}
              className="rounded-md p-2 text-muted outline-none hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              aria-label="Minimise"
            >
              <Minimize2 className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-md p-2 text-muted outline-none hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={`Conversation with ${assistantName}`}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-muted">
              I’m the {assistantName}. I can help you discover artwork, choose a garment and size,
              understand delivery, or check an order.
            </p>
          ) : null}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-[var(--radius-md)] rounded-br-sm bg-ink px-3 py-2 text-sm text-canvas">
                  {message.text}
                </p>
              </div>
            ) : (
              <AssistantBubble key={message.id} message={message} onRetry={retryLast} />
            ),
          )}

          {pending ? (
            <div
              className="flex items-center gap-2 text-sm text-muted"
              aria-label="Concierge is responding"
            >
              <BrandLogo className="size-4 animate-pulse rounded-full" alt="" sizes="16px" />
              <span>Working…</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line px-4 pt-3">
          {quickActions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={pending}
              onClick={() => send(prompt)}
              className="min-h-9 rounded-full border border-line bg-canvas-2 px-3 py-1.5 text-xs text-ink outline-none hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <Composer inputId={inputId} inputRef={inputRef} pending={pending} onSend={send} />
      </div>
    </dialog>
  );
}

function AssistantBubble({ message, onRetry }: { message: ConciergeMessage; onRetry: () => void }) {
  return (
    <div className="max-w-[92%]">
      <div className="rounded-[var(--radius-md)] rounded-bl-sm bg-canvas-2 px-3 py-2.5 text-sm whitespace-pre-wrap text-ink">
        {message.text || (message.streaming ? '…' : '')}
        {message.result?.guarded ? (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted">
            <ShieldCheck className="size-3.5" aria-hidden />
            Checked against studio sources, not guessed.
          </p>
        ) : null}
      </div>

      {message.result?.cards?.length ? (
        <ul className="mt-2 space-y-2">
          {message.result.cards.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="group flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3 outline-none hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{card.title}</p>
                  {card.subtitle ? <p className="text-xs text-muted">{card.subtitle}</p> : null}
                  {card.reason ? <p className="mt-1 text-xs text-muted">{card.reason}</p> : null}
                  {card.priceMinor != null && card.currency ? (
                    <p className="mt-1 text-sm text-ink">
                      <Price amountMinor={card.priceMinor} currency={card.currency} />
                    </p>
                  ) : null}
                </div>
                <ArrowRight
                  className="mt-0.5 size-4 shrink-0 text-ink group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {message.result?.citations?.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {message.result.citations.map((ref) => (
            <li key={`${ref.href}-${ref.label}`}>
              <Link
                href={ref.href}
                className="inline-flex min-h-9 items-center rounded-full border border-line px-3 py-1 text-xs text-ink outline-none hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              >
                {ref.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {message.error ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        >
          <RotateCw className="size-4" aria-hidden /> Try again
        </button>
      ) : null}
    </div>
  );
}

function Composer({
  inputId,
  inputRef,
  pending,
  onSend,
}: {
  inputId: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  pending: boolean;
  onSend: (text: string) => void;
}) {
  return (
    <form
      className="flex items-end gap-2 border-t border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const value = inputRef.current?.value ?? '';
        onSend(value);
        if (inputRef.current) inputRef.current.value = '';
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Message the Concierge
      </label>
      <textarea
        id={inputId}
        ref={inputRef}
        rows={1}
        placeholder="Ask the Concierge…"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const value = inputRef.current?.value ?? '';
            onSend(value);
            if (inputRef.current) inputRef.current.value = '';
          }
        }}
        className="max-h-32 min-h-11 flex-1 resize-none rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      />
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: 'md' }), 'min-h-11 shrink-0')}
      >
        <Send className="size-4" aria-hidden />
        <span className="sr-only">Send</span>
      </button>
    </form>
  );
}
