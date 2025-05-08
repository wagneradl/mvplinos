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

    // Lista de produtos de padaria para inserir
    const produtos = [
      { nome: 'Pão Francês', preco_unitario: 0.75, tipo_medida: 'unidade' },
      { nome: 'Pão de Forma', preco_unitario: 7.99, tipo_medida: 'pacote' },
      { nome: 'Pão Integral', preco_unitario: 8.99, tipo_medida: 'pacote' },
      { nome: 'Pão de Queijo', preco_unitario: 0.95, tipo_medida: 'unidade' },
      { nome: 'Croissant', preco_unitario: 4.50, tipo_medida: 'unidade' },
      { nome: 'Sonho', preco_unitario: 4.25, tipo_medida: 'unidade' },
      { nome: 'Rosquinha', preco_unitario: 0.85, tipo_medida: 'unidade' },
      { nome: 'Bolo de Chocolate', preco_unitario: 25.90, tipo_medida: 'unidade' },
      { nome: 'Bolo de Cenoura', preco_unitario: 22.90, tipo_medida: 'unidade' },
      { nome: 'Bolo de Fubá', preco_unitario: 20.90, tipo_medida: 'unidade' },
      { nome: 'Torta de Frango', preco_unitario: 32.90, tipo_medida: 'unidade' },
      { nome: 'Torta de Palmito', preco_unitario: 35.90, tipo_medida: 'unidade' },
      { nome: 'Coxinha', preco_unitario: 4.50, tipo_medida: 'unidade' },
      { nome: 'Empada', preco_unitario: 4.75, tipo_medida: 'unidade' },
      { nome: 'Pastel de Forno', preco_unitario: 5.50, tipo_medida: 'unidade' },
      { nome: 'Pão de Batata', preco_unitario: 5.25, tipo_medida: 'unidade' },
      { nome: 'Pão Doce', preco_unitario: 3.75, tipo_medida: 'unidade' },
      { nome: 'Broa de Milho', preco_unitario: 4.25, tipo_medida: 'unidade' },
      { nome: 'Biscoito de Polvilho', preco_unitario: 12.90, tipo_medida: 'pacote' },
      { nome: 'Pão Australiano', preco_unitario: 9.90, tipo_medida: 'unidade' },
    ];

    // Inserir cada produto usando upsert (criar se não existir, atualizar se existir)
    for (const produto of produtos) {
      await prisma.produto.upsert({
        where: { nome: produto.nome },
        update: {
          preco_unitario: produto.preco_unitario,
          tipo_medida: produto.tipo_medida,
          status: 'ativo',
        },
        create: {
          nome: produto.nome,
          preco_unitario: produto.preco_unitario,
          tipo_medida: produto.tipo_medida,
          status: 'ativo',
        },
      });
      console.log(`Produto ${produto.nome} criado/atualizado com sucesso`);
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
