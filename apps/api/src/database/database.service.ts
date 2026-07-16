import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { loadEnvironment } from '@tms/configuration';
import { createDatabaseClient, type DatabaseClient } from '@tms/database';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: DatabaseClient;

  constructor() {
    this.client = createDatabaseClient(loadEnvironment().DATABASE_URL);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
