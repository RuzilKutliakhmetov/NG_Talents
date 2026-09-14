import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('live')
  liveCheck() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.redis.ping();
      return { status: 'ok', database: 'ok', redis: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
        redis: 'unavailable',
      });
    }
  }
}
