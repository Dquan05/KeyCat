import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { readConfig } from '../config/env';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnApplicationShutdown
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: readConfig().databaseUrl,
    });
    super({ adapter });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }
}
