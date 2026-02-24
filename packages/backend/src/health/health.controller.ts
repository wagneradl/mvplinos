import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@SkipThrottle({ login: true, reset: true })
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res() res: Response) {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const status = dbStatus === 'connected' ? 'ok' : 'degraded';
    const httpStatus =
      dbStatus === 'connected'
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      service: 'linos-backend',
      version: 'm4',
      uptime: Math.floor(process.uptime()),
      database: dbStatus,
    });
  }
}
