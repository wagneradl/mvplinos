import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('@prisma/client');
jest.mock('bcrypt');

describe('create-admin script', () => {
  let mockPrismaClient: any;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    consoleSpy = jest.spyOn(console, 'log');
    consoleErrorSpy = jest.spyOn(console, 'error');
    
    mockPrismaClient = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $disconnect: jest.fn(),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create admin user when it does not exist', async () => {
    mockPrismaClient.usuario.findUnique.mockResolvedValue(null);
    mockPrismaClient.usuario.create.mockResolvedValue({
      email: 'admin@linospadaria.com',
      nome: 'Administrador',
      role: 'admin',
      status: 'ativo',
    });

    const createAdmin = require('../create-admin');
    await createAdmin.createAdminUser();

    expect(mockPrismaClient.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@linospadaria.com' },
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('admin123', 10);

    expect(mockPrismaClient.usuario.create).toHaveBeenCalledWith({
      data: {
        email: 'admin@linospadaria.com',
        nome: 'Administrador',
        senha: 'hashed_password',
        role: 'admin',
        status: 'ativo',
      },
    });

    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Usuário admin criado com sucesso:',
      'admin@linospadaria.com'
    );
  });

  it('should not create admin user when it already exists', async () => {
    mockPrismaClient.usuario.findUnique.mockResolvedValue({
      email: 'admin@linospadaria.com',
      nome: 'Administrador',
      role: 'admin',
      status: 'ativo',
    });

    const createAdmin = require('../create-admin');
    await createAdmin.createAdminUser();

    expect(mockPrismaClient.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@linospadaria.com' },
    });

    expect(mockPrismaClient.usuario.create).not.toHaveBeenCalled();
    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Usuário admin já existe');
  });

  it('should handle errors gracefully', async () => {
    mockPrismaClient.usuario.findUnique.mockRejectedValue(new Error('Database error'));

    const createAdmin = require('../create-admin');
    await createAdmin.createAdminUser();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Erro ao criar usuário admin:',
      expect.any(Error)
    );

    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
  });
});
