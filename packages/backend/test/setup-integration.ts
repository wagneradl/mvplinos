import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

export let app: INestApplication;
export let prismaService: PrismaService;

// Configuração do banco de dados de teste antes de todos os testes
beforeAll(async () => {
  try {
    // Criar e configurar a aplicação NestJS
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
      whitelist: true,
      forbidUnknownValues: true
    }));
    
    prismaService = app.get(PrismaService);
    await app.init();

    // Limpar o banco de dados antes de começar os testes
    await prismaService.$executeRaw`PRAGMA foreign_keys = OFF;`;
    await prismaService.$transaction([
      prismaService.$executeRaw`DELETE FROM ItemPedido;`,
      prismaService.$executeRaw`DELETE FROM Pedido;`,
      prismaService.$executeRaw`DELETE FROM Cliente;`,
      prismaService.$executeRaw`DELETE FROM Produto;`,
    ]);
    await prismaService.$executeRaw`PRAGMA foreign_keys = ON;`;
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
});

// Limpar o banco de dados após cada teste
afterEach(async () => {
  try {
    await prismaService.$executeRaw`PRAGMA foreign_keys = OFF;`;
    await prismaService.$transaction([
      prismaService.$executeRaw`DELETE FROM ItemPedido;`,
      prismaService.$executeRaw`DELETE FROM Pedido;`,
      prismaService.$executeRaw`DELETE FROM Cliente;`,
      prismaService.$executeRaw`DELETE FROM Produto;`,
    ]);
    await prismaService.$executeRaw`PRAGMA foreign_keys = ON;`;
  } catch (error) {
    console.error('Erro ao limpar o banco de dados:', error);
    throw error;
  }
});

// Fechar conexão com o banco após todos os testes
afterAll(async () => {
  try {
    if (prismaService) {
      await prismaService.$disconnect();
    }
    if (app) {
      await app.close();
    }
  } catch (error) {
    console.error('Erro ao fechar conexões:', error);
    throw error;
  }
});