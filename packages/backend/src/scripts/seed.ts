import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  try {
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
    const papelOperador = await prisma.papel.upsert({
      where: { nome: 'Operador' },
      update: {},
      create: {
        nome: 'Operador',
        descricao: 'Acesso limitado',
        permissoes: '{"clientes": ["read"]}'
      },
    });

    // Remove todos usuários exceto admin e operador
    await prisma.usuario.deleteMany({
      where: {
        email: {
          notIn: ['admin@linos.com', 'operador@linos.com'],
        },
      },
    });

    // Criação do admin apenas se não existir
    const admin = await prisma.usuario.findUnique({ where: { email: 'admin@linos.com' } });
    if (!admin) {
      console.log('ADMIN_PASSWORD em uso no seed:', process.env.ADMIN_PASSWORD);
      const adminPassword = process.env.ADMIN_PASSWORD || 'A9!pLx7@wQ3#zR2$';
      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.usuario.create({
        data: {
          email: 'admin@linos.com',
          nome: 'Administrador',
          senha: adminPasswordHash,
          papel_id: papelAdmin.id,
          status: 'ATIVO',
        },
      });
    }

    // Criação do operador apenas se não existir
    const operador = await prisma.usuario.findUnique({ where: { email: 'operador@linos.com' } });
    if (!operador) {
      console.log('OPERADOR_PASSWORD em uso no seed:', process.env.OPERADOR_PASSWORD);
      const operadorPassword = process.env.OPERADOR_PASSWORD || 'Op3r@dor!2025#Xy';
      const operadorPasswordHash = await bcrypt.hash(operadorPassword, 10);
      await prisma.usuario.create({
        data: {
          email: 'operador@linos.com',
          nome: 'Operador',
          senha: operadorPasswordHash,
          papel_id: papelOperador.id,
          status: 'ATIVO',
        },
      });
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
