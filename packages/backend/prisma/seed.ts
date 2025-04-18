import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes (exceto usuários e papéis essenciais)
  console.log('Limpando dados existentes, exceto usuários e papéis essenciais...');
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.cliente.deleteMany();

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

  // Sempre sobrescreve/cria usuário admin
  const adminEmail = 'admin@linos.com';
  const hashSenha = await bcrypt.hash(adminPassword, 10);
  await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {
      nome: 'Administrador',
      senha: hashSenha,
      papel_id: papelAdmin.id,
      status: 'ativo',
    },
    create: {
      nome: 'Administrador',
      email: adminEmail,
      senha: hashSenha,
      papel_id: papelAdmin.id,
      status: 'ativo',
    },
  });

  // Sempre sobrescreve/cria usuário operador
  const operadorEmail = 'operador@linos.com';
  const hashSenhaOperador = await bcrypt.hash(operadorPassword, 10);
  await prisma.usuario.upsert({
    where: { email: operadorEmail },
    update: {
      nome: 'Operador',
      senha: hashSenhaOperador,
      papel_id: papelOperador.id,
      status: 'ativo',
    },
    create: {
      nome: 'Operador',
      email: operadorEmail,
      senha: hashSenhaOperador,
      papel_id: papelOperador.id,
      status: 'ativo',
    },
  });

  // Exibir as credenciais no console
  console.log('\n===============================================');
  console.log('CREDENCIAIS PARA PRIMEIRO ACESSO:');
  console.log(`Administrador: ${adminEmail} / senha: ${adminPassword}`);
  console.log(`Operador: ${operadorEmail} / senha: ${operadorPassword}`);
  console.log('===============================================\n');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
