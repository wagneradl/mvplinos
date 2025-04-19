import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  try {
    // Limpar todas as tabelas exceto Papel e Usuario
    // (Opcional: caso precise garantir limpeza total, pode-se deletar outras entidades)
    // await prisma.<outrasTabelas>.deleteMany({});

    // Upsert (cria ou atualiza) papéis essenciais
    const papelAdmin = await prisma.papel.upsert({
      where: { nome: 'Administrador' },
      update: {},
      create: {
        nome: 'Administrador',
        descricao: 'Acesso total ao sistema',
        permissoes: '{"*": "read,write"}'
      }
    });
    const papelOperador = await prisma.papel.upsert({
      where: { nome: 'Operador' },
      update: {},
      create: {
        nome: 'Operador',
        descricao: 'Acesso limitado',
        permissoes: '{"clientes": "read"}'
      }
    });

    // Remove todos usuários exceto admin e operador
    await prisma.usuario.deleteMany({
      where: {
        email: {
          notIn: ['admin@linos.com', 'operador@linos.com']
        }
      }
    });

    // Upsert (cria ou atualiza) usuário admin
    await prisma.usuario.upsert({
      where: { email: 'admin@linos.com' },
      update: {
        nome: 'Administrador',
        senha: await bcrypt.hash('A9!pLx7@wQ3#zR2$', 10),
        papel_id: papelAdmin.id,
        status: 'ATIVO',
      },
      create: {
        email: 'admin@linos.com',
        nome: 'Administrador',
        senha: await bcrypt.hash('A9!pLx7@wQ3#zR2$', 10),
        papel_id: papelAdmin.id,
        status: 'ATIVO',
      }
    });
    // Upsert operador
    await prisma.usuario.upsert({
      where: { email: 'operador@linos.com' },
      update: {
        nome: 'Operador',
        senha: await bcrypt.hash('Op3r@dor!2025#Xy', 10),
        papel_id: papelOperador.id,
        status: 'ATIVO',
      },
      create: {
        email: 'operador@linos.com',
        nome: 'Operador',
        senha: await bcrypt.hash('Op3r@dor!2025#Xy', 10),
        papel_id: papelOperador.id,
        status: 'ATIVO',
      }
    });
    console.log('Usuários admin e operador seedados/atualizados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar dados essenciais:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
