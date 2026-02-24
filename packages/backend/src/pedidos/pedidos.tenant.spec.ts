import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { PedidoStatus } from './dto/update-pedido.dto';

/**
 * Testes de Tenant Isolation Cross-Client
 * Valida que dois clientes (A e B) não conseguem acessar dados um do outro,
 * enquanto o Admin (INTERNO) vê tudo.
 */
describe('Pedidos — Tenant Isolation Cross-Client', () => {
  let service: PedidosService;

  // Tenants
  const tenantAdmin = { userId: 1, clienteId: null };
  const tenantClienteA = { userId: 10, clienteId: 5 };
  const tenantClienteB = { userId: 20, clienteId: 9 };

  // Pedidos
  const pedidoClienteA = {
    id: 100,
    cliente_id: 5,
    status: PedidoStatus.PENDENTE,
    valor_total: 50,
    data_pedido: new Date(),
    deleted_at: null,
    itensPedido: [],
    cliente: { id: 5, nome_fantasia: 'Cliente A' },
  };

  const pedidoClienteB = {
    id: 200,
    cliente_id: 9,
    status: PedidoStatus.PENDENTE,
    valor_total: 80,
    data_pedido: new Date(),
    deleted_at: null,
    itensPedido: [],
    cliente: { id: 9, nome_fantasia: 'Cliente B' },
  };

  const mockPrismaService = {
    pedido: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    produto: {
      findMany: jest.fn(),
    },
    cliente: {
      findFirst: jest.fn(),
    },
    itemPedido: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
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
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
  });

  // =========================================================================
  // LISTAGEM — Simetria entre dois clientes
  // =========================================================================

  describe('findAll — simetria entre clientes', () => {
    it('Cliente A deve ver apenas seus pedidos', async () => {
      mockPrismaService.pedido.findMany.mockResolvedValue([pedidoClienteA]);
      mockPrismaService.pedido.count.mockResolvedValue(1);

      const result = await service.findAll({} as any, tenantClienteA);

      // Verifica que o filtro usa cliente_id=5
      const callArgs = mockPrismaService.pedido.findMany.mock.calls[0][0];
      expect(callArgs.where.cliente_id).toBe(5);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].cliente_id).toBe(5);
    });

    it('Cliente B deve ver apenas seus pedidos', async () => {
      mockPrismaService.pedido.findMany.mockResolvedValue([pedidoClienteB]);
      mockPrismaService.pedido.count.mockResolvedValue(1);

      const result = await service.findAll({} as any, tenantClienteB);

      // Verifica que o filtro usa cliente_id=9
      const callArgs = mockPrismaService.pedido.findMany.mock.calls[0][0];
      expect(callArgs.where.cliente_id).toBe(9);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].cliente_id).toBe(9);
    });

    it('Admin deve ver pedidos de ambos os clientes', async () => {
      mockPrismaService.pedido.findMany.mockResolvedValue([
        pedidoClienteA,
        pedidoClienteB,
      ]);
      mockPrismaService.pedido.count.mockResolvedValue(2);

      const result = await service.findAll({} as any, tenantAdmin);

      // Verifica que NÃO há filtro de cliente_id
      const callArgs = mockPrismaService.pedido.findMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('cliente_id');
      expect(result.data).toHaveLength(2);
    });
  });

  // =========================================================================
  // ACESSO CRUZADO — findOne
  // =========================================================================

  describe('findOne — acesso cruzado bloqueado', () => {
    it('Cliente A NÃO deve acessar pedido do Cliente B', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoClienteB);

      await expect(
        service.findOne(200, tenantClienteA),
      ).rejects.toThrow('Acesso negado a este pedido');
    });

    it('Cliente B NÃO deve acessar pedido do Cliente A', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoClienteA);

      await expect(
        service.findOne(100, tenantClienteB),
      ).rejects.toThrow('Acesso negado a este pedido');
    });
  });

  // =========================================================================
  // ACESSO CRUZADO — atualizarStatus
  // =========================================================================

  describe('atualizarStatus — acesso cruzado bloqueado', () => {
    it('Cliente A NÃO pode alterar status de pedido do Cliente B', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoClienteB);

      await expect(
        service.atualizarStatus(200, PedidoStatus.CANCELADO, tenantClienteA),
      ).rejects.toThrow('Acesso negado a este pedido');
    });

    it('Cliente B NÃO pode alterar status de pedido do Cliente A', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoClienteA);

      await expect(
        service.atualizarStatus(100, PedidoStatus.CANCELADO, tenantClienteB),
      ).rejects.toThrow('Acesso negado a este pedido');
    });
  });
});
