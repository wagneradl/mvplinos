import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaTestService } from '../prisma/prisma.service.test';
import { TestModule } from './test.module';

export class TestHelper {
  static async createTestingModule(imports: any[]): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [...imports, TestModule],
    }).compile();
  }

  static async createTestingApp(module: TestingModule): Promise<INestApplication> {
    const app = module.createNestApplication();
    await app.init();
    return app;
  }

  static getPrismaTestService(module: TestingModule): PrismaTestService {
    return module.get<PrismaTestService>('PrismaService');
  }

  static async cleanupDatabase(module: TestingModule) {
    const prismaService = TestHelper.getPrismaTestService(module);
    await prismaService.cleanDatabase();
  }

  static async closeApp(app: INestApplication) {
    await app.close();
  }
}
