import { rest } from 'msw';
import { IProduto, ICliente, IPedido, CreateProdutoDto, UpdateProdutoDto, CreateClienteDto, UpdateClienteDto } from '@linos/shared';

const API_URL = 'http://localhost:3001/api';

// Mock data store
let mockData = {
  produtos: [
    {
      id: 1,
      nome: 'Pão Francês',
      preco_unitario: 0.5,
      tipo_medida: 'unidade',
      status: 'ativo',
      deleted_at: null
    }
  ] as IProduto[],

  clientes: [
    {
      id: 1,
      cnpj: '12345678000199',
      razao_social: 'Empresa Teste LTDA',
      nome_fantasia: 'Empresa Teste',
      telefone: '11999999999',
      email: 'teste@empresa.com',
      status: 'ativo',
      deleted_at: null
    }
  ] as ICliente[],

  pedidos: [] as IPedido[]
};

// Helper functions
const getPaginatedResponse = <T>(items: T[], page: number, limit: number) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    data: items.slice(start, end),
    total: items.length,
    page,
    limit
  };
};

// API Handlers
export const handlers = [
  // Produtos
  rest.get(`${API_URL}/produtos`, (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1;
    const limit = Number(req.url.searchParams.get('limit')) || 10;
    const ativos = mockData.produtos.filter(p => !p.deleted_at);
    return res(ctx.status(200), ctx.json(getPaginatedResponse(ativos, page, limit)));
  }),

  rest.get(`${API_URL}/produtos/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const produto = mockData.produtos.find(p => p.id === Number(id) && !p.deleted_at);
    if (!produto) return res(ctx.status(404));
    return res(ctx.status(200), ctx.json(produto));
  }),

  rest.post(`${API_URL}/produtos`, async (req, res, ctx) => {
    const body = await req.json() as CreateProdutoDto;
    const newProduto = {
      ...body,
      id: mockData.produtos.length + 1,
      deleted_at: null
    };
    mockData.produtos.push(newProduto);
    return res(ctx.status(201), ctx.json(newProduto));
  }),

  rest.patch(`${API_URL}/produtos/:id`, async (req, res, ctx) => {
    const { id } = req.params;
    const body = await req.json() as UpdateProdutoDto;
    const index = mockData.produtos.findIndex(p => p.id === Number(id) && !p.deleted_at);
    if (index === -1) return res(ctx.status(404));
    mockData.produtos[index] = { ...mockData.produtos[index], ...body };
    return res(ctx.status(200), ctx.json(mockData.produtos[index]));
  }),

  rest.patch(`${API_URL}/produtos/:id/status`, async (req, res, ctx) => {
    const { id } = req.params;
    const { status } = await req.json() as { status: string };
    const index = mockData.produtos.findIndex(p => p.id === Number(id) && !p.deleted_at);
    if (index === -1) return res(ctx.status(404));
    mockData.produtos[index].status = status;
    return res(ctx.status(200), ctx.json(mockData.produtos[index]));
  }),

  rest.delete(`${API_URL}/produtos/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const index = mockData.produtos.findIndex(p => p.id === Number(id) && !p.deleted_at);
    if (index === -1) return res(ctx.status(404));
    mockData.produtos[index].deleted_at = new Date().toISOString();
    return res(ctx.status(200));
  }),

  // Clientes
  rest.get(`${API_URL}/clientes`, (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1;
    const limit = Number(req.url.searchParams.get('limit')) || 10;
    const ativos = mockData.clientes.filter(c => !c.deleted_at);
    return res(ctx.status(200), ctx.json(getPaginatedResponse(ativos, page, limit)));
  }),

  rest.get(`${API_URL}/clientes/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const cliente = mockData.clientes.find(c => c.id === Number(id) && !c.deleted_at);
    if (!cliente) return res(ctx.status(404));
    return res(ctx.status(200), ctx.json(cliente));
  }),

  rest.post(`${API_URL}/clientes`, async (req, res, ctx) => {
    const body = await req.json() as CreateClienteDto;
    const newCliente = {
      ...body,
      id: mockData.clientes.length + 1,
      deleted_at: null
    };
    mockData.clientes.push(newCliente);
    return res(ctx.status(201), ctx.json(newCliente));
  }),

  rest.patch(`${API_URL}/clientes/:id`, async (req, res, ctx) => {
    const { id } = req.params;
    const body = await req.json() as UpdateClienteDto;
    const index = mockData.clientes.findIndex(c => c.id === Number(id) && !c.deleted_at);
    if (index === -1) return res(ctx.status(404));
    mockData.clientes[index] = { ...mockData.clientes[index], ...body };
    return res(ctx.status(200), ctx.json(mockData.clientes[index]));
  }),

  rest.delete(`${API_URL}/clientes/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const index = mockData.clientes.findIndex(c => c.id === Number(id) && !c.deleted_at);
    if (index === -1) return res(ctx.status(404));
    mockData.clientes[index].deleted_at = new Date().toISOString();
    return res(ctx.status(200));
  }),

  // Reset mock data (useful for tests)
  rest.post(`${API_URL}/__test__/reset`, (req, res, ctx) => {
    mockData = {
      produtos: [],
      clientes: [],
      pedidos: []
    };
    return res(ctx.status(200));
  })
];