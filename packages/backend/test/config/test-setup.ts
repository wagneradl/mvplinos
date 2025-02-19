import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { testConfig } from './test-base.config';

interface CreateTestProductData {
  nome?: string;
  preco_unitario?: number;
  tipo_medida?: string;
  status?: 'ativo' | 'inativo';
}

export interface TestContext {
  app: INestApplication;
  prismaService: PrismaService;
}

export async function setupTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const prismaService = moduleFixture.get<PrismaService>(PrismaService);
  await app.init();

  // Limpar banco de dados
  await cleanupDatabase(prismaService);

  return {
    app,
    prismaService,
  };
}

export async function cleanupDatabase(prisma: PrismaService): Promise<void> {
  const tablenames = await prisma.$queryRaw<
    Array<{ name: string }>
  >`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_migrations';`;

  for (const { name } of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${name}";`);
    } catch (error) {
      console.warn(`Error cleaning table ${name}:`, error);
    }
  }
}

export async function createTestProduct(prisma: PrismaService, data: CreateTestProductData = {}) {
  return prisma.produto.create({
    data: {
      nome: data.nome || 'Produto Teste',
      preco_unitario: data.preco_unitario || 10.50,
      tipo_medida: data.tipo_medida || 'un',
      status: data.status || 'ativo',
    },
  });
}

export function createInvalidProductData(): CreateTestProductData {
  return {
    nome: '',
    preco_unitario: -1,
    tipo_medida: '',
    status: 'invalido' as 'ativo' | 'inativo'
  };
}

export function expectValidationError(error: any, field: string, message: string) {
  expect(error.response.statusCode).toBe(400);
  expect(error.response.message).toEqual(
    expect.arrayContaining([message])
  );
}