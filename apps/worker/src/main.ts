import pino from 'pino';

import { buildWorkerRuntimeConfig } from './config.js';

const config = buildWorkerRuntimeConfig();
const logger = pino({ name: 'tms-worker' });

logger.info(
  { config },
  'Background worker foundation is ready; queues are registered by domain modules.',
);
