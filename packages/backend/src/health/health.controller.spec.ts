import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: PrismaService;
  let mockResponse: any;

  beforeEach(async () => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRawUnsafe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('deve retornar 200 com database: connected quando DB está ok', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([{ 1: 1 }]);

    await controller.check(mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        database: 'connected',
        version: 'm4',
        service: 'linos-backend',
      }),
    );
    const body = mockResponse.json.mock.calls[0][0];
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('timestamp');
  });

  it('deve retornar 503 com database: disconnected quando DB falha', async () => {
    (prisma.$queryRawUnsafe as jest.Mock).mockRejectedValue(new Error('DB down'));

    await controller.check(mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
        database: 'disconnected',
      }),
    );
  });
});
