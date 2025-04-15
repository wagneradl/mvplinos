import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function ensureAdminUser() {
  const prisma = new PrismaClient();
  const email = 'admin@linos.com';
  const senha = 'L!n0s@Adm!n2025';
  const senhaHash = await bcrypt.hash(senha, 10);

  // Garante papel
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

  // Garante usuário
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (!existente) {
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
  await prisma.$disconnect();
}
