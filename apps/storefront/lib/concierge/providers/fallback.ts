/**
 * Multi-provider LLM polish for the Concierge.
 * Tries providers in AI_PROVIDER_ORDER (default: openai → anthropic → gemini).
 * Grounded draft facts must not be invented — polish only rewrites tone.
 */

export type AiProviderId = 'openai' | 'anthropic' | 'gemini' | 'mock';

export interface PolishInput {
  system: string;
  user: string;
  draft: string;
}

export interface PolishResult {
  text: string;
  provider: AiProviderId;
  model: string;
}

const DEFAULT_MODELS = {
  openai: 'gpt-5.6',
  anthropic: 'claude-sonnet-5',
  gemini: 'gemini-3.5-flash',
} as const;

function polishPrompt(input: PolishInput): string {
  return `Customer said: ${input.user}\n\nGrounded draft (do not add facts):\n${input.draft}\n\nRewrite briefly in Concierge voice. Do not add products, prices, policies, or promises absent from the draft.`;
}

function parseProviderOrder(): AiProviderId[] {
  const raw = (process.env.AI_PROVIDER_ORDER || 'openai,anthropic,gemini')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed: AiProviderId[] = ['openai', 'anthropic', 'gemini'];
  const ordered = raw.filter((id): id is AiProviderId => (allowed as string[]).includes(id));
  return ordered.length > 0 ? ordered : [...allowed];
}

function openaiKey(): string | undefined {
  return process.env.OPENAI_API_KEY || process.env.AI_API_KEY || undefined;
}

function anthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY || undefined;
}

function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || undefined;
}

function hasKey(provider: AiProviderId): boolean {
  if (provider === 'openai') return Boolean(openaiKey());
  if (provider === 'anthropic') return Boolean(anthropicKey());
  if (provider === 'gemini') return Boolean(geminiKey());
  return false;
}

async function callOpenAI(input: PolishInput): Promise<PolishResult | null> {
  const key = openaiKey();
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || process.env.AI_MODEL || DEFAULT_MODELS.openai;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: polishPrompt(input) },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim();
  return text ? { text, provider: 'openai', model } : null;
}

async function callAnthropic(input: PolishInput): Promise<PolishResult | null> {
  const key = anthropicKey();
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.3,
      system: input.system,
      messages: [{ role: 'user', content: polishPrompt(input) }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = json.content?.find((block) => block.type === 'text')?.text?.trim();
  return text ? { text, provider: 'anthropic', model } : null;
}

async function callGemini(input: PolishInput): Promise<PolishResult | null> {
  const key = geminiKey();
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: polishPrompt(input) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();
  return text ? { text, provider: 'gemini', model } : null;
}

const CALLERS: Record<
  Exclude<AiProviderId, 'mock'>,
  (input: PolishInput) => Promise<PolishResult | null>
> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
};

/**
 * Whether any live LLM key is configured (so we can skip the polish attempt).
 */
export function hasAnyLiveProvider(): boolean {
  const mode = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  if (mode === 'mock') return false;
  if (mode === 'openai' || mode === 'anthropic' || mode === 'gemini') {
    return hasKey(mode);
  }
  // auto / cascade
  return parseProviderOrder().some(hasKey);
}

/**
 * Polish grounded draft text via the first successful provider in the fallback chain.
 */
export async function polishWithFallback(input: PolishInput): Promise<PolishResult | null> {
  const mode = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  if (mode === 'mock') return null;

  const chain: AiProviderId[] =
    mode === 'openai' || mode === 'anthropic' || mode === 'gemini'
      ? [mode, ...parseProviderOrder().filter((id) => id !== mode)]
      : parseProviderOrder();

  for (const provider of chain) {
    if (provider === 'mock' || !hasKey(provider)) continue;
    try {
      const result = await CALLERS[provider](input);
      if (result?.text) return result;
    } catch {
      // try next provider
    }
  }
  return null;
}

export const DEFAULT_AI_MODELS = DEFAULT_MODELS;
