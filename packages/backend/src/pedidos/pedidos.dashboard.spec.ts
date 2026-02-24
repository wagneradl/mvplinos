import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PedidosService } from './pedidos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';

describe('PedidosService — getDashboard', () => {
  let service: PedidosService;

  const mockPrismaService = {
    pedido: {
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    produto: { findMany: jest.fn() },
    cliente: { findFirst: jest.fn() },
    itemPedido: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockPdfService = {
    generatePedidoPdf: jest.fn(),
    generateRelatorioPdf: jest.fn(),
    generateReportPdf: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosService,
        StructuredLoggerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
  });

  // Helper: configura os mocks do Prisma para getDashboard
  function setupDashboardMocks(opts: {
    totalPedidos?: number;
    pedidosMes?: number;
    valorTotalMes?: number | null;
    pedidosPendentes?: number;
    statusGroups?: { status: string; _count: { _all: number } }[];
    pedidosRecentes?: any[];
  } = {}) {
    // count é chamado 3 vezes (total, mês, pendentes)
    mockPrismaService.pedido.count
      .mockResolvedValueOnce(opts.totalPedidos ?? 0) // total
      .mockResolvedValueOnce(opts.pedidosMes ?? 0)   // mês
      .mockResolvedValueOnce(opts.pedidosPendentes ?? 0); // pendentes

    mockPrismaService.pedido.aggregate.mockResolvedValue({
      _sum: { valor_total: opts.valorTotalMes ?? null },
    });

    mockPrismaService.pedido.groupBy.mockResolvedValue(opts.statusGroups ?? []);

    mockPrismaService.pedido.findMany.mockResolvedValue(opts.pedidosRecentes ?? []);
  }

  // =========================================================================
  // ESTRUTURA DE RESPOSTA
  // =========================================================================

  it('deve retornar estrutura com resumo, porStatus e pedidosRecentes', async () => {
    setupDashboardMocks();

    const result = await service.getDashboard();

    expect(result).toHaveProperty('resumo');
    expect(result).toHaveProperty('porStatus');
    expect(result).toHaveProperty('pedidosRecentes');
    expect(result.resumo).toHaveProperty('totalPedidos');
    expect(result.resumo).toHaveProperty('pedidosMes');
    expect(result.resumo).toHaveProperty('valorTotalMes');
    expect(result.resumo).toHaveProperty('pedidosPendentes');
  });

  // =========================================================================
  // RESUMO
  // =========================================================================

  it('resumo.totalPedidos deve contar pedidos não-deletados', async () => {
    setupDashboardMocks({ totalPedidos: 42 });

    const result = await service.getDashboard();

    expect(result.resumo.totalPedidos).toBe(42);
    expect(mockPrismaService.pedido.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ deleted_at: null }),
    });
  });

  it('resumo.pedidosMes deve contar apenas pedidos do mês corrente', async () => {
    setupDashboardMocks({ pedidosMes: 7 });

    const result = await service.getDashboard();

    expect(result.resumo.pedidosMes).toBe(7);
    // A segunda chamada de count deve ter filtro data_pedido >= início do mês
    const secondCall = mockPrismaService.pedido.count.mock.calls[1][0];
    expect(secondCall.where).toHaveProperty('data_pedido');
    expect(secondCall.where.data_pedido).toHaveProperty('gte');
  });

  it('resumo.valorTotalMes deve somar valores do mês corrente', async () => {
    setupDashboardMocks({ valorTotalMes: 1234.56 });

    const result = await service.getDashboard();

    expect(result.resumo.valorTotalMes).toBe(1234.56);
  });

  it('resumo.valorTotalMes deve retornar 0 quando não há pedidos no mês', async () => {
    setupDashboardMocks({ valorTotalMes: null });

    const result = await service.getDashboard();

    expect(result.resumo.valorTotalMes).toBe(0);
  });

  it('resumo.pedidosPendentes deve contar RASCUNHO + PENDENTE', async () => {
    setupDashboardMocks({ pedidosPendentes: 3 });

    const result = await service.getDashboard();

    expect(result.resumo.pedidosPendentes).toBe(3);
    // A terceira chamada de count deve filtrar por status IN [RASCUNHO, PENDENTE]
    const thirdCall = mockPrismaService.pedido.count.mock.calls[2][0];
    expect(thirdCall.where.status).toEqual({ in: ['RASCUNHO', 'PENDENTE'] });
  });

  // =========================================================================
  // POR STATUS
  // =========================================================================

  it('porStatus deve agrupar corretamente com percentuais', async () => {
    setupDashboardMocks({
      totalPedidos: 10,
      statusGroups: [
        { status: 'PENDENTE', _count: { _all: 3 } },
        { status: 'CONFIRMADO', _count: { _all: 5 } },
        { status: 'ENTREGUE', _count: { _all: 2 } },
      ],
    });

    const result = await service.getDashboard();

    expect(result.porStatus).toHaveLength(3);
    expect(result.porStatus[0]).toEqual({ status: 'PENDENTE', quantidade: 3, percentual: 30 });
    expect(result.porStatus[1]).toEqual({ status: 'CONFIRMADO', quantidade: 5, percentual: 50 });
    expect(result.porStatus[2]).toEqual({ status: 'ENTREGUE', quantidade: 2, percentual: 20 });
  });

  it('porStatus deve respeitar a ordem lógica do fluxo', async () => {
    setupDashboardMocks({
      totalPedidos: 6,
      statusGroups: [
        { status: 'CANCELADO', _count: { _all: 1 } },
        { status: 'RASCUNHO', _count: { _all: 2 } },
        { status: 'ENTREGUE', _count: { _all: 3 } },
      ],
    });

    const result = await service.getDashboard();

    const statuses = result.porStatus.map((s) => s.status);
    expect(statuses).toEqual(['RASCUNHO', 'ENTREGUE', 'CANCELADO']);
  });

  // =========================================================================
  // PEDIDOS RECENTES
  // =========================================================================

  it('pedidosRecentes deve retornar máximo 5 pedidos ordenados por data DESC', async () => {
    const pedidos = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      data_pedido: new Date(`2026-02-${20 - i}T10:00:00Z`),
      status: 'CONFIRMADO',
      valor_total: 100 + i * 10,
      _count: { itensPedido: 3 },
    }));

    setupDashboardMocks({ pedidosRecentes: pedidos });

    const result = await service.getDashboard();

    expect(result.pedidosRecentes).toHaveLength(5);
    expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        orderBy: { data_pedido: 'desc' },
      }),
    );
  });

  it('pedidosRecentes deve incluir quantidadeItens', async () => {
    setupDashboardMocks({
      pedidosRecentes: [
        {
          id: 1,
          data_pedido: new Date('2026-02-20T10:00:00Z'),
          status: 'PENDENTE',
          valor_total: 150,
          _count: { itensPedido: 7 },
        },
      ],
    });

    const result = await service.getDashboard();

    expect(result.pedidosRecentes[0].quantidadeItens).toBe(7);
    expect(result.pedidosRecentes[0].id).toBe(1);
    expect(result.pedidosRecentes[0].valorTotal).toBe(150);
  });

  // =========================================================================
  // TENANT ISOLATION
  // =========================================================================

  it('com clienteId: deve filtrar apenas pedidos do cliente', async () => {
    setupDashboardMocks({ totalPedidos: 5 });

    await service.getDashboard(42);

    // Todas as queries devem ter cliente_id: 42
    for (const call of mockPrismaService.pedido.count.mock.calls) {
      expect(call[0].where).toHaveProperty('cliente_id', 42);
    }
    expect(mockPrismaService.pedido.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cliente_id: 42 }),
      }),
    );
    expect(mockPrismaService.pedido.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cliente_id: 42 }),
      }),
    );
    expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cliente_id: 42 }),
      }),
    );
  });

  it('sem clienteId (admin): deve retornar todos os pedidos', async () => {
    setupDashboardMocks({ totalPedidos: 10 });

    await service.getDashboard();

    // Nenhuma query deve ter cliente_id
    for (const call of mockPrismaService.pedido.count.mock.calls) {
      expect(call[0].where).not.toHaveProperty('cliente_id');
    }
  });

  // =========================================================================
  // CENÁRIO VAZIO
  // =========================================================================

  it('sem pedidos: deve retornar zeros e arrays vazios', async () => {
    setupDashboardMocks();

    const result = await service.getDashboard();

    expect(result.resumo.totalPedidos).toBe(0);
    expect(result.resumo.pedidosMes).toBe(0);
    expect(result.resumo.valorTotalMes).toBe(0);
    expect(result.resumo.pedidosPendentes).toBe(0);
    expect(result.porStatus).toEqual([]);
    expect(result.pedidosRecentes).toEqual([]);
  });
});
