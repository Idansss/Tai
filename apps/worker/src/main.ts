import pino from 'pino';
import { Worker } from 'bullmq';
import { loadEnvironment } from '@tms/configuration';
import { createDatabaseClient } from '@tms/database';
import { MEDIA_QUEUE_NAME, S3ObjectStorage, type MediaDerivativeJobData } from '@tms/media';

import { buildWorkerRuntimeConfig } from './config.js';
import { MediaDerivativeProcessor } from './media-processor.js';
import { PrismaMediaProcessingRepository } from './media-repository.js';

const config = buildWorkerRuntimeConfig();
const logger = pino({ name: 'tms-worker' });

const environment = loadEnvironment();
const redis = new URL(environment.REDIS_URL);
const database = createDatabaseClient(environment.DATABASE_URL);
const storage = new S3ObjectStorage(environment.S3_BUCKET, {
  endpoint: environment.S3_ENDPOINT,
  region: environment.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: environment.S3_ACCESS_KEY,
    secretAccessKey: environment.S3_SECRET_KEY,
  },
});
const processor = new MediaDerivativeProcessor(
  new PrismaMediaProcessingRepository(database),
  storage,
);
const worker = new Worker<MediaDerivativeJobData>(
  MEDIA_QUEUE_NAME,
  (job) => processor.process(job.data),
  {
    concurrency: config.concurrency,
    prefix: config.queuePrefix,
    connection: {
      host: redis.hostname,
      port: Number(redis.port || 6379),
      username: redis.username || undefined,
      password: redis.password || undefined,
      ...(redis.protocol === 'rediss:' ? { tls: {} } : {}),
    },
  },
);

worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Media derivative job completed.'));
worker.on('failed', (job, error) =>
  logger.error({ jobId: job?.id, error }, 'Media derivative job failed.'),
);
logger.info({ config }, 'Background media worker is ready.');

const shutdown = async () => {
  await worker.close();
  await database.$disconnect();
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
