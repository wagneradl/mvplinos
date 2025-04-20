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

    // Remove todos usuários exceto admin e operador
    await prisma.usuario.deleteMany({
      where: {
        email: {
          notIn: ['admin@linos.com', 'operador@linos.com'],
        },
      },
    });
    console.log('Usuários não essenciais removidos');

    // Obter senhas das variáveis de ambiente com fallbacks
    console.log('ADMIN_PASSWORD definido:', !!process.env.ADMIN_PASSWORD);
    console.log('OPERADOR_PASSWORD definido:', !!process.env.OPERADOR_PASSWORD);
    
    const adminPassword = process.env.ADMIN_PASSWORD || 'A9!pLx7@wQ3#zR2$';
    const operadorPassword = process.env.OPERADOR_PASSWORD || 'Op3r@dor!2025#Xy';

    // Gerar hashes das senhas
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const operadorPasswordHash = await bcrypt.hash(operadorPassword, 10);

    // Upsert para o admin (cria ou atualiza)
    await prisma.usuario.upsert({
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
    console.log('Usuário admin atualizado/criado com sucesso');

    // Upsert para o operador (cria ou atualiza)
    await prisma.usuario.upsert({
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
    console.log('Usuário operador atualizado/criado com sucesso');

    console.log('Seed concluído com sucesso.');
  } catch (error) {
    console.error('Erro ao rodar seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
