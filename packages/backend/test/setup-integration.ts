import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { execSync } from 'child_process';

export let app: INestApplication;
export let prismaService: PrismaService;

// Extensão global do Jest para timeout mais longo em testes de integração
jest.setTimeout(30000);

// Configuração do banco de dados de teste antes de todos os testes
beforeAll(async () => {
  // Garantir que estamos usando o banco de dados de teste
  process.env.DATABASE_URL = 'file:./test.db';

  try {
    // Se houver uma instância anterior do PrismaService, desconectar
    if (prismaService) {
      await prismaService.$disconnect();
    }

    // Limpar e recriar o banco de dados de teste
    execSync('rm -f test.db && yarn prisma migrate deploy', {
      env: process.env,
      stdio: 'pipe', // Mudar para pipe para evitar logs desnecessários
    });

    // Criar e configurar a aplicação NestJS
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prismaService = app.get(PrismaService);
    await app.init();
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
});

// Limpar o banco de dados após cada teste
afterEach(async () => {
  try {
    await prismaService.$transaction(async (tx) => {
      // Ordem específica para respeitar as foreign keys
      await tx.itensPedido.deleteMany();
      await tx.pedido.deleteMany();
      await tx.cliente.deleteMany();
      await tx.produto.deleteMany();
    });
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