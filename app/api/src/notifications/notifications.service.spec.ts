import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  NotificationChannel,
  NotificationType,
} from '../generated/prisma/client.js';
import { NotificationListQueryDto } from './dto/notification-list-query.dto.js';
import { NotificationsService } from './notifications.service.js';

function realtimeMock() {
  return { emitToUser: vi.fn() };
}

describe('NotificationsService', () => {
  it('lists only the current user’s in-app notifications with server pagination', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'notice-1' }]);
    const count = vi.fn().mockResolvedValue(21);
    const prisma = {
      notification: { findMany, count },
      $transaction: vi.fn(async (queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };
    const service = new NotificationsService(
      prisma as never,
      realtimeMock() as never,
    );
    const query = Object.assign(new NotificationListQueryDto(), {
      page: 2,
      limit: 10,
      unreadOnly: true,
    });

    const result = await service.list('user-1', query);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          channel: NotificationChannel.IN_APP,
          readAt: null,
        },
        skip: 10,
        take: 10,
      }),
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('does not mark another user’s notification as read', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const updateMany = vi.fn();
    const prisma = {
      notification: { findFirst, updateMany },
    };
    const service = new NotificationsService(
      prisma as never,
      realtimeMock() as never,
    );

    await expect(service.markRead('user-1', 'notice-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'notice-2',
        userId: 'user-1',
        channel: NotificationChannel.IN_APP,
      },
      select: { id: true },
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('persists read state only for the owner and refreshes the unread count', async () => {
    const notification = {
      id: 'notice-1',
      type: NotificationType.NEW_APPLICATION,
      channel: NotificationChannel.IN_APP,
      status: 'SENT',
      title: 'Новый отклик',
      message: 'На вакансию поступил отклик.',
      data: null,
      readAt: new Date(),
      createdAt: new Date(),
    };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const realtime = realtimeMock();
    const prisma = {
      notification: {
        findFirst: vi.fn().mockResolvedValue({ id: 'notice-1' }),
        updateMany,
        findFirstOrThrow: vi.fn().mockResolvedValue(notification),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const service = new NotificationsService(
      prisma as never,
      realtime as never,
    );

    const result = await service.markRead('user-1', 'notice-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'notice-1',
        userId: 'user-1',
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
    expect(result).toBe(notification);
    expect(realtime.emitToUser).toHaveBeenCalledWith(
      'user-1',
      'notifications:unread_count',
      { count: 0 },
    );
  });

  it('marks all of the current user’s in-app notifications read', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 4 });
    const realtime = realtimeMock();
    const service = new NotificationsService(
      { notification: { updateMany } } as never,
      realtime as never,
    );

    const result = await service.markAllRead('user-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
    expect(result).toEqual({ updated: 4, unreadCount: 0 });
  });

  it('exposes only the supported in-app preference channel', async () => {
    const upsert = vi.fn().mockResolvedValue({
      type: NotificationType.NEW_APPLICATION,
      channel: NotificationChannel.IN_APP,
      enabled: false,
    });
    const service = new NotificationsService(
      { notificationPreference: { upsert } } as never,
      realtimeMock() as never,
    );

    await service.updatePreference('user-1', {
      type: NotificationType.NEW_APPLICATION,
      enabled: false,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_channel: {
            userId: 'user-1',
            type: NotificationType.NEW_APPLICATION,
            channel: NotificationChannel.IN_APP,
          },
        },
        create: expect.objectContaining({
          channel: NotificationChannel.IN_APP,
          enabled: false,
        }),
      }),
    );
  });

  it('defaults supported notification preferences to enabled IN_APP only', async () => {
    const service = new NotificationsService(
      {
        notificationPreference: { findMany: vi.fn().mockResolvedValue([]) },
      } as never,
      realtimeMock() as never,
    );

    const result = await service.preferences('user-1');

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((preference) => preference.enabled)).toBe(true);
    expect(
      result.every(
        (preference) => preference.channel === NotificationChannel.IN_APP,
      ),
    ).toBe(true);
  });

  it('queues idempotent outbox events once per distinct recipient', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const service = new NotificationsService(
      {} as never,
      realtimeMock() as never,
    );
    const tx = { notificationOutbox: { createMany } };

    await service.enqueue(tx as never, {
      eventKey: 'application-created:application-1',
      userIds: ['employer-user-1', 'employer-user-1', 'employer-user-2'],
      type: NotificationType.NEW_APPLICATION,
      title: 'Новый отклик',
      message: 'На вакансию поступил отклик.',
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventKey: 'application-created:application-1:employer-user-1',
          userId: 'employer-user-1',
        }),
        expect.objectContaining({
          eventKey: 'application-created:application-1:employer-user-2',
          userId: 'employer-user-2',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('does not recreate a notification when its outbox event is retried', async () => {
    const entry = {
      id: 'outbox-1',
      eventKey: 'application-created:application-1:user-1',
      userId: 'user-1',
      type: NotificationType.NEW_APPLICATION,
      title: 'Новый отклик',
      message: 'На вакансию поступил отклик.',
      data: null,
      attempts: 0,
      availableAt: new Date(),
      processedAt: null,
      lastError: null,
      createdAt: new Date(),
    };
    const notificationCreate = vi.fn();
    const outboxUpdate = vi.fn().mockResolvedValue({});
    const prisma = {
      notificationOutbox: {
        findMany: vi.fn().mockResolvedValue([entry]),
        update: outboxUpdate,
      },
      notificationPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      notification: {
        findUnique: vi.fn().mockResolvedValue({ id: 'notification-1' }),
        create: notificationCreate,
      },
    };
    const service = new NotificationsService(
      prisma as never,
      realtimeMock() as never,
    );

    await service.processOutbox();

    expect(notificationCreate).not.toHaveBeenCalled();
    expect(outboxUpdate).toHaveBeenCalledWith({
      where: { id: 'outbox-1' },
      data: { processedAt: expect.any(Date), lastError: null },
    });
  });
});
