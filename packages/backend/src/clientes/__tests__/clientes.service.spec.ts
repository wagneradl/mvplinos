import { Test, TestingModule } from '@nestjs/testing';
import { ClientesService } from '../clientes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: PrismaService;

  const mockCliente = {
    id: 1,
    cnpj: '12.345.678/0001-90',
    razao_social: 'Empresa Teste LTDA',
    nome_fantasia: 'Empresa Teste',
    telefone: '(11) 98765-4321',
    email: 'contato@empresa.com',
    status: 'ativo',
    deleted_at: null,
    pedidos: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        {
          provide: PrismaService,
          useValue: {
            cliente: {
              create: jest.fn().mockResolvedValue(mockCliente),
              findMany: jest.fn().mockResolvedValue([mockCliente]),
              findFirst: jest.fn().mockResolvedValue(mockCliente),
              update: jest.fn().mockResolvedValue(mockCliente),
              count: jest.fn().mockResolvedValue(1),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a cliente', async () => {
      const createDto = {
        cnpj: '12.345.678/0001-90',
        razao_social: 'Empresa Teste LTDA',
        nome_fantasia: 'Empresa Teste',
        telefone: '(11) 98765-4321',
        email: 'contato@empresa.com',
        status: 'ativo',
      };

      const result = await service.create(createDto);
      expect(result).toEqual(mockCliente);
      expect(prisma.cliente.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw ConflictException when CNPJ already exists', async () => {
      const createDto = {
        cnpj: '12.345.678/0001-90',
        razao_social: 'Empresa Teste LTDA',
        nome_fantasia: 'Empresa Teste',
        telefone: '(11) 98765-4321',
        email: 'contato@empresa.com',
        status: 'ativo',
      };

      jest.spyOn(prisma.cliente, 'create').mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2002',
          clientVersion: '2.0.0',
        }),
      );

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated clientes', async () => {
      const pageOptions = { page: 1, limit: 10 };
      const result = await service.findAll(pageOptions);
      
      expect(result).toEqual({
        data: [mockCliente],
        meta: {
          page: 1,
          limit: 10,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });

      expect(prisma.cliente.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 10,
        orderBy: { razao_social: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a cliente', async () => {
      const result = await service.findOne(1);
      expect(result).toEqual(mockCliente);
      expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deleted_at: null },
        include: { 
          pedidos: {
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

    it('should throw NotFoundException when cliente not found', async () => {
      jest.spyOn(prisma.cliente, 'findFirst').mockResolvedValueOnce(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCnpj', () => {
    it('should return a cliente by CNPJ', async () => {
      const result = await service.findByCnpj('12.345.678/0001-90');
      expect(result).toEqual(mockCliente);
      expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
        where: { cnpj: '12.345.678/0001-90', deleted_at: null },
        include: { 
          pedidos: {
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

    it('should throw NotFoundException when CNPJ not found', async () => {
      jest.spyOn(prisma.cliente, 'findFirst').mockResolvedValueOnce(null);
      await expect(service.findByCnpj('99.999.999/9999-99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a cliente', async () => {
      const updateDto = { nome_fantasia: 'Empresa Atualizada' };
      const result = await service.update(1, updateDto);
      expect(result).toEqual(mockCliente);
      expect(prisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when cliente not found', async () => {
      jest.spyOn(prisma.cliente, 'update').mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2025',
          clientVersion: '2.0.0',
        }),
      );
      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing CNPJ', async () => {
      const updateDto = { cnpj: '99.999.999/9999-99' };
      jest.spyOn(prisma.cliente, 'update').mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2002',
          clientVersion: '2.0.0',
        }),
      );
      await expect(service.update(1, updateDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a cliente', async () => {
      await service.remove(1);
      expect(prisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deleted_at: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when cliente not found', async () => {
      jest.spyOn(prisma.cliente, 'findFirst').mockResolvedValueOnce(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});