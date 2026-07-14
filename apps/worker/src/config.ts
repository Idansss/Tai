export interface WorkerRuntimeConfig {
  concurrency: number;
  queuePrefix: string;
}

export function buildWorkerRuntimeConfig(
  input: NodeJS.ProcessEnv = process.env,
): WorkerRuntimeConfig {
  const concurrency = Number.parseInt(input.WORKER_CONCURRENCY ?? '5', 10);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) {
    throw new Error('WORKER_CONCURRENCY must be an integer between 1 and 100.');
  }
  return { concurrency, queuePrefix: input.QUEUE_PREFIX ?? 'tms' };
}
