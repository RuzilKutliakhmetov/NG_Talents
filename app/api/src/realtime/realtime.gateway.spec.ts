import { describe, expect, it, vi } from 'vitest';
import { UserRole, UserStatus } from '../generated/prisma/client.js';
import { RealtimeGateway } from './realtime.gateway.js';

function socketMock(token: unknown) {
  return {
    id: 'socket-1',
    handshake: { auth: { token } },
    data: {} as Record<string, unknown>,
    join: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
  };
}

describe('RealtimeGateway', () => {
  it('emits events to a server-selected user room only', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    const gateway = new RealtimeGateway(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    gateway.server = { to } as never;

    gateway.emitToUser('user-1', 'messages:new', { conversationId: 'conv-1' });

    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(emit).toHaveBeenCalledWith('messages:new', {
      conversationId: 'conv-1',
    });
  });

  it('initializes the cross-instance Redis adapter and uses configured CORS', async () => {
    const publisher = {
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    const subscriber = {
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    const redis = {
      duplicate: vi
        .fn()
        .mockReturnValueOnce(publisher)
        .mockReturnValueOnce(subscriber),
    };
    const gateway = new RealtimeGateway(
      {} as never,
      {} as never,
      redis as never,
      { getOrThrow: vi.fn().mockReturnValue('http://localhost:3001') } as never,
    );
    const namespace = {
      server: {
        engine: { opts: { cors: undefined } },
        adapter: vi.fn(),
      },
    };

    await gateway.afterInit(namespace as never);

    expect(namespace.server.engine.opts.cors).toEqual({
      origin: 'http://localhost:3001',
      credentials: true,
    });
    expect(redis.duplicate).toHaveBeenCalledTimes(2);
    expect(publisher.connect).toHaveBeenCalledOnce();
    expect(subscriber.connect).toHaveBeenCalledOnce();
    expect(namespace.server.adapter).toHaveBeenCalledOnce();
  });

  it('authenticates a live user and joins only their private user room', async () => {
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({
        sub: 'user-1',
        role: UserRole.CANDIDATE,
      }),
    };
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: 'user-1' }),
      },
    };
    const gateway = new RealtimeGateway(
      jwt as never,
      prisma as never,
      {} as never,
      {} as never,
    );
    const client = socketMock('signed-access-token');

    await gateway.handleConnection(client as never);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
        role: UserRole.CANDIDATE,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
    expect(client.data.userId).toBe('user-1');
    expect(client.join).toHaveBeenCalledWith('user:user-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects sockets without an access token', async () => {
    const jwt = { verifyAsync: vi.fn() };
    const prisma = { user: { findFirst: vi.fn() } };
    const gateway = new RealtimeGateway(
      jwt as never,
      prisma as never,
      {} as never,
      {} as never,
    );
    const client = socketMock(undefined);

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('disconnects tokens for inactive users without joining a room', async () => {
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({
        sub: 'user-1',
        role: UserRole.MODERATOR,
      }),
    };
    const prisma = { user: { findFirst: vi.fn().mockResolvedValue(null) } };
    const gateway = new RealtimeGateway(
      jwt as never,
      prisma as never,
      {} as never,
      {} as never,
    );
    const client = socketMock('signed-access-token');

    await gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });
});
