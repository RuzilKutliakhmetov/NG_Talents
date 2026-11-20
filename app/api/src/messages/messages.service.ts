import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployerMemberRole,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
} from '../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { ConversationListQueryDto } from './dto/conversation-list-query.dto.js';
import { MessageHistoryQueryDto } from './dto/message-history-query.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';

const allowedEmployerMemberRoles = [
  EmployerMemberRole.OWNER,
  EmployerMemberRole.ADMIN,
  EmployerMemberRole.HR,
  EmployerMemberRole.RECRUITER,
];

const messageSenderSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} satisfies Prisma.UserSelect;

const conversationListInclude = {
  application: {
    select: {
      id: true,
      status: true,
      candidateId: true,
      candidate: {
        select: { id: true, firstName: true, lastName: true },
      },
      vacancy: {
        select: {
          id: true,
          title: true,
          employerId: true,
          employer: {
            select: { id: true, legalName: true, shortName: true },
          },
        },
      },
    },
  },
  messages: {
    take: 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { sender: { select: messageSenderSelect } },
  },
} satisfies Prisma.ConversationInclude;

const conversationDetailInclude = {
  application: {
    select: {
      id: true,
      status: true,
      candidateId: true,
      candidate: {
        select: { id: true, firstName: true, lastName: true },
      },
      vacancy: {
        select: {
          id: true,
          title: true,
          employerId: true,
          employer: {
            select: { id: true, legalName: true, shortName: true },
          },
        },
      },
    },
  },
} satisfies Prisma.ConversationInclude;

