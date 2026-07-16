import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { loadEnvironment } from '@tms/configuration';
import {
  EicarAwareMalwareScanner,
  HttpMalwareScanner,
  MEDIA_QUEUE_NAME,
  S3ObjectStorage,
} from '@tms/media';

import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { DatabaseService } from '../database/database.service.js';
import { AdminMediaController, PublicMediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import {
  MEDIA_QUEUE,
  MEDIA_SCANNER,
  MEDIA_STORAGE,
  type MediaQueuePublisher,
} from './media.tokens.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminMediaController, PublicMediaController],
  providers: [
    DatabaseService,
    MediaService,
    {
      provide: MEDIA_STORAGE,
      useFactory: () => {
        const env = loadEnvironment();
        return new S3ObjectStorage(env.S3_BUCKET, {
          endpoint: env.S3_ENDPOINT,
          region: env.S3_REGION,
          forcePathStyle: true,
          credentials: {
            accessKeyId: env.S3_ACCESS_KEY,
            secretAccessKey: env.S3_SECRET_KEY,
          },
        });
      },
    },
    {
      provide: MEDIA_SCANNER,
      useFactory: () => {
        const endpoint = loadEnvironment().MEDIA_MALWARE_SCAN_URL;
        return endpoint ? new HttpMalwareScanner(endpoint) : new EicarAwareMalwareScanner();
      },
    },
    {
      provide: MEDIA_QUEUE,
      useFactory: (): MediaQueuePublisher => {
        const env = loadEnvironment();
        const redis = new URL(env.REDIS_URL);
        const queue = new Queue(MEDIA_QUEUE_NAME, {
          prefix: 'tms',
          connection: {
            host: redis.hostname,
            port: Number(redis.port || 6379),
            username: redis.username || undefined,
            password: redis.password || undefined,
            ...(redis.protocol === 'rediss:' ? { tls: {} } : {}),
          },
        });
        return {
          enqueue: async (data) => {
            await queue.add('create-derivatives', data, {
              jobId: data.processingJobId,
              attempts: 3,
              backoff: { type: 'exponential', delay: 1_000 },
              removeOnComplete: 500,
              removeOnFail: 1_000,
            });
          },
        };
      },
    },
  ],
})
export class MediaModule {}
