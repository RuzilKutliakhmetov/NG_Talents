import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const key = `rate:${request.ip}:${request.route?.path ?? request.path}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 900);
    if (count > 5) throw new HttpException('Too many requests', 429);
    return true;
  }
}
