import { rest } from 'msw';
import { IProduto, ICliente, IPedido } from '@linos/shared';

// Mock data
const mockProdutos: IProduto[] = [
  {
    id: 1,
    nome: 'Pão Francês',
    preco_unitario: 0.5,
    tipo_medida: 'unidade',
    status: 'ativo'
  }
];

const mockClientes: ICliente[] = [
  {
    id: 1,
    cnpj: '12345678000199',
    razao_social: 'Empresa Teste LTDA',
    nome_fantasia: 'Empresa Teste',
    telefone: '11999999999',
    email: 'teste@empresa.com',
    status: 'ativo'
  }
];

// API Handlers
export const handlers = [
  // Produtos
  rest.get('http://localhost:3001/api/produtos', (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1;
    const limit = Number(req.url.searchParams.get('limit')) || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return res(
      ctx.status(200),
      ctx.json({
        data: mockProdutos.slice(start, end),
        total: mockProdutos.length,
        page,
        limit
      })
    );
  }),

  // Clientes
  rest.get('http://localhost:3001/api/clientes', (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1;
    const limit = Number(req.url.searchParams.get('limit')) || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return res(
      ctx.status(200),
      ctx.json({
        data: mockClientes.slice(start, end),
        total: mockClientes.length,
        page,
        limit
      })
    );
  }),

  // Outras rotas podem ser adicionadas conforme necessário
];