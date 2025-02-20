import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  try {
    // Criar um cliente
    const cliente = await prisma.cliente.create({
      data: {
        cnpj: '12345678901234',
        razao_social: 'Empresa Teste LTDA',
        nome_fantasia: 'Empresa Teste',
        email: 'teste@empresa.com',
        telefone: '(11) 99999-9999',
      },
    });

    // Criar alguns produtos
    const pao = await prisma.produto.create({
      data: {
        nome: 'Pão Francês',
        preco_unitario: 0.50,
        tipo_medida: 'unidade',
      },
    });

    const bolo = await prisma.produto.create({
      data: {
        nome: 'Bolo de Chocolate',
        preco_unitario: 35.00,
        tipo_medida: 'unidade',
      },
    });

    // Preparar os itens do pedido
    const itensPedido = [
      {
        produto_id: pao.id,
        quantidade: 50,
        preco_unitario: pao.preco_unitario,
        valor_total_item: 50 * pao.preco_unitario,
      },
      {
        produto_id: bolo.id,
        quantidade: 1,
        preco_unitario: bolo.preco_unitario,
        valor_total_item: bolo.preco_unitario,
      },
    ];

    // Calcular o valor total do pedido
    const valorTotal = itensPedido.reduce((total, item) => total + item.valor_total_item, 0);

    // Criar um pedido
    const pedido = await prisma.pedido.create({
      data: {
        cliente_id: cliente.id,
        valor_total: valorTotal,
        itensPedido: {
          create: itensPedido,
        },
      },
      include: {
        cliente: true,
        itensPedido: {
          include: {
            produto: true,
          },
        },
      },
    });

    console.log('Dados de teste criados com sucesso!');
    console.log('Cliente:', cliente);
    console.log('Produtos:', { pao, bolo });
    console.log('Pedido:', pedido);
  } catch (error) {
    console.error('Erro ao criar dados de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
