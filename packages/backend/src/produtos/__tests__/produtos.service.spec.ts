import { Test, TestingModule } from '@nestjs/testing';
import { ProdutosService } from '../produtos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProdutosService', () => {
  let service: ProdutosService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    produto: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProdutosService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProdutosService>(ProdutosService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockProduto = {
    id: 1,
    nome: 'Produto Teste',
    preco_unitario: 10.0,
    tipo_medida: 'un',
    status: 'ativo',
  };

  describe('create', () => {
    it('should create a produto', async () => {
      mockPrismaService.produto.create.mockResolvedValue(mockProduto);

      const createDto = {
        nome: 'Produto Teste',
        preco_unitario: 10.0,
        tipo_medida: 'un',
        status: 'ativo',
      };

      const result = await service.create(createDto);
      expect(result).toEqual(mockProduto);
      expect(mockPrismaService.produto.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated produtos', async () => {
      const mockProdutos = [mockProduto];
      const pageOptions = { page: 1, limit: 10 };
      
      mockPrismaService.produto.findMany.mockResolvedValue(mockProdutos);
      mockPrismaService.produto.count.mockResolvedValue(1);

      const result = await service.findAll(pageOptions);
      
      expect(result).toEqual({
        data: mockProdutos,
        meta: {
          page: 1,
          limit: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });

      expect(mockPrismaService.produto.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 10,
        orderBy: { nome: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a produto', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);

      const result = await service.findOne(1);
      expect(result).toEqual(mockProduto);
      expect(mockPrismaService.produto.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
    });

    it('should throw NotFoundException when produto not found', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.produto.findFirst).toHaveBeenCalledWith({
        where: { id: 999, deleted_at: null },
      });
    });
  });

  describe('update', () => {
    it('should update a produto', async () => {
      const updateDto = {
        nome: 'Produto Atualizado',
      };

      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);
      mockPrismaService.produto.update.mockResolvedValue({
        ...mockProduto,
        ...updateDto,
      });

      const result = await service.update(1, updateDto);
      expect(result).toEqual({
        ...mockProduto,
        ...updateDto,
      });
      expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when produto not found', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);

      await expect(service.update(999, { nome: 'test' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when update fails', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);
      mockPrismaService.produto.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.update(1, { nome: 'test' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a produto', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);
      mockPrismaService.produto.update.mockResolvedValue({
        ...mockProduto,
        deleted_at: new Date(),
      });

      await service.remove(1);
      expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted_at: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when produto not found', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when remove fails', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValue(mockProduto);
      mockPrismaService.produto.update.mockRejectedValue(new Error('Remove failed'));

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});