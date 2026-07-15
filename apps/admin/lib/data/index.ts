import { apiProvider } from './api';
import { mockAdminProvider } from './mock';
import type { AdminDataProvider } from './types';

/**
 * Selects the admin data provider. Defaults to the typed mock adapter; set
 * DATA_SOURCE=api once the admin read endpoints exist. Every mock-backed screen
 * is recorded in docs/handoffs/FRONTEND_HANDOFF.md until it is swapped.
 */
export const adminDataProvider: AdminDataProvider =
  process.env.DATA_SOURCE === 'api' ? apiProvider : mockAdminProvider;

export * from './types';
