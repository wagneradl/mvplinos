import { Test, TestingModule } from '@nestjs/testing';
import { ClientesService } from '../clientes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateClienteDto } from '../dto/create-cliente.dto';
import { UpdateClienteDto } from '../dto/update-cliente.dto';
import { Prisma } from '@prisma/client';

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    cliente: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    const createClienteDto: CreateClienteDto = {
      cnpj: '12345678901234',
      razao_social: 'Empresa Teste',
      nome_fantasia: 'Teste',
      email: 'teste@empresa.com',
      telefone: '1234567890',
      status: 'ativo',
    };

    it('should create a new client successfully', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.cliente.create.mockResolvedValueOnce(createClienteDto);

      const result = await service.create(createClienteDto);

      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: {
          cnpj: createClienteDto.cnpj,
          deleted_at: null,
        },
      });
      expect(mockPrismaService.cliente.create).toHaveBeenCalledWith({
        data: createClienteDto,
      });
      expect(result).toEqual(createClienteDto);
    });

    it('should throw ConflictException when CNPJ already exists', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(createClienteDto);

      await expect(service.create(createClienteDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.cliente.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.cliente.create.mockRejectedValueOnce(new Error());

      await expect(service.create(createClienteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when transaction fails', async () => {
      mockPrismaService.$transaction.mockRejectedValueOnce(new Error());

      await expect(service.create(createClienteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when Prisma throws P2002 error', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '1.0.0',
        meta: { target: ['cnpj'] },
      });
      mockPrismaService.cliente.create.mockRejectedValueOnce(prismaError);

      await expect(service.create(createClienteDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when Prisma throws non-P2002 error', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);
      const prismaError = new Error('Other error');
      (prismaError as any).code = 'P2003';
      mockPrismaService.cliente.create.mockRejectedValueOnce(prismaError);

      await expect(service.create(createClienteDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByCnpj', () => {
    const cnpj = '12345678901234';
    const cliente = {
      id: 1,
      cnpj,
      razao_social: 'Empresa Teste',
      nome_fantasia: 'Teste',
      email: 'teste@empresa.com',
      telefone: '1234567890',
      status: 'ativo',
      deleted_at: null,
    };

    it('should find a client by CNPJ', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(cliente);

      const result = await service.findByCnpj(cnpj);

      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: {
          cnpj,
          deleted_at: null,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(cliente);
    });

    it('should throw NotFoundException when client not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.findByCnpj(cnpj)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when database error occurs', async () => {
      mockPrismaService.cliente.findFirst.mockRejectedValueOnce(new Error());

      await expect(service.findByCnpj(cnpj)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const mockClientes = [
      {
        id: 1,
        cnpj: '12345678901234',
        razao_social: 'Empresa A',
        status: 'ativo',
      },
      {
        id: 2,
        cnpj: '56789012345678',
        razao_social: 'Empresa B',
        status: 'ativo',
      },
    ];

    it('should return paginated results', async () => {
      mockPrismaService.cliente.count.mockResolvedValueOnce(2);
      mockPrismaService.cliente.findMany.mockResolvedValueOnce(mockClientes);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockClientes,
        meta: {
          page: 1,
          limit: 10,
          itemCount: 2,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    });

    it('should handle database errors', async () => {
      mockPrismaService.cliente.count.mockRejectedValueOnce(new Error());

      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    const id = 1;
    const cliente = {
      id,
      cnpj: '12345678901234',
      razao_social: 'Empresa Teste',
      status: 'ativo',
      deleted_at: null,
      pedidos: [],
    };

    it('should find a client by id', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(cliente);

      const result = await service.findOne(id);

      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { id, deleted_at: null },
        include: expect.any(Object),
      });
      expect(result).toEqual(cliente);
    });

    it('should throw NotFoundException when client not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      mockPrismaService.cliente.findFirst.mockRejectedValueOnce(new Error());

      await expect(service.findOne(id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const id = 1;
    const updateClienteDto: UpdateClienteDto = {
      razao_social: 'Empresa Atualizada',
      nome_fantasia: 'Atualizada',
      email: 'atualizado@empresa.com',
      telefone: '9876543210',
      status: 'inativo',
    };

    const existingCliente = {
      id,
      cnpj: '12345678901234',
      razao_social: 'Empresa Antiga',
      nome_fantasia: 'Antiga',
      email: 'antigo@empresa.com',
      telefone: '1234567890',
      status: 'ativo',
    };

    it('should update a client successfully', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(existingCliente);
      mockPrismaService.cliente.update.mockResolvedValueOnce({
        ...existingCliente,
        ...updateClienteDto,
      });

      const result = await service.update(id, updateClienteDto);

      expect(mockPrismaService.cliente.findFirst).toHaveBeenCalledWith({
        where: { id, deleted_at: null },
      });
      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id },
        data: updateClienteDto,
      });
      expect(result).toEqual({
        ...existingCliente,
        ...updateClienteDto,
      });
    });

    it('should throw NotFoundException when client not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.update(id, updateClienteDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.cliente.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on database error', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(existingCliente);
      mockPrismaService.cliente.update.mockRejectedValueOnce(new Error());

      await expect(service.update(id, updateClienteDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when Prisma throws P2002 error on update', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(existingCliente);
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '1.0.0',
        meta: { target: ['cnpj'] },
      });
      mockPrismaService.cliente.update.mockRejectedValueOnce(prismaError);

      await expect(service.update(id, updateClienteDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when Prisma throws non-P2002 error on update', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(existingCliente);
      const prismaError = new Error('Other error');
      (prismaError as any).code = 'P2003';
      mockPrismaService.cliente.update.mockRejectedValueOnce(prismaError);

      await expect(service.update(id, updateClienteDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    const id = 1;
    const cliente = {
      id,
      cnpj: '12345678901234',
      razao_social: 'Empresa Teste',
      status: 'ativo',
    };

    it('should soft delete a client', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(cliente);
      mockPrismaService.cliente.update.mockResolvedValueOnce({
        ...cliente,
        deleted_at: expect.any(Date),
        status: 'inativo',
      });

      const result = await service.remove(id);

      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          deleted_at: expect.any(Date),
          status: 'inativo',
        },
      });
      expect(result.status).toBe('inativo');
      expect(result.deleted_at).toBeDefined();
    });

    it('should throw NotFoundException when client not found', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.cliente.update).not.toHaveBeenCalled();
    });
  });
});