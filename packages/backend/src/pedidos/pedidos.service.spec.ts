import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { PedidoStatus } from './dto/update-pedido.dto';

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

  // Pedido com status ATIVO (como o service realmente cria)
  const mockPedidoAtivo = {
    ...mockPedido,
    status: PedidoStatus.ATIVO,
    pdf_path: '',
    observacoes: null,
  };

  const mockCliente = {
    id: 1,
    nome_fantasia: 'Cliente Teste',
    razao_social: 'Cliente Teste LTDA',
    cnpj: '12345678901234',
    status: 'ativo',
    deleted_at: null,
  };

  const mockProduto1 = {
    id: 1,
    nome: 'Pão Francês',
    preco_unitario: 0.75,
    tipo_medida: 'un',
    status: 'ativo',
    deleted_at: null,
  };

  const mockProduto2 = {
    id: 2,
    nome: 'Bolo de Chocolate',
    preco_unitario: 25.0,
    tipo_medida: 'un',
    status: 'ativo',
    deleted_at: null,
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

  // =========================================================================
  // CRIAÇÃO (create)
  // =========================================================================

  describe('create', () => {
    const mockCreateDto = {
      cliente_id: 1,
      itens: [
        { produto_id: 1, quantidade: 10 },
        { produto_id: 2, quantidade: 2 },
      ],
    };

    const pedidoCriado = {
      id: 1,
      cliente_id: 1,
      cliente: mockCliente,
      data_pedido: new Date(),
      status: PedidoStatus.ATIVO,
      valor_total: 57.5, // 10 * 0.75 + 2 * 25.0
      pdf_path: '',
      observacoes: null,
      itensPedido: [
        {
          id: 1,
          pedido_id: 1,
          produto_id: 1,
          quantidade: 10,
          preco_unitario: 0.75,
          valor_total_item: 7.5,
          produto: mockProduto1,
        },
        {
          id: 2,
          pedido_id: 1,
          produto_id: 2,
          quantidade: 2,
          preco_unitario: 25.0,
          valor_total_item: 50.0,
          produto: mockProduto2,
        },
      ],
    };

    function setupCreateMocks() {
      // Produtos lookup
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1, mockProduto2]);

      // $transaction executa o callback com o mock prisma
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => {
        return cb(mockPrismaService);
      });

      // cliente.findFirst dentro da transação
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);

      // pedido.create dentro da transação
      mockPrismaService.pedido.create.mockResolvedValue(pedidoCriado);

      // pedido.findFirst para re-fetch após criação (para PDF)
      mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoCriado);

      // PDF gerado com sucesso
      mockPdfService.generatePedidoPdf.mockResolvedValue('/uploads/pdfs/pedido-1.pdf');

      // pedido.update para salvar pdf_path
      mockPrismaService.pedido.update.mockResolvedValue({
        ...pedidoCriado,
        pdf_path: '/uploads/pdfs/pedido-1.pdf',
      });
    }

    it('deve criar pedido com itens e calcular valor_total corretamente', async () => {
      setupCreateMocks();

      const result = await service.create(mockCreateDto);

      expect(result).toBeDefined();
      // Verifica que $transaction foi chamado
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      // Verifica que pedido.create foi chamado com o valor total correto
      expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cliente_id: 1,
          valor_total: 57.5,
          status: PedidoStatus.ATIVO,
          itensPedido: {
            create: expect.arrayContaining([
              expect.objectContaining({
                produto_id: 1,
                quantidade: 10,
                preco_unitario: 0.75,
                valor_total_item: 7.5,
              }),
              expect.objectContaining({
                produto_id: 2,
                quantidade: 2,
                preco_unitario: 25.0,
                valor_total_item: 50.0,
              }),
            ]),
          },
        }),
        include: expect.any(Object),
      });
    });

    it('deve validar que cliente_id referencia cliente ativo existente', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1, mockProduto2]);
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => cb(mockPrismaService));
      // Cliente não encontrado
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(service.create(mockCreateDto)).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar pedido quando cliente está inativo', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1, mockProduto2]);
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => cb(mockPrismaService));
      mockPrismaService.cliente.findFirst.mockResolvedValue({
        ...mockCliente,
        status: 'inativo',
      });

      await expect(service.create(mockCreateDto)).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockCreateDto).catch((e) => {
          // Re-setup mocks for assertion
          mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1, mockProduto2]);
          mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
            cb(mockPrismaService),
          );
          mockPrismaService.cliente.findFirst.mockResolvedValue({
            ...mockCliente,
            status: 'inativo',
          });
          throw e;
        }),
      ).rejects.toThrow('Cliente está inativo');
    });

    it('deve validar que todos os produto_ids são válidos e ativos', async () => {
      // Só retorna 1 produto dos 2 solicitados
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1]);

      await expect(service.create(mockCreateDto)).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar produto inativo', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([
        mockProduto1,
        { ...mockProduto2, status: 'inativo' },
      ]);

      await expect(service.create(mockCreateDto)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar produto soft-deleted', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([
        mockProduto1,
        { ...mockProduto2, deleted_at: new Date() },
      ]);

      await expect(service.create(mockCreateDto)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar pedido sem itens (array vazio)', async () => {
      await expect(
        service.create({ cliente_id: 1, itens: [] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ cliente_id: 1, itens: [] }),
      ).rejects.toThrow('O pedido deve ter pelo menos um item');
    });

    it('deve rejeitar pedido com quantidade zero ou negativa', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1]);

      await expect(
        service.create({
          cliente_id: 1,
          itens: [{ produto_id: 1, quantidade: 0 }],
        }),
      ).rejects.toThrow(BadRequestException);

      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1]);

      await expect(
        service.create({
          cliente_id: 1,
          itens: [{ produto_id: 1, quantidade: -5 }],
        }),
      ).rejects.toThrow('A quantidade deve ser maior que zero');
    });

    it('deve chamar PdfService após criação do pedido', async () => {
      setupCreateMocks();

      await service.create(mockCreateDto);

      expect(mockPdfService.generatePedidoPdf).toHaveBeenCalled();
    });

    it('deve criar pedido mesmo quando geração de PDF falha (PDF não bloqueia)', async () => {
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1, mockProduto2]);
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => cb(mockPrismaService));
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);
      mockPrismaService.pedido.create.mockResolvedValue(pedidoCriado);
      // Re-fetch do pedido para PDF
      mockPrismaService.pedido.findFirst.mockResolvedValue(pedidoCriado);
      // PDF falha
      mockPdfService.generatePedidoPdf.mockRejectedValue(new Error('PDF generation failed'));

      const result = await service.create(mockCreateDto);

      // Pedido é retornado mesmo com falha no PDF
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });
  });

  // =========================================================================
  // BUSCA POR ID (findOne)
  // =========================================================================

  describe('findOne', () => {
    it('deve retornar pedido com itens e cliente populados', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedidoAtivo);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPedidoAtivo);
      expect(result.cliente).toBeDefined();
      expect(result.itensPedido).toBeDefined();
      expect(mockPrismaService.pedido.findFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });
    });

    it('deve lançar NotFoundException para ID inexistente', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    // O service não filtra por deleted_at nem por status no findOne,
    // então não há teste de "soft-deleted" — pedidos cancelados
    // continuam visíveis.
  });

  // =========================================================================
  // ATUALIZAÇÃO DE ITEM (updateItemQuantidade)
  // =========================================================================

  describe('updateItemQuantidade', () => {
    const mockPedidoComItens = {
      id: 1,
      status: PedidoStatus.ATIVO,
      itensPedido: [
        {
          id: 10,
          pedido_id: 1,
          produto_id: 1,
          quantidade: 5,
          preco_unitario: 10.0,
          valor_total_item: 50.0,
        },
        {
          id: 11,
          pedido_id: 1,
          produto_id: 2,
          quantidade: 3,
          preco_unitario: 20.0,
          valor_total_item: 60.0,
        },
      ],
    };

    const mockItemComProduto = {
      id: 10,
      pedido_id: 1,
      produto_id: 1,
      quantidade: 5,
      preco_unitario: 10.0,
      valor_total_item: 50.0,
      produto: mockProduto1,
    };

    it('deve atualizar quantidade e recalcular valor_total_item', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedidoComItens);
      mockPrismaService.itemPedido.findFirst.mockResolvedValue(mockItemComProduto);
      mockPrismaService.itemPedido.update.mockResolvedValue({
        ...mockItemComProduto,
        quantidade: 8,
        valor_total_item: 80.0,
      });
      mockPrismaService.pedido.update.mockResolvedValue({
        ...mockPedidoComItens,
        valor_total: 140.0, // 80 + 60
      });

      const result = await service.updateItemQuantidade(1, 10, 8);

      expect(mockPrismaService.itemPedido.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          quantidade: 8,
          valor_total_item: 80.0, // 8 * 10.0
        },
      });
    });

    it('deve recalcular valor_total do pedido', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedidoComItens);
      mockPrismaService.itemPedido.findFirst.mockResolvedValue(mockItemComProduto);
      mockPrismaService.itemPedido.update.mockResolvedValue({
        ...mockItemComProduto,
        quantidade: 8,
        valor_total_item: 80.0,
      });
      mockPrismaService.pedido.update.mockResolvedValue({});

      await service.updateItemQuantidade(1, 10, 8);

      expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          valor_total: 140.0, // 80 (item atualizado) + 60 (item mantido)
          status: PedidoStatus.ATIVO,
        },
        include: expect.any(Object),
      });
    });

    it('deve rejeitar quantidade zero ou negativa', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedidoComItens);
      mockPrismaService.itemPedido.findFirst.mockResolvedValue(mockItemComProduto);

      await expect(service.updateItemQuantidade(1, 10, 0)).rejects.toThrow(
        BadRequestException,
      );

      // Re-setup mocks
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedidoComItens);
      mockPrismaService.itemPedido.findFirst.mockResolvedValue(mockItemComProduto);

      await expect(service.updateItemQuantidade(1, 10, -3)).rejects.toThrow(
        'A quantidade deve ser maior que zero',
      );
    });

    it('deve lançar NotFoundException para item inexistente', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedidoComItens);
      mockPrismaService.itemPedido.findFirst.mockResolvedValue(null);

      await expect(service.updateItemQuantidade(1, 999, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar NotFoundException para pedido inexistente', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.updateItemQuantidade(999, 10, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve rejeitar atualização de item em pedido cancelado', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue({
        ...mockPedidoComItens,
        status: PedidoStatus.CANCELADO,
      });

      await expect(service.updateItemQuantidade(1, 10, 5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // CANCELAMENTO (remove)
  // =========================================================================

  describe('remove (cancelamento)', () => {
    it('deve marcar pedido como cancelado', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedidoAtivo);
      mockPrismaService.pedido.update.mockResolvedValue({
        ...mockPedidoAtivo,
        status: PedidoStatus.CANCELADO,
      });

      const result = await service.remove(1);

      expect(result.status).toBe(PedidoStatus.CANCELADO);
      expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: PedidoStatus.CANCELADO },
        include: expect.any(Object),
      });
    });

    it('deve lançar NotFoundException para pedido inexistente', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // ATUALIZAÇÃO (update) — cancelamento via status
  // =========================================================================

  describe('update', () => {
    it('deve rejeitar atualização de pedido já cancelado', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue({
        ...mockPedidoAtivo,
        status: PedidoStatus.CANCELADO,
      });

      await expect(
        service.update(1, { status: PedidoStatus.ATIVO }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, { status: PedidoStatus.ATIVO }).catch((e) => {
          mockPrismaService.pedido.findFirst.mockResolvedValue({
            ...mockPedidoAtivo,
            status: PedidoStatus.CANCELADO,
          });
          throw e;
        }),
      ).rejects.toThrow('Não é possível atualizar um pedido cancelado');
    });

    it('deve lançar NotFoundException para pedido inexistente', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(
        service.update(999, { status: PedidoStatus.ATIVO }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve atualizar pedido ativo com sucesso', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedidoAtivo);
      mockPrismaService.pedido.update.mockResolvedValue({
        ...mockPedidoAtivo,
        observacoes: 'Entrega urgente',
      });

      const result = await service.update(1, { observacoes: 'Entrega urgente' });

      expect(result.observacoes).toBe('Entrega urgente');
      expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { observacoes: 'Entrega urgente' },
        include: expect.any(Object),
      });
    });
  });

  // =========================================================================
  // REPETIÇÃO (repeat)
  // =========================================================================

  describe('repeat', () => {
    const mockPedidoParaRepetir = {
      ...mockPedidoAtivo,
      id: 5,
      cliente_id: 1,
      data_pedido: new Date('2025-01-15'),
      itensPedido: [
        {
          id: 10,
          pedido_id: 5,
          produto_id: 1,
          quantidade: 10,
          preco_unitario: 0.75,
          valor_total_item: 7.5,
          produto: mockProduto1,
        },
        {
          id: 11,
          pedido_id: 5,
          produto_id: 2,
          quantidade: 2,
          preco_unitario: 25.0,
          valor_total_item: 50.0,
          produto: mockProduto2,
        },
      ],
    };

    it('deve criar novo pedido com mesmos itens do original', async () => {
      // findOne do pedido original
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedidoParaRepetir);

      // Verifica cliente ativo
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);

      // Verifica produtos ativos
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1, mockProduto2]);

      // $transaction para o create interno
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => cb(mockPrismaService));

      const novoPedido = {
        ...mockPedidoParaRepetir,
        id: 6,
        data_pedido: new Date(),
      };
      mockPrismaService.pedido.create.mockResolvedValue(novoPedido);
      // Re-fetch para PDF
      mockPrismaService.pedido.findFirst.mockResolvedValue(novoPedido);
      mockPdfService.generatePedidoPdf.mockResolvedValue('/uploads/pdfs/pedido-6.pdf');
      mockPrismaService.pedido.update.mockResolvedValue(novoPedido);

      const result = await service.repeat(5);

      expect(result).toBeDefined();
      expect(result.id).toBe(6);
    });

    it('deve referenciar o mesmo cliente do pedido original', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedidoParaRepetir);
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1, mockProduto2]);
      mockPrismaService.$transaction.mockImplementation(async (cb: any) => cb(mockPrismaService));

      const novoPedido = { ...mockPedidoParaRepetir, id: 6 };
      mockPrismaService.pedido.create.mockResolvedValue(novoPedido);
      mockPrismaService.pedido.findFirst.mockResolvedValue(novoPedido);
      mockPdfService.generatePedidoPdf.mockResolvedValue('/uploads/pdfs/pedido-6.pdf');
      mockPrismaService.pedido.update.mockResolvedValue(novoPedido);

      await service.repeat(5);

      expect(mockPrismaService.pedido.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cliente_id: 1,
          }),
        }),
      );
    });

    it('deve lançar NotFoundException se pedido original não existe', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.repeat(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException se cliente do pedido original foi removido', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedidoParaRepetir);
      // Cliente não encontrado (deleted)
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(service.repeat(5)).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar se produtos do pedido original não estão mais disponíveis', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedidoParaRepetir);
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);
      // Só retorna 1 dos 2 produtos (o outro foi deletado)
      mockPrismaService.produto.findMany.mockResolvedValue([mockProduto1]);

      await expect(service.repeat(5)).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // LISTAGEM (findAll) — testes existentes + filtros expandidos
  // =========================================================================

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

    it('deve filtrar por cliente_id', async () => {
      mockPrismaService.pedido.findMany.mockResolvedValue([mockPedidoAtivo]);
      mockPrismaService.pedido.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, clienteId: 1 });

      const callArgs = mockPrismaService.pedido.findMany.mock.calls[0][0];
      expect(callArgs.where.cliente_id).toBe(1);
    });

    it('deve filtrar por status', async () => {
      mockPrismaService.pedido.findMany.mockResolvedValue([]);
      mockPrismaService.pedido.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        status: PedidoStatus.CANCELADO,
      });

      const callArgs = mockPrismaService.pedido.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe(PedidoStatus.CANCELADO);
    });

    it('deve filtrar por range de datas (startDate + endDate)', async () => {
      mockPrismaService.pedido.findMany.mockResolvedValue([]);
      mockPrismaService.pedido.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        startDate: '2025-02-01',
        endDate: '2025-02-03',
      });

      const callArgs = mockPrismaService.pedido.findMany.mock.calls[0][0];
      // O service cria cláusulas OR para cada dia no intervalo
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR).toHaveLength(3); // 01, 02, 03
    });

    it('deve combinar múltiplos filtros', async () => {
      mockPrismaService.pedido.findMany.mockResolvedValue([]);
      mockPrismaService.pedido.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        clienteId: 1,
        status: PedidoStatus.ATIVO,
        startDate: '2025-02-01',
        endDate: '2025-02-01',
      });

      const callArgs = mockPrismaService.pedido.findMany.mock.calls[0][0];
      expect(callArgs.where.cliente_id).toBe(1);
      expect(callArgs.where.status).toBe(PedidoStatus.ATIVO);
      expect(callArgs.where.OR).toBeDefined();
    });
  });

  // =========================================================================
  // RELATÓRIO (generateReport) — testes existentes mantidos
  // =========================================================================

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

    it('deve rejeitar quando datas não são fornecidas', async () => {
      await expect(
        service.generateReport({ data_inicio: '', data_fim: '' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
