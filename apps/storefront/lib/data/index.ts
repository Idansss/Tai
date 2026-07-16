import { apiProvider } from './api';
import { mockProvider } from './mock';
import type { StorefrontDataProvider } from './types';

/**
 * Selects the data provider. Defaults to the typed mock adapter; set
 * DATA_SOURCE=api once real catalogue endpoints exist. Every mock-backed screen
 * is recorded in docs/handoffs/FRONTEND_HANDOFF.md until it is swapped.
 */
export const dataProvider: StorefrontDataProvider =
  process.env.DATA_SOURCE === 'api' ? apiProvider : mockProvider;

export * from './types';
