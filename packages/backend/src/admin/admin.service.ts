import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async executeSeed() {
    this.logger.log('Iniciando seed manual...');
    try {
      // Upsert (cria ou atualiza) papéis essenciais
      const papelAdmin = await this.prisma.papel.upsert({
        where: { nome: 'Administrador' },
        update: {},
        create: {
          nome: 'Administrador',
          descricao: 'Acesso total ao sistema',
          permissoes: '{"clientes": ["read","write","delete"], "produtos": ["read","write","delete"], "pedidos": ["read","write","delete"], "relatorios": ["read"], "usuarios": ["read","write","delete"]}'
        },
      });
      this.logger.log(`Papel Administrador: ${papelAdmin.id}`);

      const papelOperador = await this.prisma.papel.upsert({
        where: { nome: 'Operador' },
        update: {},
        create: {
          nome: 'Operador',
          descricao: 'Acesso limitado',
          permissoes: '{"clientes": ["read"]}'
        },
      });
      this.logger.log(`Papel Operador: ${papelOperador.id}`);

      // Obter senhas das variáveis de ambiente com fallbacks
      const adminPassword = process.env.ADMIN_PASSWORD || 'A9!pLx7@wQ3#zR2$';
      const operadorPassword = process.env.OPERADOR_PASSWORD || 'Op3r@dor!2025#Xy';

      // Gerar hashes das senhas
      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
      const operadorPasswordHash = await bcrypt.hash(operadorPassword, 10);

      // Upsert para o admin (cria ou atualiza)
      await this.prisma.usuario.upsert({
        where: { email: 'admin@linos.com' },
        update: {
          senha: adminPasswordHash,
          papel_id: papelAdmin.id,
          status: 'ativo',
        },
        create: {
          email: 'admin@linos.com',
          nome: 'Administrador',
          senha: adminPasswordHash,
          papel_id: papelAdmin.id,
          status: 'ativo',
        },
      });
      this.logger.log('Usuário admin atualizado/criado com sucesso');

      // Upsert para o operador (cria ou atualiza)
      await this.prisma.usuario.upsert({
        where: { email: 'operador@linos.com' },
        update: {
          senha: operadorPasswordHash,
          papel_id: papelOperador.id,
          status: 'ativo',
        },
        create: {
          email: 'operador@linos.com',
          nome: 'Operador',
          senha: operadorPasswordHash,
          papel_id: papelOperador.id,
          status: 'ativo',
        },
      });
      this.logger.log('Usuário operador atualizado/criado com sucesso');

      return {
        success: true,
        message: 'Seed executado com sucesso',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao executar seed: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  async resetDatabase() {
    this.logger.log('Iniciando reset do banco de dados...');
    try {
      // Remove todos usuários exceto admin e operador
      await this.prisma.usuario.deleteMany({
        where: {
          email: {
            notIn: ['admin@linos.com', 'operador@linos.com'],
          },
        },
      });
      this.logger.log('Usuários não essenciais removidos');

      // Execute o seed para garantir que admin e operador estejam atualizados
      await this.executeSeed();

      return {
        success: true,
        message: 'Banco de dados resetado com sucesso',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao resetar banco de dados: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  async cleanTestData() {
    this.logger.log('Iniciando limpeza de dados de teste...');
    try {
      // Devido às relações de chave estrangeira, precisamos excluir na ordem correta
      
      // 1. Primeiro removemos os itens de pedido (incluindo soft-deleted)
      await this.prisma.$executeRaw`DELETE FROM "ItemPedido"`;
      this.logger.log('Itens de pedido removidos (incluindo soft-deleted)');
      
      // 2. Depois removemos os pedidos (incluindo soft-deleted)
      await this.prisma.$executeRaw`DELETE FROM "Pedido"`;
      this.logger.log('Pedidos removidos (incluindo soft-deleted)');
      
      // 3. Agora podemos remover produtos (incluindo soft-deleted)
      await this.prisma.$executeRaw`DELETE FROM "Produto"`;
      this.logger.log('Produtos removidos (incluindo soft-deleted)');
      
      // 4. Por fim, removemos os clientes (incluindo soft-deleted)
      await this.prisma.$executeRaw`DELETE FROM "Cliente"`;
      this.logger.log('Clientes removidos (incluindo soft-deleted)');
      
      // 5. Execute o seed para garantir que admin e operador estejam atualizados
      await this.executeSeed();

      return {
        success: true,
        message: 'Dados de teste removidos com sucesso (incluindo soft-deleted). Usuários padrões mantidos.',
        details: {
          usuariosPreservados: ['admin@linos.com', 'operador@linos.com'],
          dadosRemovidos: ['ItemPedido', 'Pedido', 'Produto', 'Cliente']
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao limpar dados de teste: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }
}
