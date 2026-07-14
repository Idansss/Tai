import { randomUUID } from 'node:crypto';

const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveCorrelationId(
  incoming: string | undefined,
  generate: () => string = randomUUID,
): string {
  return incoming && SAFE_CORRELATION_ID.test(incoming) ? incoming : generate();
}
