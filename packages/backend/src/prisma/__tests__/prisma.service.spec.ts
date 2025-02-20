import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await service.$disconnect();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extend PrismaClient', () => {
    expect(service).toBeInstanceOf(PrismaClient);
  });

  it('should have connect and disconnect methods', () => {
    expect(service.$connect).toBeDefined();
    expect(service.$disconnect).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to the database', async () => {
      const connectSpy = jest.spyOn(service, '$connect');
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      const connectSpy = jest.spyOn(service, '$connect').mockRejectedValueOnce(error);
      
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should be able to connect multiple times', async () => {
      const connectSpy = jest.spyOn(service, '$connect');
      
      await service.onModuleInit();
      await service.onModuleInit();
      await service.onModuleInit();
      
      expect(connectSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from the database', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect');
      await service.onModuleDestroy();
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      const error = new Error('Disconnection failed');
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockRejectedValueOnce(error);
      
      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection failed');
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should be able to disconnect multiple times', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect');
      
      await service.onModuleDestroy();
      await service.onModuleDestroy();
      
      expect(disconnectSpy).toHaveBeenCalledTimes(2);
    });
  });
});
