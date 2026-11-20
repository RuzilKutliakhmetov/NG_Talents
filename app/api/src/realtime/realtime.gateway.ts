import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole, UserStatus } from '../generated/prisma/client.js';
import { RedisService } from '../redis/redis.service.js';

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class RealtimeGateway
  implements
    OnGatewayInit<Namespace>,
    OnGatewayConnection<Socket>,
    OnGatewayDisconnect<Socket>
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private publisher?: Redis;
  private subscriber?: Redis;

  @WebSocketServer()
  server!: Namespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async afterInit(namespace: Namespace) {
    namespace.server.engine.opts.cors = {
      origin: this.config.getOrThrow<string>('corsOrigin'),
      credentials: true,
    };
    this.publisher = this.redis.duplicate();
    this.subscriber = this.redis.duplicate();
    try {
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      namespace.server.adapter(createAdapter(this.publisher, this.subscriber));
    } catch (error) {
      this.logger.error(
        'Could not initialize the realtime Redis adapter',
        error instanceof Error ? error.stack : undefined,
      );
      await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
      throw error;
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token: unknown = client.handshake.auth?.token;
      if (typeof token !== 'string' || token.length === 0) {
        throw new UnauthorizedException();
      }

      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      if (!payload.sub || !Object.values(UserRole).includes(payload.role)) {
        throw new UnauthorizedException();
      }

      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
          role: payload.role,
          status: UserStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (!user) throw new UnauthorizedException();

      client.data.userId = user.id;
      await client.join(this.userRoom(user.id));
    } catch (error) {
      this.logger.warn(
        `Rejected unauthenticated realtime connection ${client.id}`,
      );
      client.disconnect(true);
      if (!(error instanceof UnauthorizedException)) {
        this.logger.error(
          `Realtime authentication failed for ${client.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  handleDisconnect(client: Socket) {
    delete client.data.userId;
  }

  async onModuleDestroy() {
    await Promise.all(
      [this.publisher, this.subscriber]
        .filter((client): client is Redis => client !== undefined)
        .map((client) => client.quit()),
    );
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    try {
      if (!this.server) throw new Error('Realtime gateway is not initialized');
      this.server.to(this.userRoom(userId)).emit(event, payload);
    } catch (error) {
      this.logger.warn(
        `Realtime event ${event} for user ${userId} could not be emitted`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
