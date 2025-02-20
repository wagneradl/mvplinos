import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

@Injectable()
export class PrismaTestService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
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
    try {
      // Desativar temporariamente as foreign keys
      await this.$executeRaw`PRAGMA foreign_keys = OFF;`;

      // Limpar todas as tabelas em ordem
      await this.$transaction([
        this.$executeRaw`DELETE FROM ItemPedido;`,
        this.$executeRaw`DELETE FROM Pedido;`,
        this.$executeRaw`DELETE FROM Cliente;`,
        this.$executeRaw`DELETE FROM Produto;`,
      ]);

      // Reativar as foreign keys
      await this.$executeRaw`PRAGMA foreign_keys = ON;`;
    } catch (error) {
      console.error('Erro ao limpar o banco de dados:', error);
      throw error;
    }
  }
}
