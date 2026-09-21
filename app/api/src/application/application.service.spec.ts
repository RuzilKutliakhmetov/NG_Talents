import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  ApplicationStatus,
  UserRole,
  VacancyStatus,
} from '../generated/prisma/client.js';
import { ApplicationService } from './application.service.js';

describe('ApplicationService', () => {
  it('creates a candidate application and records initial history', async () => {
    const tx = {
      application: {
        create: vi.fn().mockResolvedValue({
          id: 'app-1',
          vacancyId: 'vacancy-1',
          candidateId: 'user-1',
          status: ApplicationStatus.NEW,
          coverLetter: 'hello',
          candidateComment: 'comment',
        }),
      },
      applicationStatusHistory: {
        create: vi.fn().mockResolvedValue({ id: 'history-1' }),
      },
    };

    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'user-1', role: UserRole.CANDIDATE }),
      },
      vacancy: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'vacancy-1',
          status: VacancyStatus.PUBLISHED,
        }),
      },
      application: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
    };

    const service = new ApplicationService(prisma as never);
    const result = await service.createApplication(
      'user-1',
      UserRole.CANDIDATE,
      {
        vacancyId: 'vacancy-1',
        coverLetter: 'hello',
        candidateComment: 'comment',
      },
    );

    expect(result).toMatchObject({
      id: 'app-1',
      status: ApplicationStatus.NEW,
    });
    expect(tx.applicationStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-1',
        actorRole: UserRole.CANDIDATE,
        fromStatus: null,
        toStatus: ApplicationStatus.NEW,
      }),
    });
  });

  it('creates an application with an owned resume', async () => {
    const tx = {
      application: {
        create: vi
          .fn()
          .mockResolvedValue({ id: 'app-1', resumeId: 'resume-1' }),
      },
      applicationStatusHistory: { create: vi.fn() },
    };
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'user-1', role: UserRole.CANDIDATE }),
      },
      vacancy: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'vacancy-1',
          status: VacancyStatus.PUBLISHED,
        }),
      },
      resume: {
        findFirst: vi.fn().mockResolvedValue({ id: 'resume-1' }),
      },
      application: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
    };
    const service = new ApplicationService(prisma as never);

    await service.createApplication('user-1', UserRole.CANDIDATE, {
      vacancyId: 'vacancy-1',
      resumeId: 'resume-1',
    });

    expect(prisma.resume.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'resume-1',
        userId: 'user-1',
        candidateProfile: { userId: 'user-1' },
      },
      select: { id: true },
    });
    expect(tx.application.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ resumeId: 'resume-1' }),
    });
  });

  it('rejects an application with another candidate resume', async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'user-1', role: UserRole.CANDIDATE }),
      },
      vacancy: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'vacancy-1',
          status: VacancyStatus.PUBLISHED,
        }),
      },
      resume: { findFirst: vi.fn().mockResolvedValue(null) },
      application: { findFirst: vi.fn() },
    };
    const service = new ApplicationService(prisma as never);

    await expect(
      service.createApplication('user-1', UserRole.CANDIDATE, {
        vacancyId: 'vacancy-1',
        resumeId: 'resume-2',
      }),
    ).rejects.toMatchObject({ response: { code: 'RESUME_NOT_FOUND' } });
    expect(prisma.application.findFirst).not.toHaveBeenCalled();
  });

  it('rejects non-candidates from creating applications', async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'user-1', role: UserRole.EMPLOYER }),
      },
    };
    const service = new ApplicationService(prisma as never);

    await expect(
      service.createApplication('user-1', UserRole.EMPLOYER, {
        vacancyId: 'vacancy-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enforces valid status transitions', async () => {
    const service = new ApplicationService({} as never);

    expect(
      service.validateStatusTransition(
        ApplicationStatus.NEW,
        ApplicationStatus.VIEWED,
      ),
    ).toBe(true);
    expect(
      service.validateStatusTransition(
        ApplicationStatus.NEW,
        ApplicationStatus.HIRED,
      ),
    ).toBe(false);
    expect(
      service.validateStatusTransition(
        ApplicationStatus.REJECTED,
        ApplicationStatus.INTERVIEW,
      ),
    ).toBe(false);
    expect(
      service.validateStatusTransition(
        ApplicationStatus.OFFER,
        ApplicationStatus.HIRED,
      ),
    ).toBe(true);
  });

  it('prevents employer access to another employer application', async () => {
    const prisma = {
      application: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'app-1',
          vacancyId: 'vacancy-1',
          vacancy: { employerId: 'employer-2' },
        }),
      },
      employerMember: {
        findUnique: vi.fn().mockResolvedValue({
          employerId: 'employer-1',
          userId: 'user-1',
          memberRole: 'OWNER',
        }),
      },
    };

    const service = new ApplicationService(prisma as never);
    await expect(
      service.getEmployerApplication(
        'user-1',
        UserRole.EMPLOYER,
        'employer-1',
        'app-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
