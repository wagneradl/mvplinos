import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { AppModule } from '../src/app.module';

const prisma = new PrismaClient();
let app: INestApplication;

// Extensão global do Jest para timeout mais longo em testes E2E
jest.setTimeout(30000);

// Configuração da aplicação e banco de dados antes de todos os testes
beforeAll(async () => {
  // Garantir que estamos usando o banco de dados de teste
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.includes('test.db')) {
    throw new Error('Tests must use a dedicated test database!');
  }

  try {
    // Executar migrations no banco de teste
    execSync('yarn prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: dbUrl },
    });

    // Criar e configurar a aplicação de teste
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    await app.init();
    
    // Disponibilizar app globalmente para os testes
    global.app = app;
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

// Limpar o banco de dados após cada teste
afterEach(async () => {
  const tables = ['ItensPedido', 'Pedido', 'Cliente', 'Produto'];
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table};`);
    await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='${table}';`);
  }
});

// Fechar aplicação e conexão com o banco após todos os testes
afterAll(async () => {
  await app?.close();
  await prisma.$disconnect();
});