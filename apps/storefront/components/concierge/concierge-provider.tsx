'use client';

import type { ConciergeChatTurnResult, ConciergePageContext } from '@tms/contracts';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/account/auth-provider';
import { useCart } from '@/components/cart/cart-provider';

export type ConciergePanelState = 'closed' | 'open' | 'minimised';

export interface ConciergeMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  result?: ConciergeChatTurnResult;
  error?: string;
  streaming?: boolean;
}

interface ConciergeContextValue {
  panel: ConciergePanelState;
  open: () => void;
  close: () => void;
  minimise: () => void;
  messages: ConciergeMessage[];
  pending: boolean;
  conversationId: string | null;
  send: (text: string) => Promise<void>;
  retryLast: () => Promise<void>;
  pageContext: ConciergePageContext;
  assistantName: string;
  quickActions: string[];
}

const ConciergeContext = createContext<ConciergeContextValue | null>(null);

function pageTypeFromPath(pathname: string): string {
  if (pathname.startsWith('/design-studio')) return 'design-studio';
  if (pathname.startsWith('/artworks/')) return 'artwork';
  if (pathname.startsWith('/collections/')) return 'collection';
  if (pathname.startsWith('/shop') || pathname.startsWith('/products/')) return 'shop';
  if (pathname.startsWith('/cart')) return 'cart';
  if (pathname.startsWith('/checkout')) return 'checkout';
  if (pathname.startsWith('/account/orders')) return 'orders';
  if (pathname.startsWith('/account')) return 'account';
  return 'other';
}

function quickActionsFor(pageType: string, pathname: string): string[] {
  if (pageType === 'artwork') {
    return [
      'Tell me about this artwork',
      'Which garments can I use?',
      'Help me choose a colour',
      'Find similar artwork',
      'Open in Design Studio',
    ];
  }
  if (pageType === 'cart' || pageType === 'checkout') {
    return ['Review my selections', 'Help with sizing', 'Explain delivery', 'Payment help'];
  }
  if (pageType === 'design-studio') {
    return [
      'How does the Design Studio work?',
      'What is studio-approved placement?',
      'Help me choose a size',
    ];
  }
  if (pageType === 'orders') {
    return ['When will my order arrive?', 'Track my order', 'Speak to the studio'];
  }
  void pathname;
  return [
    'Find artwork for me',
    'Help me choose a size',
    'How does the Design Studio work?',
    'Explain returns',
    'When will my order arrive?',
    'Speak to the studio',
  ];
}

let msgCounter = 0;
const nextId = () => `cm_${(msgCounter += 1)}`;

export function ConciergeProvider({
  children,
  assistantName = 'F.A.T.U Concierge',
}: {
  children: ReactNode;
  assistantName?: string;
}) {
  const pathname = usePathname() || '/';
  const { user } = useAuth();
  const { count, cart } = useCart();
  const [panel, setPanel] = useState<ConciergePanelState>('closed');
  const [messages, setMessages] = useState<ConciergeMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('fatu_concierge_conversation');
      if (stored) setConversationId(stored);
      const panelStored = sessionStorage.getItem('fatu_concierge_panel');
      if (panelStored === 'open' || panelStored === 'minimised') setPanel(panelStored);
    } catch {
      /* sessionStorage may be blocked */
    }
  }, []);

  useEffect(() => {
    try {
      if (conversationId) sessionStorage.setItem('fatu_concierge_conversation', conversationId);
      sessionStorage.setItem('fatu_concierge_panel', panel);
    } catch {
      /* ignore */
    }
  }, [conversationId, panel]);

  // Lock background scroll on mobile when open.
  useEffect(() => {
    if (panel !== 'open') return;
    const prev = document.body.style.overflow;
    if (window.matchMedia('(max-width: 767px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [panel]);

  const pageContext = useMemo<ConciergePageContext>(() => {
    const pageType = pageTypeFromPath(pathname);
    const artworkSlug = pageType === 'artwork' ? pathname.split('/')[2]?.split('?')[0] : undefined;
    const collectionSlug =
      pageType === 'collection' ? pathname.split('/')[2]?.split('?')[0] : undefined;
    return {
      pathname,
      pageType,
      artworkSlug,
      collectionSlug,
      cartSummary: {
        itemCount: count,
        currency: cart.currency ?? 'NGN',
        subtotalMinor: cart.subtotalMinor ?? null,
      },
      authenticationState: user ? 'authenticated' : 'anonymous',
    };
  }, [pathname, count, cart, user]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setLastPrompt(trimmed);
      setPending(true);
      const userMsg: ConciergeMessage = { id: nextId(), role: 'user', text: trimmed };
      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', text: '', streaming: true },
      ]);

      try {
        const response = await fetch('/api/concierge/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
          credentials: 'include',
          body: JSON.stringify({
            conversationId: conversationId ?? undefined,
            message: trimmed,
            context: pageContext,
            clientRequestId: `req_${crypto.randomUUID()}`,
          }),
        });

        if (!response.ok || !response.body) {
          const errText =
            response.status === 429
              ? 'Too many requests — please wait a moment.'
              : 'The Concierge is unavailable right now.';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false, error: errText, text: errText } : m,
            ),
          );
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assembled = '';
        let finalResult: ConciergeChatTurnResult | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as {
              type: string;
              text?: string;
              result?: ConciergeChatTurnResult;
              message?: string;
            };
            if (event.type === 'token' && event.text) {
              assembled += event.text;
              const snapshot = assembled;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, text: snapshot } : m)),
              );
            }
            if (event.type === 'final' && event.result) {
              finalResult = event.result;
              setConversationId(event.result.conversationId);
            }
            if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        streaming: false,
                        error: event.message ?? 'Something went wrong.',
                        text: event.message ?? 'Something went wrong.',
                      }
                    : m,
                ),
              );
            }
          }
        }

        if (finalResult) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    streaming: false,
                    text: finalResult.text,
                    result: finalResult,
                  }
                : m,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  error: 'Network error. Please try again.',
                  text: 'Network error. Please try again.',
                }
              : m,
          ),
        );
      } finally {
        setPending(false);
      }
    },
    [conversationId, pageContext, pending],
  );

  const retryLast = useCallback(async () => {
    if (lastPrompt) await send(lastPrompt);
  }, [lastPrompt, send]);

  const value = useMemo<ConciergeContextValue>(
    () => ({
      panel,
      open: () => setPanel('open'),
      close: () => setPanel('closed'),
      minimise: () => setPanel('minimised'),
      messages,
      pending,
      conversationId,
      send,
      retryLast,
      pageContext,
      assistantName,
      quickActions: quickActionsFor(pageContext.pageType, pathname),
    }),
    [
      panel,
      messages,
      pending,
      conversationId,
      send,
      retryLast,
      pageContext,
      assistantName,
      pathname,
    ],
  );

  return <ConciergeContext.Provider value={value}>{children}</ConciergeContext.Provider>;
}

export function useConcierge(): ConciergeContextValue {
  const ctx = useContext(ConciergeContext);
  if (!ctx) throw new Error('useConcierge must be used within ConciergeProvider');
  return ctx;
}
