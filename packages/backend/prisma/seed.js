"use strict";
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes (exceto usuários e papéis essenciais)
  console.log('Limpando dados existentes, exceto usuários e papéis essenciais...');
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.cliente.deleteMany();

  // Limpar todos os usuários antes de criar os iniciais
  await prisma.usuario.deleteMany();

  // Garante papéis essenciais
  let papelAdmin = await prisma.papel.findUnique({ where: { nome: 'Administrador' } });
  if (!papelAdmin) {
    papelAdmin = await prisma.papel.create({
      data: {
        nome: 'Administrador',
        descricao: 'Acesso completo ao sistema',
        permissoes: JSON.stringify({
          clientes: ['read', 'write', 'delete'],
          produtos: ['read', 'write', 'delete'],
          pedidos: ['read', 'write', 'delete'],
          relatorios: ['read'],
          usuarios: ['read', 'write', 'delete'],
        }),
      },
    });
  }
  let papelOperador = await prisma.papel.findUnique({ where: { nome: 'Operador' } });
  if (!papelOperador) {
    papelOperador = await prisma.papel.create({
      data: {
        nome: 'Operador',
        descricao: 'Acesso às operações do dia-a-dia',
        permissoes: JSON.stringify({
          clientes: ['read', 'write'],
          produtos: ['read'],
          pedidos: ['read', 'write'],
          relatorios: ['read'],
        }),
      },
    });
  }

  // Senhas fortes sugeridas
  const adminPassword = 'A9!pLx7@wQ3#zR2$';
  const operadorPassword = 'Op3r@dor!2025#Xy';

  // Criar usuário admin
  const adminEmail = 'admin@linos.com';
  const hashSenha = await bcrypt.hash(adminPassword, 10);
  await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: adminEmail,
      senha: hashSenha,
      papel_id: papelAdmin.id,
      status: 'ativo',
    },
  });

  // Criar usuário operador
  const operadorEmail = 'operador@linos.com';
  const hashSenhaOperador = await bcrypt.hash(operadorPassword, 10);
  await prisma.usuario.create({
    data: {
      nome: 'Operador',
      email: operadorEmail,
      senha: hashSenhaOperador,
      papel_id: papelOperador.id,
      status: 'ativo',
    },
  });
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
