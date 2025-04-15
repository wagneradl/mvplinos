import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@linos.com';
  const senha = 'L!n0s@Adm!n2025';
  const senhaHash = await bcrypt.hash(senha, 10);

  // Garante que o papel "Administrador" exista
  let papel = await prisma.papel.findUnique({ where: { nome: 'Administrador' } });

  if (!papel) {
    papel = await prisma.papel.create({
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
      }
    });
    console.log('✅ Papel "Administrador" criado.');
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log('⚠️ Usuário admin já existe. Nada foi alterado.');
    return;
  }

  await prisma.usuario.create({
    data: {
      nome: 'Admin Linos',
      email,
      senha: senhaHash,
      papel_id: papel.id,
      status: 'ativo',
    },
  });

  console.log('✅ Usuário admin criado com sucesso.');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar admin:', e);
  })
  .finally(() => prisma.$disconnect());
