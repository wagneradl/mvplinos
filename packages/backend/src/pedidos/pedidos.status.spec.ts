import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PedidosService } from './pedidos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { StructuredLoggerService } from '../common/logger/structured-logger.service';
import { PedidoStatus } from './dto/update-pedido.dto';

/**
 * Testes de Transição de Status por Papel
 * Valida que CLIENTE e INTERNO têm permissões diferentes para transições de status,
 * cobrindo cenários não presentes em pedidos.service.spec.ts.
 */
describe('Pedidos — Transição de Status por Papel', () => {
  let service: PedidosService;

  const tenantInterno = { userId: 1, clienteId: null };
  const tenantCliente = { userId: 10, clienteId: 5 };

  const basePedido = {
    id: 1,
    cliente_id: 5,
    valor_total: 100,
    data_pedido: new Date(),
    deleted_at: null,
    pdf_path: '',
    observacoes: null,
    itensPedido: [],
    cliente: { id: 5, nome_fantasia: 'Cliente Teste' },
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
        StructuredLoggerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
  });

  // Helper to set up pedido with given status
  function setupPedido(status: PedidoStatus) {
    mockPrismaService.pedido.findFirst.mockResolvedValue({
      ...basePedido,
      status,
    });
  }

  function setupPedidoAndUpdate(statusAtual: PedidoStatus, novoStatus: PedidoStatus) {
    setupPedido(statusAtual);
    mockPrismaService.pedido.update.mockResolvedValue({
      ...basePedido,
      status: novoStatus,
    });
  }

  // =========================================================================
  // CLIENTE — Transições Permitidas
  // =========================================================================

  describe('CLIENTE — transições permitidas', () => {
    it('CLIENTE pode fazer PENDENTE → CANCELADO', async () => {
      setupPedidoAndUpdate(PedidoStatus.PENDENTE, PedidoStatus.CANCELADO);

      const result = await service.atualizarStatus(1, PedidoStatus.CANCELADO, tenantCliente);

      expect(result.status).toBe(PedidoStatus.CANCELADO);
    });
  });

  // =========================================================================
  // CLIENTE — Transições Bloqueadas
  // =========================================================================

  describe('CLIENTE — transições bloqueadas', () => {
    it('CLIENTE NÃO pode fazer CONFIRMADO → EM_PRODUCAO', async () => {
      setupPedido(PedidoStatus.CONFIRMADO);

      await expect(
        service.atualizarStatus(1, PedidoStatus.EM_PRODUCAO, tenantCliente),
      ).rejects.toThrow(ForbiddenException);
      setupPedido(PedidoStatus.CONFIRMADO);
      await expect(
        service.atualizarStatus(1, PedidoStatus.EM_PRODUCAO, tenantCliente),
      ).rejects.toThrow('Papel CLIENTE não pode fazer transição CONFIRMADO → EM_PRODUCAO');
    });

    it('CLIENTE NÃO pode fazer EM_PRODUCAO → PRONTO', async () => {
      setupPedido(PedidoStatus.EM_PRODUCAO);

      await expect(
        service.atualizarStatus(1, PedidoStatus.PRONTO, tenantCliente),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CLIENTE NÃO pode fazer PRONTO → ENTREGUE', async () => {
      setupPedido(PedidoStatus.PRONTO);

      await expect(
        service.atualizarStatus(1, PedidoStatus.ENTREGUE, tenantCliente),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // INTERNO — Cancelamento de qualquer status não-final
  // =========================================================================

  describe('INTERNO — pode cancelar de qualquer status não-final', () => {
    it('INTERNO pode cancelar pedido PENDENTE', async () => {
      setupPedidoAndUpdate(PedidoStatus.PENDENTE, PedidoStatus.CANCELADO);

      const result = await service.atualizarStatus(1, PedidoStatus.CANCELADO, tenantInterno);

      expect(result.status).toBe(PedidoStatus.CANCELADO);
    });

    it('INTERNO pode cancelar pedido CONFIRMADO', async () => {
      setupPedidoAndUpdate(PedidoStatus.CONFIRMADO, PedidoStatus.CANCELADO);

      const result = await service.atualizarStatus(1, PedidoStatus.CANCELADO, tenantInterno);

      expect(result.status).toBe(PedidoStatus.CANCELADO);
    });

    it('INTERNO pode cancelar pedido EM_PRODUCAO', async () => {
      setupPedidoAndUpdate(PedidoStatus.EM_PRODUCAO, PedidoStatus.CANCELADO);

      const result = await service.atualizarStatus(1, PedidoStatus.CANCELADO, tenantInterno);

      expect(result.status).toBe(PedidoStatus.CANCELADO);
    });
  });

  // =========================================================================
  // ESTADOS FINAIS — Ninguém pode transicionar
  // =========================================================================

  describe('Estados finais — bloqueio para todos', () => {
    it('Ninguém pode transicionar de ENTREGUE para qualquer status', async () => {
      setupPedido(PedidoStatus.ENTREGUE);

      await expect(
        service.atualizarStatus(1, PedidoStatus.CANCELADO, tenantInterno),
      ).rejects.toThrow(BadRequestException);
    });

    it('Ninguém pode transicionar de CANCELADO para qualquer status', async () => {
      setupPedido(PedidoStatus.CANCELADO);

      await expect(
        service.atualizarStatus(1, PedidoStatus.PENDENTE, tenantInterno),
      ).rejects.toThrow(BadRequestException);
    });

    it('Transição inválida retorna mensagem descritiva', async () => {
      setupPedido(PedidoStatus.RASCUNHO);

      await expect(
        service.atualizarStatus(1, PedidoStatus.PRONTO, tenantInterno),
      ).rejects.toThrow('Transição inválida: RASCUNHO → PRONTO');
    });
  });
});
