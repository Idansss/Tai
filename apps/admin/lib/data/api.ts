import type { AdminDataProvider } from './types';

/**
 * Real admin API adapter — a loud-failing stub until Codex publishes the admin
 * read endpoints (dashboard metrics, orders, production, etc.). Selecting it via
 * DATA_SOURCE=api before the endpoints exist should fail obviously rather than
 * silently returning empty data.
 */
function notImplemented(name: string): never {
  throw new Error(
    `apiProvider.${name} is not implemented: admin read endpoints are not available yet ` +
      '(see docs/coordination/FRONTEND_TO_BACKEND.md). Use the mock adapter until they land.',
  );
}

export const apiProvider: AdminDataProvider = {
  getDashboard() {
    return notImplemented('getDashboard');
  },
  listOrders() {
    return notImplemented('listOrders');
  },
  getOrder() {
    return notImplemented('getOrder');
  },
};
