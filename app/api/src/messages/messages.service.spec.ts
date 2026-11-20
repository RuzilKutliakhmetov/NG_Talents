import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  ApplicationStatus,
  NotificationType,
  UserRole,
  UserStatus,
} from '../generated/prisma/client.js';
import { ConversationListQueryDto } from './dto/conversation-list-query.dto.js';
import { MessagesService } from './messages.service.js';

function applicationConversation(candidateId = 'candidate-1') {
  return {
    id: 'conversation-1',
    applicationId: 'application-1',
    updatedAt: new Date(),
    application: {
      id: 'application-1',
      status: ApplicationStatus.NEW,
      candidateId,
      candidate: {
        id: candidateId,
        firstName: 'Алексей',
        lastName: 'Кандидатов',
      },
      vacancy: {
        id: 'vacancy-1',
        title: 'Оператор',
        employerId: 'employer-1',
        employer: {
          id: 'employer-1',
          legalName: 'Работодатель',
          shortName: 'Компания',
        },
      },
    },
  };
}

function notificationsMock() {
  return { enqueue: vi.fn().mockResolvedValue(undefined) };
}

function realtimeMock() {
  return { emitToUser: vi.fn() };
}

describe('MessagesService', () => {
  it('does not disclose a conversation to a different candidate', async () => {
    const conversation = vi.fn().mockResolvedValue(applicationConversation());
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'candidate-2',
          role: UserRole.CANDIDATE,
          status: UserStatus.ACTIVE,
        }),
      },
      conversation: { findUnique: conversation },
      employerMember: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new MessagesService(
      prisma as never,
      notificationsMock() as never,
      realtimeMock() as never,
    );

    await expect(
      service.getConversation(
        'candidate-2',
        UserRole.CANDIDATE,
        'conversation-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not disclose a conversation to a member of another employer', async () => {
    const membershipFindMany = vi.fn(
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.userId === 'employer-user-1') {
          return Promise.resolve([{ employerId: 'other-employer' }]);
        }
        return Promise.resolve([{ userId: 'employer-user-2' }]);
      },
    );
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'employer-user-1',
          role: UserRole.EMPLOYER,
          status: UserStatus.ACTIVE,
        }),
      },
      employerMember: { findMany: membershipFindMany },
      conversation: {
        findUnique: vi.fn().mockResolvedValue(applicationConversation()),
      },
    };
    const service = new MessagesService(
      prisma as never,
      notificationsMock() as never,
      realtimeMock() as never,
    );

    await expect(
      service.getConversation(
        'employer-user-1',
        UserRole.EMPLOYER,
        'conversation-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('denies moderator access even when the role has other privileged permissions', async () => {
    const userFindUnique = vi.fn();
    const conversationFindUnique = vi.fn();
    const prisma = {
      user: { findUnique: userFindUnique },
      conversation: { findUnique: conversationFindUnique },
    };
    const service = new MessagesService(
      prisma as never,
      notificationsMock() as never,
      realtimeMock() as never,
    );

    await expect(
      service.listConversations(
        'moderator-1',
        UserRole.MODERATOR,
        new ConversationListQueryDto(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userFindUnique).toHaveBeenCalledWith({
      where: { id: 'moderator-1' },
      select: { id: true, role: true, status: true },
    });
    expect(conversationFindUnique).not.toHaveBeenCalled();
  });

  it('returns a previously accepted message when the same idempotency key is retried', async () => {
    const existing = {
      id: 'message-1',
      body: 'Здравствуйте',
      sender: { id: 'candidate-1' },
    };
    const messageFindUnique = vi.fn().mockResolvedValue(existing);
    const transaction = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'candidate-1',
          role: UserRole.CANDIDATE,
          status: UserStatus.ACTIVE,
        }),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue(applicationConversation()),
      },
      employerMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: 'employer-1' }]),
      },
      message: { findUnique: messageFindUnique },
      $transaction: transaction,
    };
    const service = new MessagesService(
      prisma as never,
      notificationsMock() as never,
      realtimeMock() as never,
    );

    const result = await service.sendMessage(
      'candidate-1',
      UserRole.CANDIDATE,
      'conversation-1',
      {
        body: 'Здравствуйте',
        clientMessageId: 'f53d9dad-0ee1-4fa2-9004-08e152aad14e',
      },
    );

    expect(result).toBe(existing);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key with different content', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'candidate-1',
          role: UserRole.CANDIDATE,
          status: UserStatus.ACTIVE,
        }),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue(applicationConversation()),
      },
      employerMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: 'employer-1' }]),
      },
      message: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'message-1',
          body: 'Original',
          sender: { id: 'candidate-1' },
        }),
      },
    };
    const service = new MessagesService(
      prisma as never,
      notificationsMock() as never,
      realtimeMock() as never,
    );

    await expect(
      service.sendMessage('candidate-1', UserRole.CANDIDATE, 'conversation-1', {
        body: 'Different content',
        clientMessageId: 'f53d9dad-0ee1-4fa2-9004-08e152aad14e',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects whitespace-only message bodies', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'candidate-1',
          role: UserRole.CANDIDATE,
          status: UserStatus.ACTIVE,
        }),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue(applicationConversation()),
      },
      employerMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: 'employer-1' }]),
      },
      message: { findUnique },
    };
    const service = new MessagesService(
      prisma as never,
      notificationsMock() as never,
      realtimeMock() as never,
    );

    await expect(
      service.sendMessage('candidate-1', UserRole.CANDIDATE, 'conversation-1', {
        body: '   ',
        clientMessageId: 'f53d9dad-0ee1-4fa2-9004-08e152aad14e',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('persists a new message and queues notifications for the other participants', async () => {
    const created = {
      id: 'message-1',
      conversationId: 'conversation-1',
      senderId: 'candidate-1',
      body: 'Здравствуйте',
      sender: { id: 'candidate-1', role: UserRole.CANDIDATE },
      readAt: null,
      createdAt: new Date(),
    };
    const tx = {
      message: { create: vi.fn().mockResolvedValue(created) },
      conversation: { update: vi.fn().mockResolvedValue({}) },
    };
    const notifications = notificationsMock();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'candidate-1',
          role: UserRole.CANDIDATE,
          status: UserStatus.ACTIVE,
        }),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue(applicationConversation()),
      },
      employerMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: 'employer-1' }]),
      },
      message: {
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new MessagesService(
      prisma as never,
      notifications as never,
      realtimeMock() as never,
    );

    const result = await service.sendMessage(
      'candidate-1',
      UserRole.CANDIDATE,
      'conversation-1',
      {
        body: ' Здравствуйте ',
        clientMessageId: 'f53d9dad-0ee1-4fa2-9004-08e152aad14e',
      },
    );

    expect(result).toBe(created);
    expect(tx.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: 'Здравствуйте',
          senderId: 'candidate-1',
        }),
      }),
    );
    expect(notifications.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userIds: ['employer-1'],
        type: NotificationType.NEW_MESSAGE,
      }),
    );
  });

  it('marks only incoming messages in an accessible conversation as read', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const realtime = realtimeMock();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'candidate-1',
          role: UserRole.CANDIDATE,
          status: UserStatus.ACTIVE,
        }),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue(applicationConversation()),
      },
      employerMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: 'employer-1' }]),
      },
      message: { updateMany, count: vi.fn().mockResolvedValue(0) },
    };
    const service = new MessagesService(
      prisma as never,
      notificationsMock() as never,
      realtime as never,
    );

    const result = await service.markRead(
      'candidate-1',
      UserRole.CANDIDATE,
      'conversation-1',
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        conversationId: 'conversation-1',
        senderId: { not: 'candidate-1' },
        readAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
    expect(result).toEqual({ updated: 2, unreadCount: 0 });
    expect(realtime.emitToUser).toHaveBeenCalledWith(
      'employer-1',
      'messages:read',
      expect.objectContaining({ readerId: 'candidate-1', updated: 2 }),
    );
  });
});
