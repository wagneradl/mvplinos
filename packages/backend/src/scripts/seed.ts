import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('Iniciando seed...');
    console.log(`Ambiente: ${process.env.NODE_ENV}`);
    console.log(`Database URL: ${process.env.DATABASE_URL}`);

    // Upsert (cria ou atualiza) papéis essenciais
    const papelAdmin = await prisma.papel.upsert({
      where: { nome: 'Administrador' },
      update: {},
      create: {
        nome: 'Administrador',
        descricao: 'Acesso total ao sistema',
        permissoes: '{"clientes": ["read","write","delete"], "produtos": ["read","write","delete"], "pedidos": ["read","write","delete"], "relatorios": ["read"], "usuarios": ["read","write","delete"]}'
      },
    });
    console.log(`Papel Administrador: ${papelAdmin.id}`);

    const papelOperador = await prisma.papel.upsert({
      where: { nome: 'Operador' },
      update: {},
      create: {
        nome: 'Operador',
        descricao: 'Acesso limitado',
        permissoes: '{"clientes": ["read"]}'
      },
    });
    console.log(`Papel Operador: ${papelOperador.id}`);

    // Obter configurações de usuários das variáveis de ambiente
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@linos.com';
    const operadorEmail = process.env.OPERADOR_EMAIL || 'operador@linos.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    const operadorPassword = process.env.OPERADOR_PASSWORD;

    // Remove todos usuários exceto admin e operador
    await prisma.usuario.deleteMany({
      where: {
        email: {
          notIn: [adminEmail, operadorEmail],
        },
      },
    });
    console.log('Usuários não essenciais removidos');

    // Criar/atualizar usuário admin (apenas se ADMIN_PASSWORD estiver definido)
    if (adminPassword) {
      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.usuario.upsert({
        where: { email: adminEmail },
        update: {
          senha: adminPasswordHash,
          papel_id: papelAdmin.id,
          status: 'ativo',
        },
        create: {
          email: adminEmail,
          nome: 'Administrador',
          senha: adminPasswordHash,
          papel_id: papelAdmin.id,
          status: 'ativo',
        },
      });
      console.log(`Usuário admin (${adminEmail}) atualizado/criado com sucesso`);
    } else {
      console.warn('⚠️  ADMIN_PASSWORD não definido. Pulando criação/atualização do usuário admin.');
      console.warn('   Configure ADMIN_PASSWORD no arquivo .env para criar o usuário administrador.');
    }

    // Criar/atualizar usuário operador (apenas se OPERADOR_PASSWORD estiver definido)
    if (operadorPassword) {
      const operadorPasswordHash = await bcrypt.hash(operadorPassword, 10);
      await prisma.usuario.upsert({
        where: { email: operadorEmail },
        update: {
          senha: operadorPasswordHash,
          papel_id: papelOperador.id,
          status: 'ativo',
        },
        create: {
          email: operadorEmail,
          nome: 'Operador',
          senha: operadorPasswordHash,
          papel_id: papelOperador.id,
          status: 'ativo',
        },
      });
      console.log(`Usuário operador (${operadorEmail}) atualizado/criado com sucesso`);
    } else {
      console.warn('⚠️  OPERADOR_PASSWORD não definido. Pulando criação/atualização do usuário operador.');
      console.warn('   Configure OPERADOR_PASSWORD no arquivo .env para criar o usuário operador.');
    }

    console.log('Seed concluído com sucesso.');
  } catch (error) {
    console.error('Erro ao rodar seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
