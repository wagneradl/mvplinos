import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTotal() {
  try {
    // Buscar o pedido e seus itens
    const pedido = await prisma.pedido.findUnique({
      where: { id: 1 },
      include: {
        itensPedido: true,
      },
    });

    if (!pedido) {
      console.error('Pedido não encontrado');
      return;
    }

    // Calcular o valor total correto
    const valorTotal = pedido.itensPedido.reduce((total, item) => {
      return total + item.valor_total_item;
    }, 0);

    // Atualizar o pedido com o valor total correto
    const pedidoAtualizado = await prisma.pedido.update({
      where: { id: 1 },
      data: {
        valor_total: valorTotal,
      },
    });

    console.log('Valor total atualizado:', pedidoAtualizado);
  } catch (error) {
    console.error('Erro ao corrigir valor total:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTotal();
