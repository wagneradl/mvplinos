import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProdutos() {
  try {
    console.log('Iniciando seed de produtos...');
    console.log(`Ambiente: ${process.env.NODE_ENV}`);
    console.log(`Database URL: ${process.env.DATABASE_URL}`);

    // Verificar se estamos em ambiente de desenvolvimento
    if (process.env.NODE_ENV !== 'development') {
      console.error('Este script só deve ser executado em ambiente de desenvolvimento!');
      console.error('Abortando para proteger o banco de dados de produção.');
      process.exit(1);
    }

    // Lista de produtos de padaria para inserir com tipos de medida válidos: 'un', 'kg', 'lt'
    const produtos = [
      // Produtos por unidade (un)
      { nome: 'Pão Francês', preco_unitario: 0.75, tipo_medida: 'un' },
      { nome: 'Pão de Forma', preco_unitario: 7.99, tipo_medida: 'un' },
      { nome: 'Pão Integral', preco_unitario: 8.99, tipo_medida: 'un' },
      { nome: 'Pão de Queijo', preco_unitario: 0.95, tipo_medida: 'un' },
      { nome: 'Croissant', preco_unitario: 4.5, tipo_medida: 'un' },
      { nome: 'Sonho', preco_unitario: 4.25, tipo_medida: 'un' },
      { nome: 'Rosquinha', preco_unitario: 0.85, tipo_medida: 'un' },
      { nome: 'Bolo de Chocolate', preco_unitario: 25.9, tipo_medida: 'un' },
      { nome: 'Bolo de Cenoura', preco_unitario: 22.9, tipo_medida: 'un' },
      { nome: 'Bolo de Fubá', preco_unitario: 20.9, tipo_medida: 'un' },
      { nome: 'Torta de Frango', preco_unitario: 32.9, tipo_medida: 'un' },
      { nome: 'Torta de Palmito', preco_unitario: 35.9, tipo_medida: 'un' },
      { nome: 'Coxinha', preco_unitario: 4.5, tipo_medida: 'un' },
      { nome: 'Empada', preco_unitario: 4.75, tipo_medida: 'un' },
      { nome: 'Pastel de Forno', preco_unitario: 5.5, tipo_medida: 'un' },

      // Produtos por quilo (kg)
      { nome: 'Farinha de Trigo', preco_unitario: 5.5, tipo_medida: 'kg' },
      { nome: 'Açúcar Refinado', preco_unitario: 4.2, tipo_medida: 'kg' },
      { nome: 'Açúcar Cristal', preco_unitario: 3.8, tipo_medida: 'kg' },
      { nome: 'Pão de Centeio', preco_unitario: 18.9, tipo_medida: 'kg' },
      { nome: 'Pão de Fermentação Natural', preco_unitario: 24.9, tipo_medida: 'kg' },
      { nome: 'Bolo de Rolo', preco_unitario: 45.0, tipo_medida: 'kg' },
      { nome: 'Biscoito Amanteigado', preco_unitario: 32.0, tipo_medida: 'kg' },
      { nome: 'Polvilho Doce', preco_unitario: 8.5, tipo_medida: 'kg' },
      { nome: 'Granola', preco_unitario: 29.9, tipo_medida: 'kg' },
      { nome: 'Farinha de Milho', preco_unitario: 6.3, tipo_medida: 'kg' },

      // Produtos por litro (lt)
      { nome: 'Leite Integral', preco_unitario: 4.99, tipo_medida: 'lt' },
      { nome: 'Leite Desnatado', preco_unitario: 5.49, tipo_medida: 'lt' },
      { nome: 'Iogurte Natural', preco_unitario: 8.9, tipo_medida: 'lt' },
      { nome: 'Calda de Chocolate', preco_unitario: 18.5, tipo_medida: 'lt' },
      { nome: 'Calda de Caramelo', preco_unitario: 19.9, tipo_medida: 'lt' },
      { nome: 'Suco de Laranja Natural', preco_unitario: 12.9, tipo_medida: 'lt' },
      { nome: 'Creme de Leite Fresco', preco_unitario: 22.0, tipo_medida: 'lt' },
      { nome: 'Óleo de Coco', preco_unitario: 38.5, tipo_medida: 'lt' },
      { nome: 'Mel Puro', preco_unitario: 45.0, tipo_medida: 'lt' },
      { nome: 'Leite de Coco', preco_unitario: 26.9, tipo_medida: 'lt' },

      // Mais produtos por unidade (un)
      { nome: 'Pão Australiano', preco_unitario: 9.9, tipo_medida: 'un' },
      { nome: 'Pão de Batata', preco_unitario: 5.25, tipo_medida: 'un' },
      { nome: 'Pão Doce', preco_unitario: 3.75, tipo_medida: 'un' },
      { nome: 'Broa de Milho', preco_unitario: 4.25, tipo_medida: 'un' },
      { nome: 'Esfiha de Carne', preco_unitario: 5.9, tipo_medida: 'un' },
      { nome: 'Esfiha de Queijo', preco_unitario: 5.5, tipo_medida: 'un' },
      { nome: 'Baguete', preco_unitario: 6.9, tipo_medida: 'un' },
      { nome: 'Muffin de Blueberry', preco_unitario: 7.5, tipo_medida: 'un' },
      { nome: 'Cupcake', preco_unitario: 8.9, tipo_medida: 'un' },
      { nome: 'Brownie', preco_unitario: 6.5, tipo_medida: 'un' },
    ];

    // Atualizar produtos existentes e inserir novos
    console.log('Atualizando e inserindo produtos...');

    // Inserir ou atualizar cada produto usando upsert
    for (const produto of produtos) {
      await prisma.produto.upsert({
        where: { nome: produto.nome },
        update: {
          preco_unitario: produto.preco_unitario,
          tipo_medida: produto.tipo_medida,
          status: 'ativo',
          deleted_at: null, // Garantir que não está marcado como deletado
        },
        create: {
          nome: produto.nome,
          preco_unitario: produto.preco_unitario,
          tipo_medida: produto.tipo_medida,
          status: 'ativo',
        },
      });
      console.log(`Produto ${produto.nome} (${produto.tipo_medida}) criado/atualizado com sucesso`);
    }

    console.log('Seed de produtos concluído com sucesso.');
  } catch (error) {
    console.error('Erro ao rodar seed de produtos:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o seed
seedProdutos();
