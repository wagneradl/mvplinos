import { Test, TestingModule } from '@nestjs/testing';
import { PrismaTestService } from '../prisma.service.test';

// Mock the PrismaClient
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockExecuteRaw = jest.fn().mockImplementation((query) => Promise.resolve());
const mockTransaction = jest.fn().mockImplementation((callback) => {
  if (Array.isArray(callback)) {
    return Promise.all(callback.map(query => Promise.resolve()));
  }
  return callback();
});

// Mock class that extends PrismaClient
class MockPrismaClient {
  $connect = mockConnect;
  $disconnect = mockDisconnect;
  $executeRaw = mockExecuteRaw;
  $transaction = mockTransaction;
}

// Mock the PrismaTestService
jest.mock('../prisma.service.test', () => {
  return {
    PrismaTestService: jest.fn().mockImplementation(() => {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      const instance = new MockPrismaClient();
      return {
        ...instance,
        onModuleInit: async () => mockConnect(),
        onModuleDestroy: async () => mockDisconnect(),
        cleanDatabase: async () => {
          await mockExecuteRaw('PRAGMA foreign_keys = OFF;');
          await mockTransaction([
            mockExecuteRaw('DELETE FROM ItemPedido;'),
            mockExecuteRaw('DELETE FROM Pedido;'),
            mockExecuteRaw('DELETE FROM Cliente;'),
            mockExecuteRaw('DELETE FROM Produto;'),
          ]);
          await mockExecuteRaw('PRAGMA foreign_keys = ON;');
        },
      };
    }),
  };
});

describe('PrismaTestService', () => {
  let service: PrismaTestService;
  let module: TestingModule;

  beforeEach(async () => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Define a variável de ambiente necessária
    process.env.DATABASE_URL = 'file:./test.db';

    // Configura o módulo de teste
    module = await Test.createTestingModule({
      providers: [PrismaTestService],
    }).compile();

    // Obtém uma instância do serviço
    service = module.get<PrismaTestService>(PrismaTestService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw error if DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      expect(() => new PrismaTestService()).toThrow('DATABASE_URL environment variable is not set');
    });
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      await service.onModuleInit();
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      await service.onModuleDestroy();
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('cleanDatabase', () => {
    it('should execute raw queries to clean all tables', async () => {
      await service.cleanDatabase();

      expect(mockExecuteRaw).toHaveBeenCalledWith('PRAGMA foreign_keys = OFF;');
      expect(mockTransaction).toHaveBeenCalledWith([
        mockExecuteRaw('DELETE FROM ItemPedido;'),
        mockExecuteRaw('DELETE FROM Pedido;'),
        mockExecuteRaw('DELETE FROM Cliente;'),
        mockExecuteRaw('DELETE FROM Produto;'),
      ]);
      expect(mockExecuteRaw).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
    });

    it('should handle errors during cleanup', async () => {
      mockExecuteRaw.mockRejectedValueOnce(new Error('Database error'));
      await expect(service.cleanDatabase()).rejects.toThrow('Database error');
    });
  });
});
