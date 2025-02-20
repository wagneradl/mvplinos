import { Test, TestingModule } from '@nestjs/testing';
import { PedidosService } from '../pedidos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../../pdf/pdf.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PedidoStatus } from '../dto/update-pedido.dto';
import { Prisma } from '@prisma/client';

describe('PedidosService', () => {
  let service: PedidosService;
  let mockPrismaService;
  let mockPdfService;

  const mockCliente = {
    id: 1,
    razao_social: 'Cliente Teste LTDA',
    nome_fantasia: 'Cliente Teste',
    cnpj: '12345678901234',
    email: 'cliente@teste.com',
    telefone: '1234567890',
    status: 'ATIVO',
    deleted_at: null,
  };

  const mockProduto = {
    id: 1,
    nome: 'Produto Teste',
    preco_unitario: 10.0,
    tipo_medida: 'un',
    status: 'ATIVO',
    deleted_at: null,
  };

  const mockPedido = {
    id: 1,
    cliente_id: 1,
    data_pedido: new Date('2025-01-01T10:00:00Z'),
    status: PedidoStatus.PENDENTE,
    valor_total: 20.0,
    caminho_pdf: '/path/to/pdf',
    deleted_at: null,
    cliente: mockCliente,
    itensPedido: [
      {
        id: 1,
        pedido_id: 1,
        produto_id: 1,
        quantidade: 2,
        preco_unitario: 10.0,
        valor_total_item: 20.0,
        produto: mockProduto,
      },
    ],
  };

  beforeEach(async () => {
    mockPrismaService = {
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
      cliente: {
        findFirst: jest.fn(),
      },
      produto: {
        findFirst: jest.fn(),
      },
      pedido: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    mockPdfService = {
      generatePedidoPdf: jest.fn().mockResolvedValue('/path/to/pdf'),
    };

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createPedidoDto = {
      cliente_id: 1,
      itens: [
        {
          produto_id: 1,
          quantidade: 2,
        },
      ],
    };

    it('should create a pedido successfully', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(mockCliente);
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);
      mockPrismaService.pedido.create.mockResolvedValueOnce(mockPedido);
      mockPrismaService.pedido.update.mockResolvedValueOnce(mockPedido);

      const result = await service.create(createPedidoDto);

      expect(result).toEqual(mockPedido);
      expect(mockPdfService.generatePedidoPdf).toHaveBeenCalledWith(mockPedido);
      expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
        data: {
          cliente_id: createPedidoDto.cliente_id,
          data_pedido: expect.any(Date),
          status: PedidoStatus.PENDENTE,
          valor_total: 20.0,
          caminho_pdf: '',
          itensPedido: {
            create: [{
              produto_id: 1,
              quantidade: 2,
              preco_unitario: 10.0,
              valor_total_item: 20.0,
            }],
          },
        },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });
      expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
        where: { id: mockPedido.id },
        data: { caminho_pdf: '/path/to/pdf' },
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

    it('should throw NotFoundException when cliente not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.create(createPedidoDto)).rejects.toThrow(
        new NotFoundException(`Cliente com ID ${createPedidoDto.cliente_id} não encontrado`),
      );
    });

    it('should throw NotFoundException when produto not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(mockCliente);
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(null);

      await expect(service.create(createPedidoDto)).rejects.toThrow(
        new NotFoundException(`Produto com ID ${createPedidoDto.itens[0].produto_id} não encontrado`),
      );
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.cliente.findFirst.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Error', {
          code: 'P2002',
          clientVersion: '2.0.0',
        }),
      );

      await expect(service.create(createPedidoDto)).rejects.toThrow(
        new BadRequestException('Erro ao criar pedido'),
      );
    });

    it('should throw error when PDF generation fails', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(mockCliente);
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);
      mockPrismaService.pedido.create.mockResolvedValueOnce(mockPedido);
      mockPdfService.generatePedidoPdf.mockRejectedValueOnce(new Error('PDF generation failed'));

      await expect(service.create(createPedidoDto)).rejects.toThrow('PDF generation failed');
    });
  });

  describe('findAll', () => {
    const mockFilter = {
      page: 1,
      limit: 10,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      clienteId: 1,
    };

    it('should return paginated pedidos with all filters', async () => {
      const mockPedidos = [mockPedido];
      const mockCount = 1;

      mockPrismaService.pedido.findMany.mockResolvedValueOnce(mockPedidos);
      mockPrismaService.pedido.count.mockResolvedValueOnce(mockCount);

      const result = await service.findAll(mockFilter);

      const dataInicial = new Date('2025-01-01');
      dataInicial.setHours(0, 0, 0, 0);
      
      const dataFinal = new Date('2025-12-31');
      dataFinal.setHours(23, 59, 59, 999);

      expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          deleted_at: null,
          data_pedido: {
            gte: dataInicial,
            lte: dataFinal,
          },
          cliente_id: 1,
        },
        orderBy: {
          data_pedido: 'desc',
        },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });

      expect(result).toEqual({
        data: mockPedidos,
        meta: {
          total: mockCount,
          page: mockFilter.page,
          limit: mockFilter.limit,
          totalPages: Math.ceil(mockCount / mockFilter.limit),
        },
      });
    });

    it('should return pedidos without date filters', async () => {
      const filterWithoutDates = {
        page: 1,
        limit: 10,
        clienteId: 1,
      };

      mockPrismaService.pedido.findMany.mockResolvedValueOnce([mockPedido]);
      mockPrismaService.pedido.count.mockResolvedValueOnce(1);

      await service.findAll(filterWithoutDates);

      expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          deleted_at: null,
          cliente_id: 1,
        },
        orderBy: {
          data_pedido: 'desc',
        },
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

    it('should return pedidos without client filter', async () => {
      const filterWithoutClient = {
        page: 1,
        limit: 10,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      mockPrismaService.pedido.findMany.mockResolvedValueOnce([mockPedido]);
      mockPrismaService.pedido.count.mockResolvedValueOnce(1);

      await service.findAll(filterWithoutClient);

      const dataInicial = new Date('2025-01-01');
      dataInicial.setHours(0, 0, 0, 0);
      
      const dataFinal = new Date('2025-12-31');
      dataFinal.setHours(23, 59, 59, 999);

      expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          deleted_at: null,
          data_pedido: {
            gte: dataInicial,
            lte: dataFinal,
          },
        },
        orderBy: {
          data_pedido: 'desc',
        },
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

    it('should handle database error', async () => {
      mockPrismaService.pedido.findMany.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.findAll(mockFilter)).rejects.toThrow(
        new BadRequestException('Erro ao buscar pedidos'),
      );
    });
  });

  describe('findOne', () => {
    it('should return a pedido', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedido);

      const result = await service.findOne(1);

      expect(result).toEqual(mockPedido);
      expect(mockPrismaService.pedido.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
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

    it('should throw NotFoundException when pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(1)).rejects.toThrow(
        new NotFoundException('Pedido com ID 1 não encontrado'),
      );
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.pedido.findFirst.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Error', {
          code: 'P2002',
          clientVersion: '2.0.0',
        }),
      );

      await expect(service.findOne(1)).rejects.toThrow(
        new BadRequestException('Erro ao buscar pedido'),
      );
    });
  });

  describe('update', () => {
    const updatePedidoDto = {
      status: PedidoStatus.ATUALIZADO,
    };

    it('should update a pedido successfully', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedido);
      mockPrismaService.pedido.update.mockResolvedValueOnce({
        ...mockPedido,
        status: PedidoStatus.ATUALIZADO,
      });

      const result = await service.update(1, updatePedidoDto);

      expect(result.status).toBe(PedidoStatus.ATUALIZADO);
      expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updatePedidoDto,
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

    it('should throw BadRequestException when updating a canceled pedido', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce({
        ...mockPedido,
        status: PedidoStatus.CANCELADO,
      });

      await expect(service.update(1, updatePedidoDto)).rejects.toThrow(
        new BadRequestException('Não é possível atualizar um pedido cancelado'),
      );
    });

    it('should throw NotFoundException when pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(1, updatePedidoDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedido);
      mockPrismaService.pedido.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Error', {
          code: 'P2002',
          clientVersion: '2.0.0',
        }),
      );

      await expect(service.update(1, updatePedidoDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a pedido successfully', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedido);
      mockPrismaService.pedido.update.mockResolvedValueOnce({
        ...mockPedido,
        deleted_at: new Date(),
        status: PedidoStatus.CANCELADO,
      });

      const result = await service.remove(1);

      expect(result.deleted_at).toBeDefined();
      expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          deleted_at: expect.any(Date),
          status: PedidoStatus.CANCELADO,
        },
      });
    });

    it('should throw NotFoundException when pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedido);
      mockPrismaService.pedido.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Error', {
          code: 'P2002',
          clientVersion: '2.0.0',
        }),
      );

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('repeatOrder', () => {
    it('should repeat a pedido successfully', async () => {
      // Mock findOne
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedido);
      
      // Mock cliente check
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(mockCliente);
      
      // Mock produto check
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);
      
      // Mock create
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(mockCliente);
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);
      mockPrismaService.pedido.create.mockResolvedValueOnce(mockPedido);
      mockPrismaService.pedido.update.mockResolvedValueOnce(mockPedido);

      const result = await service.repeatOrder(1);

      expect(result).toEqual(mockPedido);
      expect(mockPrismaService.pedido.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { id: mockPedido.cliente_id, deleted_at: null },
      });
      expect(mockPrismaService.produto.findFirst).toHaveBeenCalledWith({
        where: { id: mockPedido.itensPedido[0].produto_id, deleted_at: null },
      });
    });

    it('should throw NotFoundException when pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(null);

      await expect(service.repeatOrder(1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when cliente not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedido);
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.repeatOrder(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when produto not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValueOnce(mockPedido);
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(mockCliente);
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(null);

      await expect(service.repeatOrder(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.pedido.findFirst.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Error', {
          code: 'P2002',
          clientVersion: '2.0.0',
        }),
      );

      await expect(service.repeatOrder(1)).rejects.toThrow(BadRequestException);
    });
  });
});
