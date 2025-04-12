import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Limpar dados existentes
  console.log('Limpando dados existentes...');
  await prisma.itensPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.papel.deleteMany();

  console.log('Criando papéis de usuários...');
  // Criar papéis (roles)
  const papelAdmin = await prisma.papel.create({
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

  const papelOperador = await prisma.papel.create({
    data: {
      nome: 'Operador',
      descricao: 'Acesso às operações do dia-a-dia',
      permissoes: JSON.stringify({
        clientes: ['read', 'write'],
        produtos: ['read'],
        pedidos: ['read', 'write'],
        relatorios: ['read'],
      }),
    }
  });

  // Criar usuário admin
  console.log('Criando usuário administrador padrão...');
  const hashSenha = await bcrypt.hash('admin123', 10);
  const usuarioAdmin = await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: 'admin@linos.com.br',
      senha: hashSenha,
      papel_id: papelAdmin.id,
      status: 'ativo'
    }
  });

  // Criar usuário operador para testes
  console.log('Criando usuário operador para testes...');
  const hashSenhaOperador = await bcrypt.hash('operador123', 10);
  const usuarioOperador = await prisma.usuario.create({
    data: {
      nome: 'Operador Teste',
      email: 'operador@linos.com.br',
      senha: hashSenhaOperador,
      papel_id: papelOperador.id,
      status: 'ativo'
    }
  });

  // Criar cliente de teste
  console.log('Criando dados de teste para o sistema...');
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
  console.log('Papéis:', { admin: papelAdmin, operador: papelOperador });
  console.log('Usuários:', { admin: usuarioAdmin, operador: usuarioOperador });
  console.log('Cliente:', cliente);
  console.log('Produtos:', produtos);
  console.log('\n===============================================');
  console.log('CREDENCIAIS PARA ACESSO:');
  console.log('Administrador: admin@linos.com.br / senha: admin123');
  console.log('Operador: operador@linos.com.br / senha: operador123');
  console.log('===============================================\n');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
