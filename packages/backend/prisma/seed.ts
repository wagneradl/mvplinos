import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes
  await prisma.itensPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.cliente.deleteMany();

  // Criar cliente de teste
  const cliente = await prisma.cliente.create({
    data: {
      cnpj: '12345678901234',
      razao_social: 'Restaurante Exemplo Ltda',
      nome_fantasia: 'Restaurante Exemplo',
      telefone: '11999999999',
      email: 'contato@restauranteexemplo.com',
      status: 'ativo'
    }
  });

  // Criar produtos de teste
  const produtos = await Promise.all([
    prisma.produto.create({
      data: {
        nome: 'Pão Francês',
        preco_unitario: 0.50,
        tipo_medida: 'un',
        status: 'ativo'
      }
    }),
    prisma.produto.create({
      data: {
        nome: 'Pão de Leite',
        preco_unitario: 0.75,
        tipo_medida: 'un',
        status: 'ativo'
      }
    }),
    prisma.produto.create({
      data: {
        nome: 'Bolo de Chocolate',
        preco_unitario: 45.00,
        tipo_medida: 'un',
        status: 'ativo'
      }
    })
  ]);

  console.log('Dados de teste criados:');
  console.log('Cliente:', cliente);
  console.log('Produtos:', produtos);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
