import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega variáveis de ambiente do .env do backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

// Definição dos papéis com suas permissões
const PAPEIS_CONFIG = [
  // Papéis Internos
  {
    nome: 'Administrador do Sistema',
    codigo: 'ADMIN_SISTEMA',
    descricao: 'Acesso total ao sistema, incluindo configurações e backups',
    tipo: 'INTERNO',
    nivel: 100,
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
    nome: 'Gerente Comercial',
    codigo: 'GERENTE_COMERCIAL',
    descricao: 'Gerencia clientes, produtos, pedidos e relatórios comerciais',
    tipo: 'INTERNO',
    nivel: 80,
    permissoes: {
      usuarios: ['listar', 'ver', 'criar', 'editar'],
      clientes: ['listar', 'ver', 'criar', 'editar', 'desativar', 'exportar'],
      produtos: ['listar', 'ver', 'criar', 'editar', 'desativar', 'exportar'],
      pedidos: ['listar', 'ver', 'criar', 'editar', 'cancelar', 'exportar'],
      relatorios: ['listar', 'ver', 'exportar'],
      financeiro: ['listar', 'ver', 'exportar'],
    },
  },
  {
    nome: 'Operador de Pedidos',
    codigo: 'OPERADOR_PEDIDOS',
    descricao: 'Cria e gerencia pedidos do dia a dia',
    tipo: 'INTERNO',
    nivel: 50,
    permissoes: {
      clientes: ['listar', 'ver'],
      produtos: ['listar', 'ver'],
      pedidos: ['listar', 'ver', 'criar', 'editar', 'cancelar'],
      relatorios: ['listar', 'ver'],
    },
  },
  {
    nome: 'Financeiro',
    codigo: 'FINANCEIRO',
    descricao: 'Acesso a relatórios financeiros e gestão de pagamentos',
    tipo: 'INTERNO',
    nivel: 60,
    permissoes: {
      clientes: ['listar', 'ver'],
      produtos: ['listar', 'ver'],
      pedidos: ['listar', 'ver', 'cancelar', 'exportar'],
      relatorios: ['listar', 'ver', 'exportar'],
      financeiro: ['listar', 'ver', 'criar', 'editar', 'exportar'],
    },
  },
  {
    nome: 'Auditor (Somente Leitura)',
    codigo: 'AUDITOR_READONLY',
    descricao: 'Visualização de todos os dados para auditoria, sem edição',
    tipo: 'INTERNO',
    nivel: 40,
    permissoes: {
      usuarios: ['listar', 'ver'],
      papeis: ['listar', 'ver'],
      clientes: ['listar', 'ver'],
      produtos: ['listar', 'ver'],
      pedidos: ['listar', 'ver', 'exportar'],
      relatorios: ['listar', 'ver', 'exportar'],
      financeiro: ['listar', 'ver', 'exportar'],
    },
  },
  // Papéis de Clientes B2B
  {
    nome: 'Administrador do Cliente',
    codigo: 'CLIENTE_ADMIN',
    descricao: 'Administrador da empresa cliente, gerencia seus usuários e pedidos',
    tipo: 'CLIENTE',
    nivel: 30,
    permissoes: {
      usuarios: ['listar', 'ver', 'criar', 'editar', 'desativar', 'resetar_senha'],
      clientes: ['listar', 'ver'],
      produtos: ['listar', 'ver'],
      pedidos: ['listar', 'ver', 'criar', 'editar', 'cancelar', 'exportar'],
      relatorios: ['listar', 'ver', 'exportar'],
      financeiro: ['listar', 'ver', 'exportar'],
    },
  },
  {
    nome: 'Usuário do Cliente',
    codigo: 'CLIENTE_USUARIO',
    descricao: 'Usuário básico da empresa cliente, cria e visualiza pedidos',
    tipo: 'CLIENTE',
    nivel: 20,
    permissoes: {
      clientes: ['listar', 'ver'],
      produtos: ['listar', 'ver'],
      pedidos: ['listar', 'ver', 'criar', 'editar', 'cancelar'],
      relatorios: ['listar', 'ver'],
      financeiro: ['listar', 'ver'],
    },
  },
];

async function seed() {
  try {
    console.log('='.repeat(60));
    console.log('Iniciando seed...');
    console.log(`Ambiente: ${process.env.NODE_ENV}`);
    console.log('='.repeat(60));

    // =========================================================================
    // CRIAR/ATUALIZAR PAPÉIS
    // =========================================================================
    console.log('\n📋 Criando/atualizando papéis...');

    const papeisMap: Record<string, { id: number; codigo: string }> = {};

    for (const papelConfig of PAPEIS_CONFIG) {
      const papel = await prisma.papel.upsert({
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
      console.log(`   ✅ ${papelConfig.codigo} (id: ${papel.id})`);
    }

    // =========================================================================
    // CRIAR USUÁRIO ADMIN (OPCIONAL - APENAS SE VARIÁVEIS DEFINIDAS)
    // =========================================================================
    console.log('\n👤 Verificando criação de usuário admin...');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
      const papelAdmin = papeisMap['ADMIN_SISTEMA'];

      if (!papelAdmin) {
        console.error('   ❌ Papel ADMIN_SISTEMA não encontrado!');
      } else {
        await prisma.usuario.upsert({
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
        console.log(`   ✅ Usuário admin criado/atualizado: ${adminEmail}`);
      }
    } else {
      console.warn('   ⚠️  ADMIN_EMAIL ou ADMIN_PASSWORD não definidos.');
      console.warn('      Configure no .env para criar o usuário administrador.');
    }

    // =========================================================================
    // CRIAR USUÁRIO OPERADOR (OPCIONAL - APENAS SE VARIÁVEIS DEFINIDAS)
    // =========================================================================
    console.log('\n👤 Verificando criação de usuário operador...');

    const operadorEmail = process.env.OPERADOR_EMAIL;
    const operadorPassword = process.env.OPERADOR_PASSWORD;

    if (operadorEmail && operadorPassword) {
      const operadorPasswordHash = await bcrypt.hash(operadorPassword, 10);
      const papelOperador = papeisMap['OPERADOR_PEDIDOS'];

      if (!papelOperador) {
        console.error('   ❌ Papel OPERADOR_PEDIDOS não encontrado!');
      } else {
        await prisma.usuario.upsert({
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
        console.log(`   ✅ Usuário operador criado/atualizado: ${operadorEmail}`);
      }
    } else {
      console.warn('   ⚠️  OPERADOR_EMAIL ou OPERADOR_PASSWORD não definidos.');
      console.warn('      Configure no .env para criar o usuário operador.');
    }

    // =========================================================================
    // FINALIZAÇÃO
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Seed concluído com sucesso!');
    console.log('='.repeat(60));

    // Mostrar resumo dos papéis criados
    console.log('\n📊 Resumo dos papéis:');
    const papeis = await prisma.papel.findMany({
      orderBy: { nivel: 'desc' },
      select: { codigo: true, nome: true, tipo: true, nivel: true },
    });
    papeis.forEach((p) => {
      console.log(`   [${p.tipo}] ${p.codigo} (nível ${p.nivel}) - ${p.nome}`);
    });
  } catch (error) {
    console.error('\n❌ Erro ao rodar seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
