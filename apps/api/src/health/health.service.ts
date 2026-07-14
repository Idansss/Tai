import { Injectable } from '@nestjs/common';

export interface HealthSnapshot {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

@Injectable()
export class HealthService {
  getSnapshot(now = new Date()): HealthSnapshot {
    return {
      status: 'ok',
      service: 'api',
      timestamp: now.toISOString(),
    };
  }
}
