import { recordAudit, type AuditActor } from './audit.js';
import type { SiteContentClient } from './client.js';

/**
 * Typed key/value site configuration: general settings, maintenance mode,
 * feature flags, notification preferences and business contact details.
 */
export interface BusinessDetails {
  email: string;
  phone: string;
  addressLines: string[];
  hours: string;
  city: string;
  country: string;
}

export interface MaintenanceSetting {
  enabled: boolean;
  message: string;
}

export const SETTING_KEYS = {
  business: 'business.details',
  maintenance: 'site.maintenance',
  featureFlags: 'site.feature_flags',
  notifications: 'site.notifications',
} as const;

export async function getSetting<T>(
  client: SiteContentClient,
  key: string,
  fallback: T,
): Promise<T> {
  const row = await client.siteSetting.findUnique({ where: { key } });
  return (row?.value as T | undefined) ?? fallback;
}

export async function setSetting(
  client: SiteContentClient,
  key: string,
  value: unknown,
  actor: AuditActor,
  description?: string,
): Promise<void> {
  const before = await client.siteSetting.findUnique({ where: { key } });
  const json = JSON.parse(JSON.stringify(value)) as object;
  await client.siteSetting.upsert({
    where: { key },
    create: { key, value: json, description, updatedById: actor.id },
    update: { value: json, description, updatedById: actor.id },
  });
  await recordAudit(client, {
    actor,
    action: 'setting.update',
    resourceType: 'site_setting',
    resourceId: key,
    summary: `Updated setting "${key}"`,
    before: before?.value,
    after: json,
  });
}

export async function getFeatureFlags(client: SiteContentClient): Promise<Record<string, boolean>> {
  return getSetting<Record<string, boolean>>(client, SETTING_KEYS.featureFlags, {});
}

export async function getMaintenance(client: SiteContentClient): Promise<MaintenanceSetting> {
  return getSetting<MaintenanceSetting>(client, SETTING_KEYS.maintenance, {
    enabled: false,
    message: 'We are performing scheduled maintenance. Please check back shortly.',
  });
}
