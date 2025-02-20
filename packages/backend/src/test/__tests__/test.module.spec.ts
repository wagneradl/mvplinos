import { Test } from '@nestjs/testing';
import { TestModule } from '../test.module';
import { PrismaTestService } from '../../prisma/prisma.service.test';

describe('TestModule', () => {
  it('should provide PrismaService', async () => {
    const module = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    const prismaService = module.get('PrismaService');
    expect(prismaService).toBeInstanceOf(PrismaTestService);
  });

  it('should export PrismaService', async () => {
    const module = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    const exports = Reflect.getMetadata('exports', TestModule);
    expect(exports).toContain('PrismaService');
  });
});
