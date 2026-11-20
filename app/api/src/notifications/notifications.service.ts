import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
  type NotificationOutbox,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { NotificationListQueryDto } from './dto/notification-list-query.dto.js';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto.js';

interface EnqueueNotification {
  eventKey: string;
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonObject;
}

const notificationSelect = {
  id: true,
  type: true,
  channel: true,
  status: true,
  title: true,
  message: true,
  data: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private processing = false;
  private worker?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  onModuleInit() {
    this.worker = setInterval(() => {
      void this.processOutbox();
    }, 1000);
    this.worker.unref();
  }

  onModuleDestroy() {
    if (this.worker) clearInterval(this.worker);
  }

  async list(userId: string, query: NotificationListQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      channel: NotificationChannel.IN_APP,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        select: notificationSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null, channel: NotificationChannel.IN_APP },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId, channel: NotificationChannel.IN_APP },
      select: { id: true },
    });
    if (!existing) throw this.notFound();

    await this.prisma.notification.updateMany({
      where: {
        id,
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    const [notification, count] = await Promise.all([
      this.prisma.notification.findFirstOrThrow({
        where: { id, userId, channel: NotificationChannel.IN_APP },
        select: notificationSelect,
      }),
      this.unreadCount(userId),
    ]);
    this.realtime.emitToUser(userId, 'notifications:unread_count', count);
    return notification;
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    this.realtime.emitToUser(userId, 'notifications:unread_count', {
      count: 0,
    });
    return { updated: result.count, unreadCount: 0 };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId, channel: NotificationChannel.IN_APP },
    });
    if (result.count === 0) throw this.notFound();
    const count = await this.unreadCount(userId);
    this.realtime.emitToUser(userId, 'notifications:unread_count', count);
  }

  async preferences(userId: string) {
    const saved = await this.prisma.notificationPreference.findMany({
      where: { userId, channel: NotificationChannel.IN_APP },
      select: { type: true, enabled: true },
    });
    const byType = new Map(
      saved.map((preference) => [preference.type, preference.enabled]),
    );
    return Object.values(NotificationType).map((type) => ({
      type,
      channel: NotificationChannel.IN_APP,
      enabled: byType.get(type) ?? true,
    }));
  }

  updatePreference(userId: string, dto: UpdateNotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_type_channel: {
          userId,
          type: dto.type,
          channel: NotificationChannel.IN_APP,
        },
      },
      create: {
        userId,
        type: dto.type,
        channel: NotificationChannel.IN_APP,
        enabled: dto.enabled,
      },
      update: { enabled: dto.enabled },
      select: { type: true, channel: true, enabled: true },
    });
  }

  async enqueue(
    tx: Prisma.TransactionClient,
    notification: EnqueueNotification,
  ) {
    const userIds = [...new Set(notification.userIds)];
    if (userIds.length === 0) return;

    await tx.notificationOutbox.createMany({
      data: userIds.map((userId) => ({
        eventKey: `${notification.eventKey}:${userId}`,
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        ...(notification.data ? { data: notification.data } : {}),
      })),
      skipDuplicates: true,
    });
  }

  async processOutbox() {
    if (this.processing) return;
    this.processing = true;
    try {
      const entries = await this.prisma.notificationOutbox.findMany({
        where: { processedAt: null, availableAt: { lte: new Date() } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 25,
      });
      for (const entry of entries) {
        await this.processEntry(entry);
      }
    } catch (error) {
      this.logger.error(
        'Failed to read the notification outbox',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.processing = false;
    }
  }

  private async processEntry(entry: NotificationOutbox) {
    try {
      const preference = await this.prisma.notificationPreference.findUnique({
        where: {
          userId_type_channel: {
            userId: entry.userId,
            type: entry.type,
            channel: NotificationChannel.IN_APP,
          },
        },
        select: { enabled: true },
      });
      if (preference?.enabled === false) {
        await this.markProcessed(entry.id);
        return;
      }

      const existing = await this.prisma.notification.findUnique({
        where: { eventKey: entry.eventKey },
        select: { id: true },
      });
      if (existing) {
        await this.markProcessed(entry.id);
        return;
      }

      const sentAt = new Date();
      const notification = await this.prisma.notification.create({
        data: {
          eventKey: entry.eventKey,
          userId: entry.userId,
          type: entry.type,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          title: entry.title,
          message: entry.message,
          data:
            entry.data === null
              ? Prisma.JsonNull
              : (entry.data as Prisma.InputJsonValue),
          sentAt,
        },
        select: notificationSelect,
      });
      await this.markProcessed(entry.id);
      try {
        const unreadCount = await this.unreadCount(entry.userId);
        this.realtime.emitToUser(
          entry.userId,
          'notifications:new',
          notification,
        );
        this.realtime.emitToUser(
          entry.userId,
          'notifications:unread_count',
          unreadCount,
        );
      } catch (error) {
        this.logger.warn(
          `Notification ${notification.id} was persisted but could not be pushed in realtime`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        await this.markProcessed(entry.id);
        return;
      }
      const attempts = entry.attempts + 1;
      try {
        await this.prisma.notificationOutbox.update({
          where: { id: entry.id },
          data: {
            attempts,
            availableAt: new Date(
              Date.now() + Math.min(1000 * 2 ** attempts, 300_000),
            ),
            lastError:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : 'Unknown notification processing error',
          },
        });
      } catch (recordError) {
        this.logger.error(
          `Failed to schedule notification outbox retry ${entry.id}`,
          recordError instanceof Error ? recordError.stack : undefined,
        );
      }
      this.logger.error(
        `Notification outbox event ${entry.id} will be retried`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private markProcessed(id: string) {
    return this.prisma.notificationOutbox.update({
      where: { id },
      data: { processedAt: new Date(), lastError: null },
    });
  }

  private notFound() {
    return new NotFoundException({
      code: 'NOTIFICATION_NOT_FOUND',
      message: 'Notification not found',
    });
  }
}
