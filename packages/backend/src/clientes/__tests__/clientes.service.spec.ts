import { Test, TestingModule } from '@nestjs/testing';
import { ClientesService } from '../clientes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    cliente: {
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
        ClientesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createClienteDto = {
      razao_social: 'Empresa Teste',
      nome_fantasia: 'Teste',
      cnpj: '12345678901234',
      email: 'teste@empresa.com',
      telefone: '11999999999',
      endereco: 'Rua Teste, 123',
      status: 'ativo',
    };

    it('should create a new cliente', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.cliente.create.mockResolvedValueOnce({ id: 1, ...createClienteDto });

      const result = await service.create(createClienteDto);

      expect(result).toEqual({ id: 1, ...createClienteDto });
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { cnpj: createClienteDto.cnpj, deleted_at: null },
      });
      expect(mockPrismaService.cliente.create).toHaveBeenCalledWith({
        data: createClienteDto,
      });
    });

    it('should throw ConflictException if CNPJ already exists', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({ id: 1, ...createClienteDto });

      await expect(service.create(createClienteDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.cliente.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '2.0.0',
        })
      );

      await expect(service.create(createClienteDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findByCnpj', () => {
    const cnpj = '12345678901234';
    const cliente = {
      id: 1,
      razao_social: 'Empresa Teste',
      cnpj,
      email: 'teste@empresa.com',
      telefone: '11999999999',
      endereco: 'Rua Teste, 123',
      status: 'ativo',
      pedidos: [],
    };

    it('should find a cliente by CNPJ', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(cliente);

      const result = await service.findByCnpj(cnpj);

      expect(result).toEqual(cliente);
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { cnpj, deleted_at: null },
        include: {
          pedidos: {
            where: { deleted_at: null },
            select: {
              id: true,
              data_pedido: true,
              status: true,
              valor_total: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if cliente not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.findByCnpj(cnpj)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const id = 1;
    const updateClienteDto = {
      razao_social: 'Empresa Atualizada',
      email: 'atualizado@empresa.com',
    };

    it('should update a cliente', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({ id });
      mockPrismaService.cliente.update.mockResolvedValueOnce({ id, ...updateClienteDto });

      const result = await service.update(id, updateClienteDto);

      expect(result).toEqual({ id, ...updateClienteDto });
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { id, deleted_at: null },
      });
      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id },
        data: updateClienteDto,
      });
    });

    it('should throw NotFoundException if cliente not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(id, updateClienteDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({ id });
      mockPrismaService.cliente.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '2.0.0',
        })
      );

      await expect(service.update(id, updateClienteDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    const id = 1;

    it('should soft delete a cliente', async () => {
      const now = new Date();
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({ id });
      mockPrismaService.cliente.update.mockResolvedValueOnce({ id, deleted_at: now });

      const result = await service.remove(id);

      expect(result).toEqual({ id, deleted_at: now });
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { id, deleted_at: null },
      });
      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id },
        data: { deleted_at: expect.any(Date), status: 'inativo' },
      });
    });

    it('should throw NotFoundException if cliente not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const pageOptions = { page: 1, limit: 10 };
    const clientes = [
      { id: 1, razao_social: 'Empresa A' },
      { id: 2, razao_social: 'Empresa B' },
    ];

    it('should return paginated results', async () => {
      mockPrismaService.cliente.count.mockResolvedValueOnce(2);
      mockPrismaService.cliente.findMany.mockResolvedValueOnce(clientes);

      const result = await service.findAll(pageOptions);

      expect(result).toEqual({
        data: clientes,
        meta: {
          page: 1,
          limit: 10,
          itemCount: 2,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });

      expect(mockPrismaService.cliente.count).toHaveBeenCalledWith({
        where: { deleted_at: null },
      });
      expect(mockPrismaService.cliente.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 10,
        orderBy: { razao_social: 'asc' },
      });
    });

    it('should handle empty results', async () => {
      mockPrismaService.cliente.count.mockResolvedValueOnce(0);
      mockPrismaService.cliente.findMany.mockResolvedValueOnce([]);

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
      mockPrismaService.cliente.count.mockResolvedValueOnce(2);
      mockPrismaService.cliente.findMany.mockResolvedValueOnce(clientes);

      await service.findAll();

      expect(mockPrismaService.cliente.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 10,
        orderBy: { razao_social: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    const id = 1;
    const cliente = {
      id,
      razao_social: 'Empresa Teste',
      pedidos: [],
    };

    it('should find a cliente by id', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(cliente);

      const result = await service.findOne(id);

      expect(result).toEqual(cliente);
      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { id, deleted_at: null },
        include: {
          pedidos: {
            where: { deleted_at: null },
            select: {
              id: true,
              data_pedido: true,
              status: true,
              valor_total: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if cliente not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });
});