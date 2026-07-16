'use client';

import { buttonVariants, cn } from '@tms/ui';
import { AlertTriangle, ArrowRight, RotateCw, Send, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import {
  type GuideOutcome,
  type GuideReference,
  studioGuideRespond,
  SUGGESTED_PROMPTS,
} from '@/lib/studio-guide';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  outcome?: GuideOutcome;
  /** The prompt that produced an assistant message, for retry. */
  prompt?: string;
}

/** Resolve after a short delay so the typing state is visible. Never rejects -
 *  a failed "tool call" is modelled as a `tool_error` outcome. */
function ask(prompt: string): Promise<GuideOutcome> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(studioGuideRespond(prompt)), 450);
  });
}

let counter = 0;
const nextId = () => `m${(counter += 1)}`;

/**
 * Studio Guide chat shell (TMS-F5-008). A mock, guardrailed assistant: it
 * answers and links but never invents live stock/price/delivery and never takes
 * an action. Order-status questions surface a tool-failure + retry state. The
 * real assistant endpoint + tool results land under TMS-FBR-009.
 */
export function StudioGuideChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (trimmed === '' || pending) return;
    setInput('');
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }]);
    setPending(true);
    const outcome = await ask(trimmed);
    setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', outcome, prompt: trimmed }]);
    setPending(false);
  }

  async function retry(message: Message) {
    if (pending || !message.prompt) return;
    setPending(true);
    const outcome = await ask(message.prompt);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, outcome } : m)));
    setPending(false);
  }

  const started = messages.length > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
      {/* Identity */}
      <header className="flex items-start gap-3 border-b border-line bg-canvas-2 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-display text-lg text-ink">Studio Guide</p>
          <p className="text-sm text-muted">
            Your AI guide to the artworks, the Design Studio, sizing and policies.
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-3.5 text-accent-2" aria-hidden />
            Preview, a mock assistant. It won’t confirm live stock, price or delivery, and never
            places orders (TMS-FBR-009).
          </p>
        </div>
      </header>

      {/* Message log */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with the Studio Guide"
        className="max-h-[28rem] min-h-[16rem] flex-1 space-y-4 overflow-y-auto p-4"
      >
        {!started ? (
          <p className="text-sm text-muted">
            Ask me anything about the studio. Try one of the suggestions below to start.
          </p>
        ) : null}

        {messages.map((message) =>
          message.role === 'user' ? (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-[var(--radius-md)] rounded-br-sm bg-accent px-3 py-2 text-sm text-on-accent">
                {message.text}
              </p>
            </div>
          ) : (
            <AssistantMessage key={message.id} message={message} onRetry={() => retry(message)} />
          ),
        )}

        {pending ? (
          <div
            className="flex items-center gap-2 text-sm text-muted"
            aria-label="Studio Guide is typing"
          >
            <Sparkles className="size-4 text-accent-2" aria-hidden />
            <span className="flex gap-1">
              <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
            </span>
          </div>
        ) : null}
      </div>

      {/* Suggested prompts */}
      <div className="flex flex-wrap gap-2 border-t border-line px-4 pt-3">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => send(prompt)}
            disabled={pending}
            className="rounded-full border border-line bg-canvas-2 px-3 py-1.5 text-xs text-ink outline-none hover:border-accent-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 p-4"
      >
        <label htmlFor={inputId} className="sr-only">
          Message the Studio Guide
        </label>
        <textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask the Studio Guide…"
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
        />
        <button
          type="submit"
          disabled={pending || input.trim() === ''}
          className={cn(buttonVariants({ size: 'md' }), 'shrink-0')}
        >
          <Send className="size-4" aria-hidden />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </div>
  );
}

function AssistantMessage({ message, onRetry }: { message: Message; onRetry: () => void }) {
  const outcome = message.outcome;
  if (!outcome) return null;

  if (outcome.kind === 'tool_error') {
    return (
      <div className="max-w-[85%]">
        <div className="rounded-[var(--radius-md)] rounded-bl-sm border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-ink">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-4 text-warning" aria-hidden />
            Couldn’t reach a tool
          </p>
          <p className="mt-1 text-ink-2">{outcome.message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-sm text-sm text-accent-2 outline-none hover:gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <RotateCw className="size-4" aria-hidden /> Try again
          </button>
        </div>
        <ReferenceCards references={outcome.references} />
      </div>
    );
  }

  const { reply } = outcome;
  return (
    <div className="max-w-[85%]">
      <div className="rounded-[var(--radius-md)] rounded-bl-sm bg-canvas-2 px-3 py-2.5 text-sm text-ink">
        <p>{reply.text}</p>
        {reply.guardrail ? (
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted">
            <ShieldCheck className="size-3.5 text-accent-2" aria-hidden />
            Checked against the studio’s sources, not guessed.
          </p>
        ) : null}
      </div>
      <ReferenceCards references={reply.references} />
    </div>
  );
}

function ReferenceCards({ references }: { references: GuideReference[] }) {
  if (references.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2">
      {references.map((ref) => (
        <li key={ref.href}>
          <Link
            href={ref.href}
            className="group flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3 outline-none hover:border-accent-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{ref.label}</p>
              <p className="text-xs text-muted">{ref.description}</p>
            </div>
            <ArrowRight
              className="mt-0.5 size-4 shrink-0 text-accent-2 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Dot({ delay = '0ms' }: { delay?: string }) {
  return (
    <span
      className="inline-block size-1.5 animate-bounce rounded-full bg-muted"
      style={{ animationDelay: delay }}
    />
  );
}
