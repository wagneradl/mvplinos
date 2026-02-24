import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UsuariosService', () => {
  let service: UsuariosService;

  const mockPapel = {
    id: 1,
    nome: 'Administrador',
    codigo: 'ADMIN_SISTEMA',
    tipo: 'INTERNO',
    nivel: 100,
    permissoes: JSON.stringify({ clientes: ['listar', 'ver', 'criar'] }),
  };

  const mockPapelVendedor = {
    id: 2,
    nome: 'Vendedor',
    codigo: 'VENDEDOR',
    tipo: 'INTERNO',
    nivel: 50,
    permissoes: JSON.stringify({ pedidos: ['listar', 'ver', 'criar'] }),
  };

  const mockPapelClienteAdmin = {
    id: 3,
    nome: 'Cliente Admin',
    codigo: 'CLIENTE_ADMIN',
    tipo: 'CLIENTE',
    nivel: 30,
    permissoes: JSON.stringify({ pedidos: ['listar', 'ver', 'criar'] }),
  };

  const mockPapelClienteUsuario = {
    id: 4,
    nome: 'Cliente Usuário',
    codigo: 'CLIENTE_USUARIO',
    tipo: 'CLIENTE',
    nivel: 20,
    permissoes: JSON.stringify({ pedidos: ['listar', 'ver'] }),
  };

  const mockCliente = {
    id: 1,
    cnpj: '12345678000100',
    razao_social: 'Padaria Central Ltda',
    nome_fantasia: 'Padaria Central',
    email: 'contato@padaria.com',
    telefone: '11999999999',
    status: 'ativo',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deleted_at: null,
  };

  const mockClienteInativo = {
    ...mockCliente,
    id: 2,
    cnpj: '98765432000100',
    nome_fantasia: 'Padaria Inativa',
    status: 'inativo',
    deleted_at: new Date('2024-06-01'),
  };

  const mockUsuario = {
    id: 1,
    nome: 'João Silva',
    email: 'joao@linos.com',
    senha: '$2a$10$hashsenha',
    status: 'ativo',
    papel_id: 1,
    cliente_id: null,
    papel: mockPapel,
    cliente: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deleted_at: null,
  };

  const mockUsuarioCliente = {
    id: 3,
    nome: 'Carlos Cliente',
    email: 'carlos@padaria.com',
    senha: '$2a$10$hashsenha',
    status: 'ativo',
    papel_id: 3,
    cliente_id: 1,
    papel: mockPapelClienteAdmin,
    cliente: mockCliente,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deleted_at: null,
  };

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    papel: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    cliente: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashsenha');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  // =========================================================================
  // CREATE
  // =========================================================================

  describe('create', () => {
    const createDto = {
      nome: 'Maria Santos',
      email: 'maria@linos.com',
      senha: 'senha123',
      papel_id: 1,
    };

    it('deve criar usuário com dados válidos', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel);
      mockPrismaService.usuario.create.mockResolvedValue({
        id: 2,
        ...createDto,
        senha: '$2a$10$hashsenha',
        status: 'ativo',
        cliente_id: null,
        papel: mockPapel,
        cliente: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      const result = await service.create(createDto);

      expect(result.id).toBe(2);
      expect(result.nome).toBe('Maria Santos');
      expect(result.email).toBe('maria@linos.com');
      expect(mockPrismaService.usuario.create).toHaveBeenCalled();
    });

    it('deve aplicar hash na senha antes de salvar', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel);
      mockPrismaService.usuario.create.mockResolvedValue({
        ...mockUsuario,
        id: 2,
        ...createDto,
        senha: '$2a$10$hashsenha',
        papel: mockPapel,
        cliente: null,
      });

      await service.create(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
      expect(mockPrismaService.usuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          senha: '$2a$10$hashsenha',
        }),
        include: { papel: true, cliente: true },
      });
    });

    it('deve rejeitar email duplicado', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow('E-mail já cadastrado');
    });

    it('deve rejeitar papel_id inexistente', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(null);

      await expect(service.create({ ...createDto, papel_id: 999 }))
        .rejects.toThrow(NotFoundException);
    });

    it('deve retornar usuário sem o campo senha', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel);
      mockPrismaService.usuario.create.mockResolvedValue({
        ...mockUsuario,
        id: 2,
        ...createDto,
        senha: '$2a$10$hashsenha',
        papel: mockPapel,
        cliente: null,
      });

      const result = await service.create(createDto);

      expect(result).not.toHaveProperty('senha');
    });

    it('deve retornar permissões parseadas (não string JSON)', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel);
      mockPrismaService.usuario.create.mockResolvedValue({
        ...mockUsuario,
        id: 2,
        ...createDto,
        senha: '$2a$10$hashsenha',
        papel: mockPapel,
        cliente: null,
      });

      const result = await service.create(createDto);

      expect(result.papel.permissoes).toEqual({
        clientes: ['listar', 'ver', 'criar'],
      });
      expect(typeof result.papel.permissoes).not.toBe('string');
    });

    // NOTA: O UsuariosService não implementa validação de nível hierárquico.
    // Se futuramente implementado, adicionar testes aqui.
  });

  // =========================================================================
  // CREATE - VÍNCULO CLIENTE
  // =========================================================================

  describe('create - vínculo cliente', () => {
    it('deve criar usuário CLIENTE com cliente_id válido', async () => {
      const createDto = {
        nome: 'Carlos Cliente',
        email: 'carlos@padaria.com',
        senha: 'senha123',
        papel_id: 3,
        cliente_id: 1,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapelClienteAdmin);
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockCliente);
      mockPrismaService.usuario.create.mockResolvedValue({
        ...mockUsuarioCliente,
        id: 10,
        nome: createDto.nome,
        email: createDto.email,
      });

      const result = await service.create(createDto);

      expect(result.id).toBe(10);
      expect(result.nome).toBe('Carlos Cliente');
      expect(mockPrismaService.usuario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cliente_id: 1,
        }),
        include: { papel: true, cliente: true },
      });
    });

    it('deve rejeitar papel CLIENTE sem cliente_id', async () => {
      const createDto = {
        nome: 'Carlos Cliente',
        email: 'carlos@padaria.com',
        senha: 'senha123',
        papel_id: 3,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapelClienteAdmin);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Usuários com papel do tipo CLIENTE devem estar vinculados a um cliente',
      );
    });

    it('deve rejeitar papel INTERNO com cliente_id', async () => {
      const createDto = {
        nome: 'Maria Interna',
        email: 'maria@linos.com',
        senha: 'senha123',
        papel_id: 1,
        cliente_id: 1,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Usuários com papel do tipo INTERNO não podem estar vinculados a um cliente',
      );
    });

    it('deve criar usuário INTERNO sem cliente_id com sucesso', async () => {
      const createDto = {
        nome: 'Maria Interna',
        email: 'maria@linos.com',
        senha: 'senha123',
        papel_id: 1,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel);
      mockPrismaService.usuario.create.mockResolvedValue({
        ...mockUsuario,
        id: 10,
        nome: createDto.nome,
        email: createDto.email,
      });

      const result = await service.create(createDto);

      expect(result.id).toBe(10);
      expect(mockPrismaService.cliente.findUnique).not.toHaveBeenCalled();
    });

    it('deve rejeitar cliente_id inexistente', async () => {
      const createDto = {
        nome: 'Carlos Cliente',
        email: 'carlos@padaria.com',
        senha: 'senha123',
        papel_id: 3,
        cliente_id: 999,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapelClienteAdmin);
      mockPrismaService.cliente.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Cliente com ID 999 não encontrado',
      );
    });

    it('deve rejeitar cliente inativo ou deletado', async () => {
      const createDto = {
        nome: 'Carlos Cliente',
        email: 'carlos@padaria.com',
        senha: 'senha123',
        papel_id: 3,
        cliente_id: 2,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapelClienteAdmin);
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockClienteInativo);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Cliente com ID 2 está inativo ou foi removido',
      );
    });
  });

  // =========================================================================
  // FIND ALL
  // =========================================================================

  describe('findAll', () => {
    it('deve retornar lista de usuários com papel incluso', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuario]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('papel');
      expect(result[0].papel.nome).toBe('Administrador');
      expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        include: { papel: true, cliente: true },
      });
    });

    it('deve filtrar usuários soft-deleted (deleted_at != null)', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted_at: null },
        }),
      );
    });

    it('deve retornar usuários sem o campo senha', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([
        mockUsuario,
        { ...mockUsuario, id: 2, email: 'outro@linos.com' },
      ]);

      const result = await service.findAll();

      result.forEach((u) => {
        expect(u).not.toHaveProperty('senha');
      });
    });

    it('deve retornar permissões parseadas para cada usuário', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuario]);

      const result = await service.findAll();

      expect(result[0].papel.permissoes).toEqual({
        clientes: ['listar', 'ver', 'criar'],
      });
    });

    it('deve retornar array vazio quando não há usuários', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('deve filtrar por cliente_id quando fornecido', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuarioCliente]);

      const result = await service.findAll(1);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null, cliente_id: 1 },
        include: { papel: true, cliente: true },
      });
    });
  });

  // =========================================================================
  // FIND ONE
  // =========================================================================

  describe('findOne', () => {
    it('deve retornar usuário com papel incluso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result).toHaveProperty('papel');
      expect(result.papel.nome).toBe('Administrador');
    });

    it('deve retornar usuário sem o campo senha', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);

      const result = await service.findOne(1);

      expect(result).not.toHaveProperty('senha');
    });

    it('deve lançar NotFoundException para ID inexistente', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Usuário com ID 999 não encontrado',
      );
    });

    it('deve incluir dados do cliente quando vinculado', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);

      const result = await service.findOne(3);

      expect(result.id).toBe(3);
      expect(result.cliente).toBeDefined();
      expect(result.cliente.nome_fantasia).toBe('Padaria Central');
      expect(mockPrismaService.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: 3 },
        include: { papel: true, cliente: true },
      });
    });
  });

  // =========================================================================
  // UPDATE
  // =========================================================================

  describe('update', () => {
    it('deve atualizar campos do usuário', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuario,
        nome: 'João Atualizado',
        papel: mockPapel,
        cliente: null,
      });

      const result = await service.update(1, { nome: 'João Atualizado' });

      expect(result.nome).toBe('João Atualizado');
      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ nome: 'João Atualizado' }),
        include: { papel: true, cliente: true },
      });
    });

    it('deve aplicar hash na senha ao atualizar', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuario,
        senha: '$2a$10$novahash',
        papel: mockPapel,
        cliente: null,
      });

      await service.update(1, { senha: 'novasenha123' });

      expect(bcrypt.hash).toHaveBeenCalledWith('novasenha123', 10);
      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          senha: '$2a$10$hashsenha',
        }),
        include: { papel: true, cliente: true },
      });
    });

    it('deve rejeitar email duplicado na atualização', async () => {
      // Primeiro findUnique: verificar se o usuário existe
      mockPrismaService.usuario.findUnique
        .mockResolvedValueOnce(mockUsuario) // Usuário a ser atualizado
        .mockResolvedValueOnce({ id: 2, email: 'outro@linos.com' }); // Email já em uso

      await expect(
        service.update(1, { email: 'outro@linos.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve permitir manter o mesmo email', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuario,
        papel: mockPapel,
        cliente: null,
      });

      // Atualizar com o mesmo email não deve verificar duplicidade
      const result = await service.update(1, { email: 'joao@linos.com' });

      expect(result).toBeDefined();
    });

    it('deve validar papel_id na atualização', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.papel.findUnique.mockResolvedValue(null);

      await expect(
        service.update(1, { papel_id: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException para ID inexistente', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { nome: 'Teste' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve retornar usuário atualizado sem o campo senha', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuario,
        nome: 'João Atualizado',
        papel: mockPapel,
        cliente: null,
      });

      const result = await service.update(1, { nome: 'João Atualizado' });

      expect(result).not.toHaveProperty('senha');
    });
  });

  // =========================================================================
  // UPDATE - VÍNCULO CLIENTE
  // =========================================================================

  describe('update - vínculo cliente', () => {
    it('deve rejeitar mudança INTERNO→CLIENTE sem cliente_id', async () => {
      // Usuário atual é INTERNO (mockUsuario com mockPapel tipo INTERNO)
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapelClienteAdmin);

      await expect(
        service.update(1, { papel_id: 3 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(1, { papel_id: 3 }),
      ).rejects.toThrow(
        'Usuários com papel do tipo CLIENTE devem estar vinculados a um cliente',
      );
    });

    it('deve permitir mudança INTERNO→CLIENTE com cliente_id válido', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapelClienteAdmin);
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockCliente);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuario,
        papel_id: 3,
        cliente_id: 1,
        papel: mockPapelClienteAdmin,
        cliente: mockCliente,
      });

      const result = await service.update(1, { papel_id: 3, cliente_id: 1 });

      expect(result).toBeDefined();
      expect(result.cliente).toBeDefined();
      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          papel_id: 3,
          cliente_id: 1,
        }),
        include: { papel: true, cliente: true },
      });
    });

    it('deve limpar cliente_id automaticamente na mudança CLIENTE→INTERNO', async () => {
      // Usuário atual é CLIENTE (mockUsuarioCliente com mockPapelClienteAdmin tipo CLIENTE)
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel); // novo papel INTERNO
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuarioCliente,
        papel_id: 1,
        cliente_id: null,
        papel: mockPapel,
        cliente: null,
      });

      const result = await service.update(3, { papel_id: 1 });

      expect(result).toBeDefined();
      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: expect.objectContaining({
          papel_id: 1,
          cliente_id: null,
        }),
        include: { papel: true, cliente: true },
      });
    });
  });

  // =========================================================================
  // REMOVE (soft-delete)
  // =========================================================================

  describe('remove', () => {
    it('deve fazer soft-delete do usuário (status inativo + deleted_at)', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuario);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuario,
        status: 'inativo',
        deleted_at: new Date(),
      });

      await service.remove(1);

      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'inativo',
          deleted_at: expect.any(Date),
        },
      });
    });

    it('deve lançar NotFoundException para ID inexistente', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    // NOTA: O UsuariosService não implementa verificação de auto-exclusão
    // (impedir que o próprio usuário se delete). Se futuramente implementado,
    // adicionar testes aqui.
  });

  // =========================================================================
  // FIND PAPEIS
  // =========================================================================

  describe('findPapeis', () => {
    it('deve retornar lista de papéis com permissões parseadas', async () => {
      mockPrismaService.papel.findMany.mockResolvedValue([
        mockPapel,
        mockPapelVendedor,
      ]);

      const result = await service.findPapeis();

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Administrador');
      expect(result[0].permissoes).toEqual({
        clientes: ['listar', 'ver', 'criar'],
      });
      expect(result[1].nome).toBe('Vendedor');
      expect(result[1].permissoes).toEqual({
        pedidos: ['listar', 'ver', 'criar'],
      });
    });

    it('deve filtrar papéis por tipo quando fornecido', async () => {
      mockPrismaService.papel.findMany.mockResolvedValue([
        mockPapelClienteAdmin,
        mockPapelClienteUsuario,
      ]);

      const result = await service.findPapeis('CLIENTE');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.papel.findMany).toHaveBeenCalledWith({
        where: { tipo: 'CLIENTE' },
      });
    });

    it('deve retornar todos os papéis quando tipo não fornecido', async () => {
      mockPrismaService.papel.findMany.mockResolvedValue([
        mockPapel,
        mockPapelVendedor,
        mockPapelClienteAdmin,
      ]);

      await service.findPapeis();

      expect(mockPrismaService.papel.findMany).toHaveBeenCalledWith({
        where: {},
      });
    });
  });

  // =========================================================================
  // TENANT ISOLATION — CREATE
  // =========================================================================

  describe('create — tenant isolation (callerContext)', () => {
    const callerContext = { clienteId: 1, papelNivel: 30 };

    it('CLIENTE_ADMIN cria CLIENTE_USUARIO do seu cliente → sucesso, cliente_id forçado', async () => {
      const createDto = {
        nome: 'Novo Sub-usuário',
        email: 'novo@padaria.com',
        senha: 'senha123',
        papel_id: 4, // CLIENTE_USUARIO
        cliente_id: 999, // tenta forçar outro cliente — será sobrescrito
      };

      mockPrismaService.papel.findUnique
        .mockResolvedValueOnce(mockPapelClienteUsuario) // check papel destino
        .mockResolvedValueOnce(mockPapelClienteUsuario); // create pipeline
      mockPrismaService.usuario.findUnique.mockResolvedValue(null); // email não existe
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockCliente); // cliente válido
      mockPrismaService.usuario.create.mockResolvedValue({
        id: 20,
        ...createDto,
        cliente_id: 1, // forçado
        senha: '$2a$10$hashsenha',
        status: 'ativo',
        papel: mockPapelClienteUsuario,
        cliente: mockCliente,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      const result = await service.create(createDto, callerContext);

      expect(result.id).toBe(20);
      // O DTO foi mutado: cliente_id forçado para o do caller
      expect(createDto.cliente_id).toBe(1);
    });

    it('CLIENTE_ADMIN tenta criar CLIENTE_ADMIN → ForbiddenException (mesmo nível)', async () => {
      const createDto = {
        nome: 'Outro Admin',
        email: 'admin2@padaria.com',
        senha: 'senha123',
        papel_id: 3, // CLIENTE_ADMIN (nível 30 = nível do caller)
      };

      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapelClienteAdmin);

      await expect(service.create(createDto, callerContext)).rejects.toThrow(ForbiddenException);
      await expect(service.create(createDto, callerContext)).rejects.toThrow(
        'Sem permissão para criar usuários com este papel',
      );
    });

    it('CLIENTE_ADMIN tenta criar papel INTERNO → ForbiddenException', async () => {
      const createDto = {
        nome: 'Interno Hack',
        email: 'hack@padaria.com',
        senha: 'senha123',
        papel_id: 1, // ADMIN_SISTEMA (INTERNO)
      };

      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel); // tipo INTERNO

      await expect(service.create(createDto, callerContext)).rejects.toThrow(ForbiddenException);
    });

    it('CLIENTE_ADMIN com cliente_id de outro cliente no body → sobrescrito pelo caller', async () => {
      const createDto = {
        nome: 'Sub-usuário',
        email: 'sub@padaria.com',
        senha: 'senha123',
        papel_id: 4,
        cliente_id: 42, // tenta outro cliente
      };

      mockPrismaService.papel.findUnique
        .mockResolvedValueOnce(mockPapelClienteUsuario)
        .mockResolvedValueOnce(mockPapelClienteUsuario);
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.cliente.findUnique.mockResolvedValue(mockCliente);
      mockPrismaService.usuario.create.mockResolvedValue({
        id: 21,
        ...createDto,
        cliente_id: 1,
        senha: '$2a$10$hashsenha',
        status: 'ativo',
        papel: mockPapelClienteUsuario,
        cliente: mockCliente,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      await service.create(createDto, callerContext);

      // O body foi mutado: cliente_id forçado para 1
      expect(createDto.cliente_id).toBe(1);
    });

    it('Admin (sem callerContext) cria qualquer papel → sucesso', async () => {
      const createDto = {
        nome: 'Novo Admin',
        email: 'novoadmin@linos.com',
        senha: 'senha123',
        papel_id: 1,
      };

      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.papel.findUnique.mockResolvedValue(mockPapel);
      mockPrismaService.usuario.create.mockResolvedValue({
        id: 22,
        ...createDto,
        cliente_id: null,
        senha: '$2a$10$hashsenha',
        status: 'ativo',
        papel: mockPapel,
        cliente: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      const result = await service.create(createDto); // sem callerContext

      expect(result.id).toBe(22);
    });
  });

  // =========================================================================
  // TENANT ISOLATION — FIND ALL
  // =========================================================================

  describe('findAll — tenant isolation', () => {
    it('CLIENTE_ADMIN chama findAll → retorna apenas do seu cliente', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuarioCliente]);

      await service.findAll(undefined, 1); // callerClienteId = 1

      expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null, cliente_id: 1 },
        include: { papel: true, cliente: true },
      });
    });

    it('CLIENTE_ADMIN passa cliente_id de outro no query → ignorado, usa do JWT', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuarioCliente]);

      await service.findAll(42, 1); // query=42, caller=1

      expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null, cliente_id: 1 }, // caller prevalece
        include: { papel: true, cliente: true },
      });
    });

    it('Admin sem callerClienteId → retorna todos', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([mockUsuario]);

      await service.findAll(); // sem clienteId

      expect(mockPrismaService.usuario.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        include: { papel: true, cliente: true },
      });
    });
  });

  // =========================================================================
  // TENANT ISOLATION — FIND ONE / UPDATE
  // =========================================================================

  describe('findOne — tenant isolation', () => {
    it('CLIENTE_ADMIN busca usuário do seu cliente → sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);

      const result = await service.findOne(3, 1); // callerClienteId = 1

      expect(result.id).toBe(3);
    });

    it('CLIENTE_ADMIN busca usuário de outro cliente → ForbiddenException', async () => {
      const usuarioOutroCliente = { ...mockUsuarioCliente, cliente_id: 99 };
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioOutroCliente);

      await expect(service.findOne(3, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(3, 1)).rejects.toThrow('Acesso negado a este usuário');
    });
  });

  describe('update — tenant isolation', () => {
    it('CLIENTE_ADMIN edita usuário do seu cliente → sucesso', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(mockUsuarioCliente);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...mockUsuarioCliente,
        nome: 'Carlos Atualizado',
        papel: mockPapelClienteAdmin,
        cliente: mockCliente,
      });

      const result = await service.update(
        3,
        { nome: 'Carlos Atualizado' },
        { clienteId: 1, papelNivel: 30 },
      );

      expect(result.nome).toBe('Carlos Atualizado');
    });

    it('CLIENTE_ADMIN edita usuário de outro cliente → ForbiddenException', async () => {
      const usuarioOutroCliente = {
        ...mockUsuarioCliente,
        cliente_id: 99,
        papel: mockPapelClienteUsuario,
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioOutroCliente);

      await expect(
        service.update(3, { nome: 'Hack' }, { clienteId: 1, papelNivel: 30 }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(3, { nome: 'Hack' }, { clienteId: 1, papelNivel: 30 }),
      ).rejects.toThrow('Acesso negado a este usuário');
    });
  });

  // =========================================================================
  // TENANT ISOLATION — REMOVE
  // =========================================================================

  describe('remove — tenant isolation', () => {
    it('CLIENTE_ADMIN desativa CLIENTE_USUARIO do seu cliente → sucesso', async () => {
      const subUsuario = {
        ...mockUsuarioCliente,
        id: 10,
        papel_id: 4,
        papel: mockPapelClienteUsuario,
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(subUsuario);
      mockPrismaService.usuario.update.mockResolvedValue({
        ...subUsuario,
        status: 'inativo',
        deleted_at: new Date(),
      });

      await service.remove(10, { clienteId: 1, callerId: 3 });

      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'inativo', deleted_at: expect.any(Date) },
      });
    });

    it('CLIENTE_ADMIN desativa usuário de outro cliente → ForbiddenException', async () => {
      const usuarioOutroCliente = {
        ...mockUsuarioCliente,
        id: 50,
        cliente_id: 99,
        papel: mockPapelClienteUsuario,
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(usuarioOutroCliente);

      await expect(
        service.remove(50, { clienteId: 1, callerId: 3 }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove(50, { clienteId: 1, callerId: 3 }),
      ).rejects.toThrow('Acesso negado a este usuário');
    });

    it('CLIENTE_ADMIN desativa a si mesmo → BadRequestException', async () => {
      const selfUser = {
        ...mockUsuarioCliente,
        id: 3,
        papel: mockPapelClienteAdmin,
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(selfUser);

      await expect(
        service.remove(3, { clienteId: 1, callerId: 3 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.remove(3, { clienteId: 1, callerId: 3 }),
      ).rejects.toThrow('Não é possível desativar sua própria conta');
    });

    it('CLIENTE_ADMIN desativa outro CLIENTE_ADMIN → ForbiddenException', async () => {
      const outroAdmin = {
        ...mockUsuarioCliente,
        id: 5,
        papel: mockPapelClienteAdmin, // CLIENTE_ADMIN
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(outroAdmin);

      await expect(
        service.remove(5, { clienteId: 1, callerId: 3 }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove(5, { clienteId: 1, callerId: 3 }),
      ).rejects.toThrow('Sem permissão para desativar administradores');
    });
  });
});
