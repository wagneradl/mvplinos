import { Test, TestingModule } from '@nestjs/testing';
import { ProdutosService } from '../produtos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrismaService, createTestProduto } from '../../test/prisma.mock.helper';

describe('ProdutosService', () => {
  let service: ProdutosService;
  let mockPrismaService;
  const mockProduto = createTestProduto();

  beforeEach(async () => {
    mockPrismaService = createMockPrismaService();
    
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a produto', async () => {
      const createDto = {
        nome: mockProduto.nome,
        preco_unitario: mockProduto.preco_unitario,
        tipo_medida: mockProduto.tipo_medida,
        status: mockProduto.status,
      };

      mockPrismaService.$transaction.mockImplementationOnce((callback) => callback(mockPrismaService));
      mockPrismaService.produto.create.mockResolvedValueOnce({
        ...createDto,
        id: 1,
        deleted_at: null,
        created_at: mockProduto.created_at,
        updated_at: mockProduto.updated_at,
      });

      const result = await service.create(createDto);
      expect(result).toEqual({
        ...createDto,
        id: 1,
        deleted_at: null,
        created_at: mockProduto.created_at,
        updated_at: mockProduto.updated_at,
      });
      expect(mockPrismaService.produto.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw BadRequestException when create fails', async () => {
      const createDto = {
        nome: 'Test',
        preco_unitario: 10,
        tipo_medida: 'un',
        status: 'ativo',
      };

      mockPrismaService.$transaction.mockImplementationOnce((callback) => {
        throw new Error('Create failed');
      });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated produtos', async () => {
      const mockProdutos = [mockProduto];
      const pageOptions = { page: 1, limit: 10 };
      
      mockPrismaService.produto.findMany.mockResolvedValueOnce(mockProdutos);
      mockPrismaService.produto.count.mockResolvedValueOnce(1);

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

    it('should throw BadRequestException when findAll fails', async () => {
      mockPrismaService.produto.findMany.mockRejectedValueOnce(new Error('Find failed'));

      await expect(service.findAll()).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a produto', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);

      const result = await service.findOne(1);
      expect(result).toEqual(mockProduto);
      expect(mockPrismaService.produto.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
      });
    });

    it('should throw NotFoundException when produto not found', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a produto', async () => {
      const updateDto = { nome: 'Updated Produto' };

      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);
      mockPrismaService.produto.update.mockResolvedValueOnce({
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
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(999, { nome: 'test' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when update fails', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);
      mockPrismaService.produto.update.mockRejectedValueOnce(new Error('Update failed'));

      await expect(service.update(1, { nome: 'test' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [
        { ...mockProduto, id: 1 },
        { ...mockProduto, id: 2 },
      ];
      
      mockPrismaService.produto.count.mockResolvedValueOnce(2);
      mockPrismaService.produto.findMany.mockResolvedValueOnce(mockProducts);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockProducts,
        meta: {
          page: 1,
          limit: 10,
          itemCount: 2,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });

      expect(mockPrismaService.produto.count).toHaveBeenCalledWith({
        where: { deleted_at: null },
      });
      expect(mockPrismaService.produto.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 10,
        orderBy: { nome: 'asc' },
      });
    });

    it('should handle empty results', async () => {
      mockPrismaService.produto.count.mockResolvedValueOnce(0);
      mockPrismaService.produto.findMany.mockResolvedValueOnce([]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          itemCount: 0,
          pageCount: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    });

    it('should throw BadRequestException when findAll fails', async () => {
      mockPrismaService.produto.count.mockRejectedValueOnce(new Error('Find failed'));

      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        new BadRequestException('Erro ao buscar produtos')
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a produto', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);
      mockPrismaService.produto.update.mockResolvedValueOnce({
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
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when remove fails', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(mockProduto);
      mockPrismaService.produto.update.mockRejectedValueOnce(new Error('Remove failed'));

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});