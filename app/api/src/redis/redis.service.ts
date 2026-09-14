import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.getOrThrow<string>('redis.host'),
      port: config.getOrThrow<number>('redis.port'),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  get(key: string) {
    return this.client.get(key);
  }
  set(key: string, value: string, ttlSeconds?: number) {
    return ttlSeconds
      ? this.client.set(key, value, 'EX', ttlSeconds)
      : this.client.set(key, value);
  }
  del(key: string) {
    return this.client.del(key);
  }
  exists(key: string) {
    return this.client.exists(key);
  }
  ping() {
    return this.client.ping();
  }
  incr(key: string) {
    return this.client.incr(key);
  }
  expire(key: string, seconds: number) {
    return this.client.expire(key, seconds);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
