import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

export type Context = {
  prisma: PrismaClient;
};

export type MockContext = {
  prisma: DeepMockProxy<PrismaClient>;
};

export const createMockContext = (): MockContext => {
  return {
    prisma: mockDeep<PrismaClient>(),
  };
};

export const createMockPrismaService = () => {
  const mockContext = createMockContext();
  const mockProduto = createTestProduto();
  const mockCliente = createTestClient();

  // Setup default mock implementations for produto
  mockContext.prisma.produto.create.mockResolvedValue(mockProduto);
  mockContext.prisma.produto.findMany.mockResolvedValue([mockProduto]);
  mockContext.prisma.produto.findFirst.mockResolvedValue(mockProduto);
  mockContext.prisma.produto.findUnique.mockResolvedValue(mockProduto);
  mockContext.prisma.produto.update.mockResolvedValue(mockProduto);
  mockContext.prisma.produto.count.mockResolvedValue(1);

  // Setup default mock implementations for cliente
  mockContext.prisma.cliente.create.mockResolvedValue(mockCliente);
  mockContext.prisma.cliente.findMany.mockResolvedValue([mockCliente]);
  mockContext.prisma.cliente.findFirst.mockResolvedValue(mockCliente);
  mockContext.prisma.cliente.findUnique.mockResolvedValue(mockCliente);
  mockContext.prisma.cliente.update.mockResolvedValue(mockCliente);
  mockContext.prisma.cliente.count.mockResolvedValue(1);

  const prismaService = {
    ...mockContext.prisma,
    $transaction: jest.fn((callback) => callback(mockContext.prisma)),
  };
  return prismaService;
};

export const createTestClient = (overrides = {}) => ({
  id: 1,
  cnpj: '12.345.678/0001-90',
  razao_social: 'Empresa Teste LTDA',
  nome_fantasia: 'Empresa Teste',
  telefone: '(11) 98765-4321',
  email: 'contato@empresa.com',
  status: 'ativo',
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createTestProduto = (overrides = {}) => ({
  id: 1,
  nome: 'Produto Teste',
  preco_unitario: 10.0,
  tipo_medida: 'un',
  status: 'ativo',
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createTestPedido = (overrides = {}) => ({
  id: 1,
  cliente_id: 1,
  data_pedido: new Date(),
  status: 'pendente',
  valor_total: 100.0,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});