import { describe, expect, it, vi } from 'vitest';
import {
  EmployerMemberRole,
  VacancyModerationAction,
  UserRole,
  VacancyStatus,
} from '../generated/prisma/client.js';
import { VacancyService } from './vacancy.service.js';

const baseDto = {
  title: 'Оператор установки',
  description: 'Работа на производстве',
  employmentType: 'SHIFT' as const,
  locationRegion: 'BASHKORTOSTAN' as const,
  requirementsList: [{ text: 'Опыт работы от 3 лет', isRequired: true }],
  certifications: [{ type: 'NAKS' as const, name: 'НАКС' }],
};

function employerMemberMock() {
  return {
    findUnique: vi
      .fn()
      .mockResolvedValue({ memberRole: EmployerMemberRole.OWNER }),
  };
}

describe('VacancyService', () => {
  function moderationTransactionMock(
    current: VacancyStatus,
    next: VacancyStatus,
  ) {
    const tx = {
      vacancy: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'vacancy-id', status: current }),
        update: vi.fn().mockResolvedValue({ id: 'vacancy-id', status: next }),
      },
      vacancyModerationAudit: {
        create: vi.fn().mockResolvedValue({ id: 'audit-id' }),
      },
    };
    return {
      employerMember: employerMemberMock(),
      vacancy: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'vacancy-id', status: current }),
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'vacancy-id', status: current }),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      tx,
    };
  }

  it('creates a vacancy with requirements and certifications transactionally', async () => {
    const created = { id: 'vacancy-id', status: VacancyStatus.DRAFT };
    const tx = {
      vacancy: { create: vi.fn().mockResolvedValue(created) },
    };
    const prisma = {
      employerMember: employerMemberMock(),
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new VacancyService(prisma as never);

    const result = await service.create(
      'user-id',
      UserRole.EMPLOYER,
      'employer-id',
      baseDto,
    );

    expect(result).toEqual(created);
    expect(tx.vacancy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employer: { connect: { id: 'employer-id' } },
          createdBy: { connect: { id: 'user-id' } },
          requirements: {
            create: [
              {
                type: 'OTHER',
                name: 'Опыт работы от 3 лет',
                required: true,
                sortOrder: 0,
              },
            ],
          },
          certifications: {
            create: [{ type: 'NAKS', name: 'НАКС', required: true }],
          },
        }),
      }),
    );
  });

  it('rejects invalid salary range before database writes', async () => {
    const prisma = {
      employerMember: employerMemberMock(),
      $transaction: vi.fn(),
    };
    const service = new VacancyService(prisma as never);
    await expect(
      service.create('user-id', UserRole.EMPLOYER, 'employer-id', {
        ...baseDto,
        salaryMin: 200000,
        salaryMax: 100000,
      }),
    ).rejects.toMatchObject({
      response: { message: 'salaryMin must not exceed salaryMax' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires employer membership for vacancy management', async () => {
    const prisma = {
      employerMember: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const service = new VacancyService(prisma as never);
    await expect(
      service.submit(
        'user-id',
        UserRole.EMPLOYER,
        'other-employer',
        'vacancy-id',
      ),
    ).rejects.toMatchObject({ response: { code: 'EMPLOYER_ACCESS_DENIED' } });
  });

  it.each([
    [VacancyStatus.DRAFT, VacancyStatus.PENDING_MODERATION],
    [VacancyStatus.PUBLISHED, VacancyStatus.PAUSED],
    [VacancyStatus.PAUSED, VacancyStatus.PUBLISHED],
    [VacancyStatus.PAUSED, VacancyStatus.CLOSED],
    [VacancyStatus.CLOSED, VacancyStatus.ARCHIVED],
  ])('supports lifecycle transition %s -> %s', async (current, next) => {
    const prisma = {
      employerMember: employerMemberMock(),
      vacancy: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'vacancy-id', status: current }),
        update: vi.fn().mockResolvedValue({ id: 'vacancy-id', status: next }),
      },
    };
    const service = new VacancyService(prisma as never);
    const method =
      next === VacancyStatus.PENDING_MODERATION
        ? 'submit'
        : next === VacancyStatus.PAUSED
          ? 'pause'
          : next === VacancyStatus.PUBLISHED
            ? 'resume'
            : next === VacancyStatus.CLOSED
              ? 'close'
              : 'archive';
    const result = await service[method](
      'user-id',
      UserRole.EMPLOYER,
      'employer-id',
      'vacancy-id',
    );
    expect(result).toEqual({ id: 'vacancy-id', status: next });
  });

  it('rejects an invalid lifecycle transition', async () => {
    const prisma = {
      employerMember: employerMemberMock(),
      vacancy: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'vacancy-id', status: VacancyStatus.DRAFT }),
      },
    };
    const service = new VacancyService(prisma as never);
    await expect(
      service.pause('user-id', UserRole.EMPLOYER, 'employer-id', 'vacancy-id'),
    ).rejects.toMatchObject({
      response: { code: 'VACANCY_INVALID_STATUS_TRANSITION' },
    });
  });

  it.each([
    [VacancyStatus.PENDING_MODERATION, VacancyStatus.MODERATION],
    [VacancyStatus.MODERATION, VacancyStatus.PUBLISHED],
    [VacancyStatus.MODERATION, VacancyStatus.REJECTED],
    [VacancyStatus.REJECTED, VacancyStatus.PENDING_MODERATION],
  ])('supports moderation transition %s -> %s', async (current, next) => {
    const prisma = moderationTransactionMock(current, next);
    const service = new VacancyService(prisma as never);
    const result =
      next === VacancyStatus.MODERATION
        ? await service.startModeration(
            'moderator-id',
            UserRole.MODERATOR,
            'vacancy-id',
          )
        : next === VacancyStatus.PUBLISHED
          ? await service.approve(
              'moderator-id',
              UserRole.MODERATOR,
              'vacancy-id',
            )
          : next === VacancyStatus.REJECTED
            ? await service.reject(
                'moderator-id',
                UserRole.MODERATOR,
                'vacancy-id',
                {
                  comment: 'Не хватает документов',
                },
              )
            : await service.submit(
                'user-id',
                UserRole.EMPLOYER,
                'employer-id',
                'vacancy-id',
              );
    expect(result).toEqual({ id: 'vacancy-id', status: next });
    const expectedAction =
      next === VacancyStatus.MODERATION
        ? VacancyModerationAction.START_MODERATION
        : next === VacancyStatus.PUBLISHED
          ? VacancyModerationAction.APPROVE
          : next === VacancyStatus.REJECTED
            ? VacancyModerationAction.REJECT
            : VacancyModerationAction.RESUBMIT;
    expect(prisma.tx.vacancyModerationAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId:
          expectedAction === VacancyModerationAction.RESUBMIT
            ? 'user-id'
            : 'moderator-id',
        action: expectedAction,
        fromStatus: current,
        toStatus: next,
      }),
    });
  });

  it('keeps status and audit in one transaction when audit creation fails', async () => {
    const prisma = moderationTransactionMock(
      VacancyStatus.MODERATION,
      VacancyStatus.PUBLISHED,
    );
    prisma.tx.vacancyModerationAudit.create.mockRejectedValue(
      new Error('audit unavailable'),
    );
    const service = new VacancyService(prisma as never);

    await expect(
      service.approve('moderator-id', UserRole.MODERATOR, 'vacancy-id'),
    ).rejects.toThrow('audit unavailable');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns a paginated safe audit response', async () => {
    const prisma = {
      vacancyModerationAudit: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'audit-id',
            action: 'REJECT',
            fromStatus: 'MODERATION',
            toStatus: 'REJECTED',
            comment: 'Причина',
            actor: { id: 'moderator-id', role: 'MODERATOR' },
            createdAt: new Date(),
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
      $transaction: vi.fn().mockResolvedValue([
        [
          {
            id: 'audit-id',
            action: 'REJECT',
            fromStatus: 'MODERATION',
            toStatus: 'REJECTED',
            comment: 'Причина',
            actor: { id: 'moderator-id', role: 'MODERATOR' },
            createdAt: new Date(),
          },
        ],
        1,
      ]),
    };
    const service = new VacancyService(prisma as never);
    const result = await service.listModerationAudit('vacancy-id', 1, 20);

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        action: 'REJECT',
        actor: { id: 'moderator-id', role: 'MODERATOR' },
      }),
    );
    expect(result.items[0]).not.toHaveProperty('passwordHash');
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });
});
