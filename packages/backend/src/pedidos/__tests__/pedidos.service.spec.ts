import { Test, TestingModule } from '@nestjs/testing';
import { PedidosService } from '../pedidos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../../pdf/pdf.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PedidoStatus } from '../dto/update-pedido.dto';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import { join } from 'path';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

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

  const mockProdutos = [
    {
      id: 1,
      nome: 'Pão Francês',
      preco_unitario: 0.50,
      tipo_medida: 'unidade',
      status: 'ATIVO',
      deleted_at: null,
    },
    {
      id: 2,
      nome: 'Bolo de Chocolate',
      preco_unitario: 35.00,
      tipo_medida: 'unidade',
      status: 'ATIVO',
      deleted_at: null,
    }
  ];

  const mockPedido = {
    id: 1,
    cliente_id: 1,
    data_pedido: new Date('2025-01-01T10:00:00Z'),
    status: PedidoStatus.PENDENTE,
    valor_total: 60.00,
    pdf_path: '/path/to/pdf',
    deleted_at: null,
    cliente: mockCliente,
    itensPedido: [
      {
        id: 1,
        pedido_id: 1,
        produto_id: 1,
        quantidade: 50,
        preco_unitario: 0.50,
        valor_total_item: 25.00,
        produto: mockProdutos[0],
      },
      {
        id: 2,
        pedido_id: 1,
        produto_id: 2,
        quantidade: 1,
        preco_unitario: 35.00,
        valor_total_item: 35.00,
        produto: mockProdutos[1],
      }
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
        findMany: jest.fn(),
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

  describe('create', () => {
    const createPedidoDto = {
      cliente_id: 1,
      itens: [
        {
          produto_id: 1,
          quantidade: 50,
        },
        {
          produto_id: 2,
          quantidade: 1,
        }
      ],
    };

    beforeEach(() => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);
      mockPrismaService.produto.findMany.mockResolvedValue(mockProdutos);
      mockPrismaService.pedido.create.mockResolvedValue(mockPedido);
      mockPrismaService.pedido.update.mockResolvedValue(mockPedido);
    });

    it('should create a pedido with correct total values', async () => {
      const result = await service.create(createPedidoDto);

      // Verificar se os produtos foram buscados
      expect(mockPrismaService.produto.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1, 2]
          }
        }
      });

      // Verificar se o pedido foi criado com os valores corretos
      expect(mockPrismaService.pedido.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cliente_id: 1,
            valor_total: 60.00,
            status: PedidoStatus.PENDENTE,
            itensPedido: {
              create: [
                {
                  produto_id: 1,
                  quantidade: 50,
                  preco_unitario: 0.50,
                  valor_total_item: 25.00,
                },
                {
                  produto_id: 2,
                  quantidade: 1,
                  preco_unitario: 35.00,
                  valor_total_item: 35.00,
                }
              ]
            }
          })
        })
      );

      expect(result).toEqual(mockPedido);
    });

    it('should throw error if product not found', async () => {
      // Simular que o segundo produto não foi encontrado
      mockPrismaService.produto.findMany.mockResolvedValue([mockProdutos[0]]);

      await expect(service.create(createPedidoDto)).rejects.toThrow('Produto 2 não encontrado');
    });

    it('should throw error if client not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(service.create(createPedidoDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle database error', async () => {
      mockPrismaService.pedido.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Error', { code: 'P2002', clientVersion: '1.0' }));

      await expect(service.create(createPedidoDto)).rejects.toThrow(BadRequestException);
    });

    it('should calculate total values correctly for decimal quantities', async () => {
      const decimalPedidoDto = {
        cliente_id: 1,
        itens: [
          {
            produto_id: 1,
            quantidade: 1.5, // 1.5 kg de pão
          }
        ],
      };

      const decimalMockProduto = {
        ...mockProdutos[0],
        preco_unitario: 10.00, // R$ 10,00 por kg
      };

      mockPrismaService.produto.findMany.mockResolvedValue([decimalMockProduto]);

      const decimalMockPedido = {
        ...mockPedido,
        valor_total: 15.00,
        itensPedido: [
          {
            id: 1,
            pedido_id: 1,
            produto_id: 1,
            quantidade: 1.5,
            preco_unitario: 10.00,
            valor_total_item: 15.00,
            produto: decimalMockProduto,
          }
        ],
      };

      mockPrismaService.pedido.create.mockResolvedValue(decimalMockPedido);
      mockPrismaService.pedido.update.mockResolvedValue(decimalMockPedido);

      const result = await service.create(decimalPedidoDto);

      expect(mockPrismaService.pedido.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valor_total: 15.00,
            itensPedido: {
              create: [
                {
                  produto_id: 1,
                  quantidade: 1.5,
                  preco_unitario: 10.00,
                  valor_total_item: 15.00,
                }
              ]
            }
          })
        })
      );

      expect(result).toEqual(decimalMockPedido);
    });
  });

  describe('findAll', () => {
    const mockFilter = {
      page: 1,
      limit: 10,
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      clienteId: 1,
    };

    beforeEach(() => {
      mockPrismaService.pedido.findMany.mockResolvedValue([mockPedido]);
      mockPrismaService.pedido.count.mockResolvedValue(1);
    });

    it('should return paginated pedidos with filters', async () => {
      const result = await service.findAll(mockFilter);

      expect(mockPrismaService.pedido.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          deleted_at: null,
          data_pedido: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
          cliente_id: 1,
        },
        orderBy: {
          data_pedido: 'desc',
        },
        include: expect.any(Object),
      });

      expect(result).toEqual({
        data: [mockPedido],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should handle database error', async () => {
      mockPrismaService.pedido.findMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Error', { code: 'P2002', clientVersion: '1.0' }));

      await expect(service.findAll(mockFilter)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedido);
    });

    it('should return a pedido by id', async () => {
      const result = await service.findOne(1);

      expect(mockPrismaService.pedido.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
        include: expect.any(Object),
      });

      expect(result).toEqual(mockPedido);
    });

    it('should throw NotFoundException if pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it('should handle database error', async () => {
      mockPrismaService.pedido.findFirst.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Error', { code: 'P2002', clientVersion: '1.0' }));

      await expect(service.findOne(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updatePedidoDto = { 
      status: PedidoStatus.ATUALIZADO,
    };

    beforeEach(() => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedido);
      mockPrismaService.pedido.update.mockResolvedValue({
        ...mockPedido,
        status: PedidoStatus.ATUALIZADO,
      });
    });

    it('should update a pedido successfully', async () => {
      const result = await service.update(1, updatePedidoDto);

      expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updatePedidoDto,
        include: expect.any(Object),
      });

      expect(result.status).toBe(PedidoStatus.ATUALIZADO);
    });

    it('should throw NotFoundException if pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.update(1, updatePedidoDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle database error', async () => {
      mockPrismaService.pedido.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Error', { code: 'P2002', clientVersion: '1.0' }));

      await expect(service.update(1, updatePedidoDto)).rejects.toThrow(BadRequestException);
    });

    it('should generate new PDF if status changes', async () => {
      const result = await service.update(1, updatePedidoDto);

      expect(mockPdfService.generatePedidoPdf).toHaveBeenCalled();
      expect(result.pdf_path).toBe('/path/to/pdf');
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedido);
      mockPrismaService.pedido.update.mockResolvedValue({
        ...mockPedido,
        deleted_at: new Date(),
        status: PedidoStatus.CANCELADO,
      });
    });

    it('should soft delete a pedido', async () => {
      const result = await service.remove(1);

      expect(mockPrismaService.pedido.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          deleted_at: expect.any(Date),
          status: PedidoStatus.CANCELADO,
        },
        include: expect.any(Object),
      });

      expect(result.deleted_at).toBeDefined();
      expect(result.status).toBe(PedidoStatus.CANCELADO);
    });

    it('should throw NotFoundException if pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });

    it('should handle database error', async () => {
      mockPrismaService.pedido.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Error', { code: 'P2002', clientVersion: '1.0' }));

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('repeat', () => {
    beforeEach(() => {
      const novoPedido = {
        id: 2,
        cliente_id: mockPedido.cliente_id,
        valor_total: mockPedido.valor_total,
        status: PedidoStatus.PENDENTE,
        data_pedido: new Date(),
        pdf_path: '/path/to/pdf',
        cliente: mockCliente,
        itensPedido: mockPedido.itensPedido.map((item, index) => ({
          id: index + 1,
          pedido_id: 2,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          valor_total_item: item.valor_total_item,
          produto: mockProdutos.find(p => p.id === item.produto_id),
        })),
      };

      mockPrismaService.pedido.findFirst.mockResolvedValue(mockPedido);
      mockPrismaService.cliente.findFirst.mockResolvedValue(mockCliente);
      mockPrismaService.produto.findMany.mockResolvedValue(mockProdutos);
      mockPrismaService.pedido.create.mockResolvedValue(novoPedido);
      mockPrismaService.pedido.update.mockResolvedValue(novoPedido);
      mockPdfService.generatePedidoPdf.mockResolvedValue('/path/to/pdf');
    });

    it('should repeat a pedido successfully', async () => {
      const result = await service.repeat(1);

      expect(mockPrismaService.pedido.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cliente_id: mockPedido.cliente_id,
          valor_total: mockPedido.valor_total,
          status: PedidoStatus.PENDENTE,
          itensPedido: {
            create: mockPedido.itensPedido.map(item => ({
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              valor_total_item: item.valor_total_item,
            })),
          },
        }),
        include: {
          cliente: true,
          itensPedido: {
            include: {
              produto: true,
            },
          },
        },
      });

      expect(result.id).toBe(2);
    });

    it('should throw NotFoundException if original pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.repeat(1)).rejects.toThrow(NotFoundException);
    });

    it('should handle database error', async () => {
      mockPrismaService.pedido.findFirst.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Error', { code: 'P2002', clientVersion: '1.0' }));

      await expect(service.repeat(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPdfPath', () => {
    beforeEach(() => {
      mockPrismaService.pedido.findFirst.mockResolvedValue({
        id: 1,
        pdf_path: '/path/to/pdf',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return pdf path if it exists', async () => {
      const result = await service.getPdfPath(1);

      expect(mockPrismaService.pedido.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });

      expect(fs.existsSync).toHaveBeenCalledWith(join(process.cwd(), '/path/to/pdf'));
      expect(result).toBe(join(process.cwd(), '/path/to/pdf'));
    });

    it('should throw NotFoundException if pedido not found', async () => {
      mockPrismaService.pedido.findFirst.mockResolvedValue(null);

      await expect(service.getPdfPath(1)).rejects.toThrow(NotFoundException);
    });

    it('should handle database error', async () => {
      mockPrismaService.pedido.findFirst.mockImplementation(() => {
        throw new BadRequestException('Erro ao buscar pedido');
      });

      await expect(service.getPdfPath(1)).rejects.toThrow(BadRequestException);
    });
  });
});
