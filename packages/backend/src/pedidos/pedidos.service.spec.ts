import { Test, TestingModule } from '@nestjs/testing';
import { PedidosService } from './pedidos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';

describe('PedidosService', () => {
  let service: PedidosService;

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

  const mockPdfService = {
    generatePedidoPdf: jest.fn(),
    generateRelatorioPdf: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated pedidos with FilterPedidoDto', async () => {
      const mockPedidos = [mockPedido];
      const mockCount = 1;

      mockPrismaService.pedido.findMany.mockResolvedValue(mockPedidos);
      mockPrismaService.pedido.count.mockResolvedValue(mockCount);

      const filter = { page: 1, limit: 10 };
      const result = await service.findAll(filter);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('total');
      expect(mockPrismaService.pedido.findMany).toHaveBeenCalled();
      expect(mockPrismaService.pedido.count).toHaveBeenCalled();
    });
  });

  describe('generateReport', () => {
    it('should generate report and return resumo and detalhes', async () => {
      const mockPedidos = [
        {
          ...mockPedido,
          cliente: {
            id: 1,
            nome_fantasia: 'Cliente Teste',
          },
          itensPedido: mockPedido.itensPedido,
        },
      ];

      mockPrismaService.pedido.findMany.mockResolvedValue(mockPedidos);

      const result = await service.generateReport({
        data_inicio: '2025-02-01',
        data_fim: '2025-02-28',
        cliente_id: 1,
      });

      expect(result).toHaveProperty('resumo');
      expect(result).toHaveProperty('detalhes');
      expect(result).toHaveProperty('colunas');
      expect(mockPrismaService.pedido.findMany).toHaveBeenCalled();
    });

    it('should return empty results when no pedidos found', async () => {
      mockPrismaService.pedido.findMany.mockResolvedValue([]);

      const result = await service.generateReport({
        data_inicio: '2025-02-01',
        data_fim: '2025-02-28',
      });

      expect(result).toHaveProperty('resumo');
      expect(result.resumo.total_orders).toBe(0);
      expect(result.observacoes).toContain('Nenhum pedido');
    });
  });
});
