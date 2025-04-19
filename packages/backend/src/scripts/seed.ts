import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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
        status: 'ATIVO',
      },
    });

    // Criar alguns produtos
    const pao = await prisma.produto.create({
      data: {
        nome: 'Pão Francês',
        preco_unitario: 0.50,
        tipo_medida: 'unidade',
        status: 'ATIVO',
      },
    });

    const bolo = await prisma.produto.create({
      data: {
        nome: 'Bolo de Chocolate',
        preco_unitario: 35.00,
        tipo_medida: 'unidade',
        status: 'ATIVO',
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
        data_pedido: new Date(),
        status: 'ATIVO',
        valor_total: valorTotal,
        pdf_path: '',
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

    // Upsert (cria ou atualiza) papéis essenciais
    const papelAdmin = await prisma.papel.upsert({
      where: { nome: 'Administrador' },
      update: {},
      create: {
        nome: 'Administrador',
        descricao: 'Acesso total ao sistema',
        permissoes: '{"*": "read,write"}'
      }
    });
    const papelOperador = await prisma.papel.upsert({
      where: { nome: 'Operador' },
      update: {},
      create: {
        nome: 'Operador',
        descricao: 'Acesso limitado',
        permissoes: '{"clientes": "read"}'
      }
    });

    // Upsert (cria ou atualiza) usuário admin
    await prisma.usuario.upsert({
      where: { email: 'admin@linos.com' },
      update: {
        nome: 'Administrador',
        senha: await bcrypt.hash('A9!pLx7@wQ3#zR2$', 10),
        papel_id: papelAdmin.id,
        status: 'ATIVO',
      },
      create: {
        email: 'admin@linos.com',
        nome: 'Administrador',
        senha: await bcrypt.hash('A9!pLx7@wQ3#zR2$', 10),
        papel_id: papelAdmin.id,
        status: 'ATIVO',
      }
    });
    // Upsert operador
    await prisma.usuario.upsert({
      where: { email: 'operador@linos.com' },
      update: {
        nome: 'Operador',
        senha: await bcrypt.hash('Op3r@dor!2025#Xy', 10),
        papel_id: papelOperador.id,
        status: 'ATIVO',
      },
      create: {
        email: 'operador@linos.com',
        nome: 'Operador',
        senha: await bcrypt.hash('Op3r@dor!2025#Xy', 10),
        papel_id: papelOperador.id,
        status: 'ATIVO',
      }
    });
    console.log('Usuários admin e operador seedados/atualizados com sucesso!');
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
