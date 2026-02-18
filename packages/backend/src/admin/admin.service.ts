import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { PAPEL_ADMIN_SISTEMA, PAPEL_OPERADOR_PEDIDOS, NIVEIS_PAPEL } from '../auth/roles.constants';
import { debugLog } from '../common/utils/debug-log';

// Configuração dos papéis essenciais para o seed via API
const PAPEIS_ESSENCIAIS = [
  {
    nome: 'Administrador do Sistema',
    codigo: PAPEL_ADMIN_SISTEMA,
    descricao: 'Acesso total ao sistema, incluindo configurações e backups',
    tipo: 'INTERNO',
    nivel: NIVEIS_PAPEL[PAPEL_ADMIN_SISTEMA],
    permissoes: {
      usuarios: ['listar', 'ver', 'criar', 'editar', 'desativar', 'deletar', 'resetar_senha'],
      papeis: ['listar', 'ver', 'criar', 'editar', 'desativar', 'deletar'],
      clientes: ['listar', 'ver', 'criar', 'editar', 'desativar', 'exportar'],
      produtos: ['listar', 'ver', 'criar', 'editar', 'desativar', 'exportar'],
      pedidos: ['listar', 'ver', 'criar', 'editar', 'cancelar', 'exportar'],
      relatorios: ['listar', 'ver', 'exportar'],
      financeiro: ['listar', 'ver', 'criar', 'editar', 'exportar'],
      sistema: ['ver', 'editar', 'backup', 'restore'],
    },
  },
  {
    nome: 'Operador de Pedidos',
    codigo: PAPEL_OPERADOR_PEDIDOS,
    descricao: 'Cria e gerencia pedidos do dia a dia',
    tipo: 'INTERNO',
    nivel: NIVEIS_PAPEL[PAPEL_OPERADOR_PEDIDOS],
    permissoes: {
      clientes: ['listar', 'ver'],
      produtos: ['listar', 'ver'],
      pedidos: ['listar', 'ver', 'criar', 'editar', 'cancelar'],
      relatorios: ['listar', 'ver'],
    },
  },
];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async executeSeed() {
    debugLog('AdminService', 'Iniciando seed manual...');
    try {
      const papeisMap: Record<string, { id: number; codigo: string }> = {};

      // Upsert papéis essenciais
      for (const papelConfig of PAPEIS_ESSENCIAIS) {
        const papel = await this.prisma.papel.upsert({
          where: { codigo: papelConfig.codigo },
          update: {
            nome: papelConfig.nome,
            descricao: papelConfig.descricao,
            tipo: papelConfig.tipo,
            nivel: papelConfig.nivel,
            permissoes: JSON.stringify(papelConfig.permissoes),
            ativo: true,
          },
          create: {
            nome: papelConfig.nome,
            codigo: papelConfig.codigo,
            descricao: papelConfig.descricao,
            tipo: papelConfig.tipo,
            nivel: papelConfig.nivel,
            permissoes: JSON.stringify(papelConfig.permissoes),
            ativo: true,
          },
        });
        papeisMap[papelConfig.codigo] = { id: papel.id, codigo: papel.codigo };
        debugLog('AdminService', `Papel ${papelConfig.codigo}: ${papel.id}`);
      }

      // Criar usuário admin apenas se variáveis de ambiente estiverem definidas
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const papelAdmin = papeisMap[PAPEL_ADMIN_SISTEMA];

      if (adminEmail && adminPassword && papelAdmin) {
        const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
        await this.prisma.usuario.upsert({
          where: { email: adminEmail },
          update: {
            senha: adminPasswordHash,
            papel_id: papelAdmin.id,
            status: 'ativo',
          },
          create: {
            email: adminEmail,
            nome: 'Administrador do Sistema',
            senha: adminPasswordHash,
            papel_id: papelAdmin.id,
            status: 'ativo',
          },
        });
        debugLog('AdminService', `Usuário admin criado/atualizado: ${adminEmail}`);
      } else {
        debugLog(
          'AdminService',
          'ADMIN_EMAIL ou ADMIN_PASSWORD não definidos - usuário admin não criado',
        );
      }

      // Criar usuário operador apenas se variáveis de ambiente estiverem definidas
      const operadorEmail = process.env.OPERADOR_EMAIL;
      const operadorPassword = process.env.OPERADOR_PASSWORD;
      const papelOperador = papeisMap[PAPEL_OPERADOR_PEDIDOS];

      if (operadorEmail && operadorPassword && papelOperador) {
        const operadorPasswordHash = await bcrypt.hash(operadorPassword, 10);
        await this.prisma.usuario.upsert({
          where: { email: operadorEmail },
          update: {
            senha: operadorPasswordHash,
            papel_id: papelOperador.id,
            status: 'ativo',
          },
          create: {
            email: operadorEmail,
            nome: 'Operador de Pedidos',
            senha: operadorPasswordHash,
            papel_id: papelOperador.id,
            status: 'ativo',
          },
        });
        debugLog('AdminService', `Usuário operador criado/atualizado: ${operadorEmail}`);
      } else {
        debugLog(
          'AdminService',
          'OPERADOR_EMAIL ou OPERADOR_PASSWORD não definidos - usuário operador não criado',
        );
      }

      return {
        success: true,
        message: 'Seed executado com sucesso',
        papeisCriados: Object.keys(papeisMap),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao executar seed: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async resetDatabase() {
    debugLog('AdminService', 'Iniciando reset do banco de dados...');
    try {
      // Remove todos usuários exceto admin e operador
      await this.prisma.usuario.deleteMany({
        where: {
          email: {
            notIn: ['admin@linos.com', 'operador@linos.com'],
          },
        },
      });
      debugLog('AdminService', 'Usuários não essenciais removidos');

      // Execute o seed para garantir que admin e operador estejam atualizados
      await this.executeSeed();

      return {
        success: true,
        message: 'Banco de dados resetado com sucesso',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao resetar banco de dados: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async cleanTestData() {
    debugLog('AdminService', 'Iniciando limpeza de dados de teste...');
    try {
      // Devido às relações de chave estrangeira, precisamos excluir na ordem correta

      // 1. Primeiro removemos os itens de pedido (incluindo soft-deleted)
      await this.prisma.$executeRaw`DELETE FROM "ItemPedido"`;
      debugLog('AdminService', 'Itens de pedido removidos (incluindo soft-deleted)');

      // 2. Depois removemos os pedidos (incluindo soft-deleted)
      await this.prisma.$executeRaw`DELETE FROM "Pedido"`;
      debugLog('AdminService', 'Pedidos removidos (incluindo soft-deleted)');

      // 3. Agora podemos remover produtos (incluindo soft-deleted)
      await this.prisma.$executeRaw`DELETE FROM "Produto"`;
      debugLog('AdminService', 'Produtos removidos (incluindo soft-deleted)');

      // 4. Por fim, removemos os clientes (incluindo soft-deleted)
      await this.prisma.$executeRaw`DELETE FROM "Cliente"`;
      debugLog('AdminService', 'Clientes removidos (incluindo soft-deleted)');

      // 5. Execute o seed para garantir que admin e operador estejam atualizados
      await this.executeSeed();

      return {
        success: true,
        message:
          'Dados de teste removidos com sucesso (incluindo soft-deleted). Usuários padrões mantidos.',
        details: {
          usuariosPreservados: ['admin@linos.com', 'operador@linos.com'],
          dadosRemovidos: ['ItemPedido', 'Pedido', 'Produto', 'Cliente'],
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Erro ao limpar dados de teste: ${errorMessage}`, errorStack);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
