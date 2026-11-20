import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserRole } from '../generated/prisma/client.js';
import { NotificationsController } from '../notifications/notifications.controller.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

describe('Messages and notifications HTTP integration', () => {
  const messages = {
    unreadCount: vi.fn().mockResolvedValue({ count: 0 }),
    listConversations: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
    getConversation: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    markRead: vi.fn(),
  };
  const notifications = {
    list: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
    unreadCount: vi.fn().mockResolvedValue({ count: 0 }),
    markAllRead: vi.fn(),
    preferences: vi.fn(),
    updatePreference: vi.fn(),
    markRead: vi.fn(),
    remove: vi.fn(),
  };
  const jwt = {
    verifyAsync: vi.fn(async (token: string) => {
      if (token === 'candidate-access-token') {
        return { sub: 'candidate-1', role: UserRole.CANDIDATE };
      }
      if (token === 'admin-access-token') {
        return { sub: 'admin-1', role: UserRole.ADMIN };
      }
      throw new Error('Invalid token');
    }),
  };
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MessagesController, NotificationsController],
      providers: [
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: MessagesService, useValue: messages },
        { provide: NotificationsService, useValue: notifications },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires an access token for message endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/messages/conversations')
      .expect(401);
    expect(messages.listConversations).not.toHaveBeenCalled();
  });

  it('allows an authenticated candidate to list conversations with pagination', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/messages/conversations?page=1&limit=20')
      .set('Authorization', 'Bearer candidate-access-token')
      .expect(200)
      .expect(({ body }) => {
        expect(body.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        });
      });

    expect(messages.listConversations).toHaveBeenCalledWith(
      'candidate-1',
      UserRole.CANDIDATE,
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('does not grant administrators access to message routes by role alone', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/messages/conversations')
      .set('Authorization', 'Bearer admin-access-token')
      .expect(403);
    expect(messages.listConversations).not.toHaveBeenCalledWith(
      'admin-1',
      UserRole.ADMIN,
      expect.anything(),
    );
  });

  it('rejects invalid client message ids before calling the service', async () => {
    await request(app.getHttpServer())
      .post(
        '/api/v1/messages/conversations/7d3b1b5b-65c8-4ed8-bd71-535f91f6e3d2/messages',
      )
      .set('Authorization', 'Bearer candidate-access-token')
      .send({ body: 'Hello', clientMessageId: 'not-a-uuid' })
      .expect(400);
    expect(messages.sendMessage).not.toHaveBeenCalled();
  });

  it('returns only the authenticated user’s notification list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications?unreadOnly=true')
      .set('Authorization', 'Bearer candidate-access-token')
      .expect(200);
    expect(notifications.list).toHaveBeenCalledWith(
      'candidate-1',
      expect.objectContaining({ unreadOnly: true }),
    );
  });
});
