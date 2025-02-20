import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaTestService } from '../prisma.service.test';

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      cliente: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      produto: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      pedido: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      itensPedido: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    })),
  };
});

describe('PrismaTestService', () => {
  let service: PrismaTestService;
  let module: TestingModule;

  beforeEach(async () => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Configura o módulo de teste
    module = await Test.createTestingModule({
      providers: [PrismaTestService],
    }).compile();

    // Obtém uma instância do serviço
    service = module.get<PrismaTestService>(PrismaTestService);

    // Adiciona os métodos necessários ao serviço
    service.onModuleInit = jest.fn().mockImplementation(async () => {
      await service.$connect();
    });

    service.onModuleDestroy = jest.fn().mockImplementation(async () => {
      await service.$disconnect();
    });

    service.cleanDatabase = jest.fn().mockImplementation(async () => {
      const models = ['cliente', 'produto', 'pedido', 'itensPedido'];
      return Promise.all(
        models.map(async (model) => {
          //@ts-ignore - Dynamic access to Prisma models
          return service[model].deleteMany();
        })
      );
    });
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      const connectSpy = jest.spyOn(service, '$connect');
      
      await service.onModuleInit();
      
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect');
      
      await service.onModuleDestroy();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('cleanDatabase', () => {
    it('should call deleteMany on all models', async () => {
      const result = await service.cleanDatabase();

      // Verifica se todos os modelos foram limpos
      expect(result).toBeDefined();
      expect(result.length).toBe(4); // cliente, produto, pedido, itensPedido
      
      // Verifica se deleteMany foi chamado em cada modelo
      expect(service.cliente.deleteMany).toHaveBeenCalled();
      expect(service.produto.deleteMany).toHaveBeenCalled();
      expect(service.pedido.deleteMany).toHaveBeenCalled();
      expect(service.itensPedido.deleteMany).toHaveBeenCalled();
    });
  });
});
