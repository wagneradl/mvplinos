import { Test, TestingModule } from '@nestjs/testing';
import { ProdutosService } from '../produtos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProdutosService', () => {
  let service: ProdutosService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    produto: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
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
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createProdutoDto = {
      nome: 'Produto Teste',
      preco_unitario: 100,
      tipo_medida: 'un',
      status: 'ativo',
    };

    it('should create a new produto', async () => {
      mockPrismaService.produto.create.mockResolvedValueOnce({ id: 1, ...createProdutoDto });

      const result = await service.create(createProdutoDto);

      expect(result).toEqual({ id: 1, ...createProdutoDto });
      expect(mockPrismaService.produto.create).toHaveBeenCalledWith({
        data: createProdutoDto,
      });
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.produto.create.mockRejectedValueOnce(new Error());

      await expect(service.create(createProdutoDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const pageOptions = { page: 1, limit: 10 };
    const produtos = [
      { id: 1, nome: 'Produto A', preco_unitario: 100, tipo_medida: 'un' },
      { id: 2, nome: 'Produto B', preco_unitario: 200, tipo_medida: 'kg' },
    ];

    it('should return paginated results', async () => {
      mockPrismaService.produto.count.mockResolvedValueOnce(2);
      mockPrismaService.produto.findMany.mockResolvedValueOnce(produtos);

      const result = await service.findAll(pageOptions);

      expect(result).toEqual({
        data: produtos,
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

      const result = await service.findAll(pageOptions);

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

    it('should use default pagination if no options provided', async () => {
      mockPrismaService.produto.count.mockResolvedValueOnce(2);
      mockPrismaService.produto.findMany.mockResolvedValueOnce(produtos);

      await service.findAll();

      expect(mockPrismaService.produto.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 10,
        orderBy: { nome: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    const id = 1;
    const produto = {
      id,
      nome: 'Produto Teste',
      descricao: 'Descrição do produto teste',
      preco_unitario: 100,
      tipo_medida: 'un',
      status: 'ativo',
    };

    it('should find a produto by id', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(produto);

      const result = await service.findOne(id);

      expect(result).toEqual(produto);
      expect(mockPrismaService.produto.findFirst).toHaveBeenCalledWith({
        where: { id, deleted_at: null },
      });
    });

    it('should throw NotFoundException if produto not found', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.produto.findFirst.mockRejectedValueOnce(new Error());

      await expect(service.findOne(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const id = 1;
    const updateProdutoDto = {
      nome: 'Produto Atualizado',
      preco_unitario: 150,
      tipo_medida: 'kg',
    };

    it('should update a produto', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce({ id });
      mockPrismaService.produto.update.mockResolvedValueOnce({ id, ...updateProdutoDto });

      const result = await service.update(id, updateProdutoDto);

      expect(result).toEqual({ id, ...updateProdutoDto });
      expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
        where: { id },
        data: updateProdutoDto,
      });
    });

    it('should throw NotFoundException if produto not found', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(id, updateProdutoDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce({ id });
      mockPrismaService.produto.update.mockRejectedValueOnce(new Error());

      await expect(service.update(id, updateProdutoDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const id = 1;

    it('should soft delete a produto', async () => {
      const now = new Date();
      mockPrismaService.produto.findFirst.mockResolvedValueOnce({ id });
      mockPrismaService.produto.update.mockResolvedValueOnce({ id, deleted_at: now });

      const result = await service.remove(id);

      expect(result).toEqual({ id, deleted_at: now });
      expect(mockPrismaService.produto.findFirst).toHaveBeenCalledWith({
        where: { id, deleted_at: null },
      });
      expect(mockPrismaService.produto.update).toHaveBeenCalledWith({
        where: { id },
        data: { deleted_at: expect.any(Date), status: 'inativo' },
      });
    });

    it('should throw NotFoundException if produto not found', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.produto.findFirst.mockResolvedValueOnce({ id });
      mockPrismaService.produto.update.mockRejectedValueOnce(new Error());

      await expect(service.remove(id)).rejects.toThrow(BadRequestException);
    });
  });
});