import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
  imports: [AuthModule, RedisModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
