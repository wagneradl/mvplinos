import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const adminEmail = 'admin@linospadaria.com';
    
    // Verifica se já existe um usuário admin
    const existingAdmin = await prisma.usuario.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log('Usuário admin já existe');
      return;
    }

    // Cria o usuário admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.usuario.create({
      data: {
        email: adminEmail,
        nome: 'Administrador',
        senha: hashedPassword,
        role: 'admin',
        status: 'ativo',
      },
    });

    console.log('Usuário admin criado com sucesso:', admin.email);
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();