type ActorContext = {
  userId: string;
  role: UserRole;
  employerIds: string[];
  employerMemberIds: string[];
};

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async listConversations(
    userId: string,
    role: UserRole,
    query: ConversationListQueryDto,
  ) {
    const actor = await this.getActorContext(userId, role);
    const where = this.conversationWhere(actor);
    const [conversations, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        where,
        include: conversationListInclude,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const conversationIds = conversations.map(({ id }) => id);
    const unreadGroups = conversationIds.length
      ? await this.prisma.message.groupBy({
          by: ['conversationId'],
          where: {
            conversationId: { in: conversationIds },
            senderId: this.incomingSenderFilter(actor),
            readAt: null,
          },
          _count: { _all: true },
        })
      : [];
    const unreadByConversation = new Map(
      unreadGroups.map((group) => [group.conversationId, group._count._all]),
    );

    return {
      items: conversations.map((conversation) =>
        this.toConversationSummary(
          conversation,
          actor.role,
          unreadByConversation.get(conversation.id) ?? 0,
        ),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getConversation(userId: string, role: UserRole, id: string) {
    const { conversation, actor } = await this.assertConversationAccess(
      userId,
      role,
      id,
    );
    return this.toConversationDetail(conversation, actor.role);
  }

  async getMessages(
    userId: string,
    role: UserRole,
    conversationId: string,
    query: MessageHistoryQueryDto,
  ) {
    await this.assertConversationAccess(userId, role, conversationId);
    const where = { conversationId };
    const [descendingItems, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        include: { sender: { select: messageSenderSelect } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      items: descendingItems.reverse(),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async sendMessage(
    userId: string,
    role: UserRole,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const { conversation, participantIds, application } =
      await this.assertConversationAccess(userId, role, conversationId);
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException({
        code: 'MESSAGE_EMPTY',
        message: 'Message cannot be empty',
      });
    }

    const uniqueWhere = {
      conversationId_senderId_clientMessageId: {
        conversationId,
        senderId: userId,
        clientMessageId: dto.clientMessageId,
      },
    };
    const existing = await this.prisma.message.findUnique({
      where: uniqueWhere,
      include: { sender: { select: messageSenderSelect } },
    });
    if (existing) return this.returnExisting(existing, body);

    let message: Prisma.MessageGetPayload<{
      include: { sender: { select: typeof messageSenderSelect } };
    }>;
    try {
      message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.message.create({
          data: {
            conversationId,
            senderId: userId,
            clientMessageId: dto.clientMessageId,
            body,
          },
          include: { sender: { select: messageSenderSelect } },
        });
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        await this.notifications.enqueue(tx, {
          eventKey: `message-created:${created.id}`,
          userIds: participantIds.filter(
            (participantId) => participantId !== userId,
          ),
          type: NotificationType.NEW_MESSAGE,
          title: 'Новое сообщение',
          message: `Вам пришло сообщение по отклику на вакансию «${application.vacancy.title}».`,
          data: {
            entityType: 'conversation',
            entityId: conversation.id,
            applicationId: application.id,
          },
        });
        return created;
      });
    } catch (error) {
      if (this.isUniqueError(error)) {
        const duplicate = await this.prisma.message.findUnique({
          where: uniqueWhere,
          include: { sender: { select: messageSenderSelect } },
        });
        if (duplicate) return this.returnExisting(duplicate, body);
      }
      throw error;
    }

    await this.emitMessageToParticipants(
      participantIds,
      message,
      conversationId,
    );
    return message;
  }

  async unreadCount(userId: string, role: UserRole) {
    const actor = await this.getActorContext(userId, role);
    const count = await this.prisma.message.count({
      where: {
        conversation: {
          is: { application: { is: this.applicationWhere(actor) } },
        },
        senderId: this.incomingSenderFilter(actor),
        readAt: null,
      },
    });
    return { count };
  }

  async markRead(userId: string, role: UserRole, conversationId: string) {
    const { actor, participantIds } = await this.assertConversationAccess(
      userId,
      role,
      conversationId,
    );
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: this.incomingSenderFilter(actor),
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    const unread = await this.unreadCount(userId, role);
    this.realtime.emitToUser(userId, 'messages:unread_count', unread);
    for (const participantId of participantIds) {
      if (participantId !== userId) {
        try {
          this.realtime.emitToUser(participantId, 'messages:read', {
            conversationId,
            readerId: userId,
            updated: result.count,
          });
        } catch (error) {
          this.logger.warn(
            `Read receipt for conversation ${conversationId} could not be pushed to participant ${participantId}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }
    return { updated: result.count, unreadCount: unread.count };
  }

  private async getActorContext(
    userId: string,
    role: UserRole,
  ): Promise<ActorContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      user.role !== role ||
      (role !== UserRole.CANDIDATE && role !== UserRole.EMPLOYER)
    ) {
      throw new ForbiddenException({
        code: 'MESSAGES_ACCESS_DENIED',
        message: 'Messaging access denied',
      });
    }

    if (role === UserRole.CANDIDATE) {
      return {
        userId,
        role,
        employerIds: [],
        employerMemberIds: [],
      };
    }

    const memberships = await this.prisma.employerMember.findMany({
      where: {
        userId,
        memberRole: { in: allowedEmployerMemberRoles },
      },
      select: { employerId: true },
    });
    const employerIds = [
      ...new Set(memberships.map(({ employerId }) => employerId)),
    ];
    if (employerIds.length === 0) {
      return { userId, role, employerIds, employerMemberIds: [] };
    }
    const teamMembers = await this.prisma.employerMember.findMany({
      where: {
        employerId: { in: employerIds },
        memberRole: { in: allowedEmployerMemberRoles },
      },
      select: { userId: true },
    });
    return {
      userId,
      role,
      employerIds,
      employerMemberIds: [...new Set(teamMembers.map(({ userId: id }) => id))],
    };
  }

  private async assertConversationAccess(
    userId: string,
    role: UserRole,
    conversationId: string,
  ) {
    const actor = await this.getActorContext(userId, role);
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationDetailInclude,
    });
    if (!conversation) throw this.conversationNotFound();

    const { application } = conversation;
    const employerId = application.vacancy.employerId;
    const members = await this.prisma.employerMember.findMany({
      where: {
        employerId,
        memberRole: { in: allowedEmployerMemberRoles },
      },
      select: { userId: true },
    });
    const employerMemberIds = members.map(({ userId: id }) => id);
    const isCandidate =
      actor.role === UserRole.CANDIDATE && application.candidateId === userId;
    const isEmployerMember =
      actor.role === UserRole.EMPLOYER &&
      actor.employerIds.includes(employerId) &&
      employerMemberIds.includes(userId);
    if (!isCandidate && !isEmployerMember) {
      throw this.conversationNotFound();
    }

    return {
      conversation,
      actor: {
        ...actor,
        employerMemberIds:
          actor.role === UserRole.EMPLOYER
            ? employerMemberIds
            : actor.employerMemberIds,
      },
      application,
      participantIds: [
        ...new Set([application.candidateId, ...employerMemberIds]),
      ],
    };
  }

  private async emitMessageToParticipants(
    participantIds: string[],
    message: Prisma.MessageGetPayload<{
      include: { sender: { select: typeof messageSenderSelect } };
    }>,
    conversationId: string,
  ) {
    for (const participantId of participantIds) {
      try {
        const participant = await this.prisma.user.findUnique({
          where: { id: participantId },
          select: { role: true, status: true },
        });
        if (!participant || participant.status !== UserStatus.ACTIVE) continue;
        const unread = await this.unreadCount(participantId, participant.role);
        this.realtime.emitToUser(participantId, 'messages:new', {
          conversationId,
          message,
        });
        this.realtime.emitToUser(
          participantId,
          'messages:unread_count',
          unread,
        );
      } catch (error) {
        this.logger.warn(
          `Message ${message.id} was persisted but could not be pushed to participant ${participantId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private toConversationSummary(
    conversation: Prisma.ConversationGetPayload<{
      include: typeof conversationListInclude;
    }>,
    role: UserRole,
    unreadCount: number,
  ) {
    const application = conversation.application;
    return {
      id: conversation.id,
      applicationId: application.id,
      applicationStatus: application.status,
      vacancyId: application.vacancy.id,
      vacancyTitle: application.vacancy.title,
      otherParticipant: this.otherParticipant(application, role),
      lastMessage: conversation.messages[0] ?? null,
      unreadCount,
      updatedAt: conversation.updatedAt,
    };
  }

  private toConversationDetail(
    conversation: Prisma.ConversationGetPayload<{
      include: typeof conversationDetailInclude;
    }>,
    role: UserRole,
  ) {
    const application = conversation.application;
    return {
      id: conversation.id,
      applicationId: application.id,
      applicationStatus: application.status,
      vacancyId: application.vacancy.id,
      vacancyTitle: application.vacancy.title,
      otherParticipant: this.otherParticipant(application, role),
    };
  }

  private otherParticipant(
    application: Prisma.ConversationGetPayload<{
      include: typeof conversationDetailInclude;
    }>['application'],
    role: UserRole,
  ) {
    if (role === UserRole.CANDIDATE) {
      return {
        id: application.vacancy.employer.id,
        displayName:
          application.vacancy.employer.shortName ??
          application.vacancy.employer.legalName,
        role: UserRole.EMPLOYER,
      };
    }
    const candidateName = [
      application.candidate.firstName,
      application.candidate.lastName,
    ]
      .filter(Boolean)
      .join(' ');
    return {
      id: application.candidate.id,
      displayName: candidateName || 'Кандидат',
      role: UserRole.CANDIDATE,
    };
  }

  private conversationWhere(
    actor: ActorContext,
  ): Prisma.ConversationWhereInput {
    return {
      application: { is: this.applicationWhere(actor) },
    };
  }

  private applicationWhere(actor: ActorContext): Prisma.ApplicationWhereInput {
    return actor.role === UserRole.CANDIDATE
      ? { candidateId: actor.userId }
      : {
          vacancy: {
            is: { employerId: { in: actor.employerIds } },
          },
        };
  }

  private incomingSenderFilter(actor: ActorContext) {
    return actor.role === UserRole.CANDIDATE
      ? { not: actor.userId }
      : { notIn: actor.employerMemberIds };
  }

  private returnExisting(
    existing: Prisma.MessageGetPayload<{
      include: { sender: { select: typeof messageSenderSelect } };
    }>,
    body: string,
  ) {
    if (existing.body !== body) {
      throw new ConflictException({
        code: 'MESSAGE_IDEMPOTENCY_CONFLICT',
        message: 'clientMessageId was already used for a different message',
      });
    }
    return existing;
  }

  private isUniqueError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private conversationNotFound() {
    return new NotFoundException({
      code: 'CONVERSATION_NOT_FOUND',
      message: 'Conversation not found',
    });
  }
}
