import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    // Buscar o pedido com ID 1 e todos os relacionamentos
    const pedido = await prisma.pedido.findUnique({
      where: { id: 1 },
      include: {
        cliente: true,
        itensPedido: {
          include: {
            produto: true,
          },
        },
      },
    });

    console.log('Pedido:', JSON.stringify(pedido, null, 2));
  } catch (error) {
    console.error('Erro ao verificar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
