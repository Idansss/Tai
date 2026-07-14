export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unconfigured';
  checkedAt: string;
}

export class IntegrationUnavailableError extends Error {
  constructor(readonly provider: string) {
    super(`${provider} is unavailable.`);
    this.name = 'IntegrationUnavailableError';
  }
}
