import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaTestService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: 'file:./test.db'
        }
      },
      log: ['error']
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    const models = Reflect.ownKeys(this).filter(key => {
      return typeof key === 'string' && 
             !key.startsWith('_') && 
             !['$connect', '$disconnect', 'cleanDatabase'].includes(key as string);
    });

    return Promise.all(
      models.map(async (modelKey) => {
        if (typeof modelKey === 'string') {
          //@ts-ignore - Dynamic access to Prisma models
          return this[modelKey].deleteMany();
        }
      })
    );
  }
}
