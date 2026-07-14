export interface AnalyticsEvent {
  name: string;
  occurredAt: string;
  actorId?: string;
  anonymousId?: string;
  properties: Readonly<Record<string, unknown>>;
}
