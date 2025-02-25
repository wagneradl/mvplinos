import { Test, TestingModule } from '@nestjs/testing';
import { PedidosService } from './pedidos.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PedidosService', () => {
  let service: PedidosService;
  let prisma: PrismaService;

  const mockPedido = {
    id: 1,
    cliente_id: 1,
    cliente: {
      id: 1,
      nome_fantasia: 'Cliente Teste',
      razao_social: 'Cliente Teste LTDA',
      cnpj: '12345678901234',
      email: 'teste@teste.com',
      telefone: '11999999999',
      status: 'ATIVO',
    },
    data_pedido: new Date(),
    status: 'PENDENTE',
    valor_total: 100,
    deleted_at: null,
    itensPedido: [
      {
        id: 1,
        pedido_id: 1,
        produto_id: 1,
        quantidade: 2,
        preco_unitario: 50,
        valor_total_item: 100,
      },
    ],
  };

  const mockPrismaService = {
    pedido: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('repeat', () => {
    it('should create a new order based on an existing one', async () => {
      mockPrismaService.pedido.findUnique.mockResolvedValue(mockPedido);
      mockPrismaService.pedido.create.mockResolvedValue({
        ...mockPedido,
        id: 2,
        data_pedido: new Date(),
      });

      const result = await service.repeat(1);

      expect(mockPrismaService.pedido.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { itensPedido: true },
      });

      expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
        data: {
          cliente_id: mockPedido.cliente_id,
          status: 'PENDENTE',
          valor_total: mockPedido.valor_total,
          itensPedido: {
            create: mockPedido.itensPedido.map((item) => ({
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              valor_total_item: item.valor_total_item,
            })),
          },
        },
        include: {
          itensPedido: true,
          cliente: true,
        },
      });

      expect(result.id).toBe(2);
    });

    it('should throw NotFoundException when pedido not found', async () => {
      mockPrismaService.pedido.findUnique.mockResolvedValue(null);

      await expect(service.repeat(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated pedidos', async () => {
      const page = 1;
      const limit = 10;
      const mockPedidos = [mockPedido];
      const mockCount = 1;

      mockPrismaService.pedido.findMany.mockResolvedValue(mockPedidos);
      mockPrismaService.pedido.count.mockResolvedValue(mockCount);

      const result = await service.findAll(page, limit);

      expect(result).toEqual({
        data: mockPedidos,
        meta: {
          total: mockCount,
          page,
          limit,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a pedido', async () => {
      mockPrismaService.pedido.findUnique.mockResolvedValue(mockPedido);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPedido);
    });

    it('should throw NotFoundException when pedido not found', async () => {
      mockPrismaService.pedido.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateReport', () => {
    it('should generate report with correct filters', async () => {
      const mockPedidos = [
        {
          ...mockPedido,
          cliente: {
            id: 1,
            nome_fantasia: 'Cliente Teste',
          },
        },
      ];

      mockPrismaService.pedido.findMany.mockResolvedValue(mockPedidos);

      const result = await service.generateReport({
        startDate: '2025-02-01',
        endDate: '2025-02-28',
        clienteId: 1,
        groupBy: 'diario',
      });

      expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          data_pedido: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          cliente_id: 1,
        },
        include: {
          cliente: true,
          itensPedido: true,
        },
        orderBy: {
          data_pedido: 'asc',
        },
      });

      expect(result).toHaveProperty('filtros');
      expect(result).toHaveProperty('dados');
      expect(result.dados[0]).toHaveProperty('total_pedidos');
      expect(result.dados[0]).toHaveProperty('valor_total');
      expect(result.dados[0]).toHaveProperty('pedidos_por_cliente');
      expect(result.dados[0]).toHaveProperty('produtos_mais_vendidos');
    });

    it('should generate daily report', async () => {
      const startDate = '2025-02-01';
      const endDate = '2025-02-28';
      const groupBy = 'diario';
      
      const mockPedidos = [
        { ...mockPedido, data_pedido: new Date('2025-02-01') },
        { ...mockPedido, data_pedido: new Date('2025-02-01') },
        { ...mockPedido, data_pedido: new Date('2025-02-02') },
      ];

      mockPrismaService.pedido.findMany.mockResolvedValue(mockPedidos);

      const result = await service.generateReport({
        startDate,
        endDate,
        groupBy,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('total_orders');
      expect(result.summary).toHaveProperty('total_value');
      expect(result.summary).toHaveProperty('average_value');
    });

    it('should generate weekly report', async () => {
      const startDate = '2025-02-01';
      const endDate = '2025-02-28';
      const groupBy = 'semanal';
      
      const mockPedidos = [
        { ...mockPedido, data_pedido: new Date('2025-02-01') },
        { ...mockPedido, data_pedido: new Date('2025-02-08') },
        { ...mockPedido, data_pedido: new Date('2025-02-15') },
      ];

      mockPrismaService.pedido.findMany.mockResolvedValue(mockPedidos);

      const result = await service.generateReport({
        startDate,
        endDate,
        groupBy,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('summary');
    });

    it('should generate monthly report', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      const groupBy = 'mensal';
      
      const mockPedidos = [
        { ...mockPedido, data_pedido: new Date('2025-01-15') },
        { ...mockPedido, data_pedido: new Date('2025-02-15') },
        { ...mockPedido, data_pedido: new Date('2025-03-15') },
      ];

      mockPrismaService.pedido.findMany.mockResolvedValue(mockPedidos);

      const result = await service.generateReport({
        startDate,
        endDate,
        groupBy,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('summary');
    });
  });
});
