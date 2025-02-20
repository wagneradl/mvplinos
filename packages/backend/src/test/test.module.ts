import { Module } from '@nestjs/common';
import { PrismaTestService } from '../prisma/prisma.service.test';

@Module({
  providers: [
    {
      provide: 'PrismaService',
      useClass: PrismaTestService,
    },
  ],
  exports: ['PrismaService'],
})
export class TestModule {}
