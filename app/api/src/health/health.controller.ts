import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { StorageService } from '../storage/storage.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
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
      await this.storage.checkHealth();
      return { status: 'ok', database: 'ok', redis: 'ok', storage: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
        redis: 'unavailable',
        storage: 'unavailable',
      });
    }
  }
}
