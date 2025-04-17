import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function ensureAdminUser() {
  const prisma = new PrismaClient();
  const email = 'admin@linos.com';
  const senha = 'L!n0s@Adm!n2025';
  const senhaHash = await bcrypt.hash(senha, 10);

  // Garante papel
  let papel = await prisma.papel.findFirst({ where: { nome: 'Administrador' } });
  if (!papel) {
    papel = await prisma.papel.create({
      data: {
        nome: 'Administrador',
        descricao: 'Acesso completo ao sistema',
        permissoes: JSON.stringify({
          clientes: ['read', 'create', 'update', 'delete'],
          produtos: ['read', 'create', 'update', 'delete'],
          pedidos: ['read', 'create', 'update', 'delete'],
          usuarios: ['read', 'create', 'update', 'delete'],
        }),
      },
    });
  }

  // Garante usuário admin
  let usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email,
        senha: senhaHash,
        papel_id: papel.id,
        status: 'ativo',
      },
    });
    console.log('✅ Usuário admin criado com sucesso.');
  } else {
    await prisma.usuario.update({
      where: { email },
      data: {
        senha: senhaHash,
        papel_id: papel.id,
        status: 'ativo',
      },
    });
    console.log('✅ Usuário admin existente atualizado (senha resetada).');
  }
  await prisma.$disconnect();
}
