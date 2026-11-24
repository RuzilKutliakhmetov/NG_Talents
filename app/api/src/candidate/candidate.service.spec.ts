import { describe, expect, it, vi } from 'vitest';
import { CandidateService } from './candidate.service.js';

describe('CandidateService', () => {
  it('creates a candidate profile for the current user', async () => {
    const prisma = {
      candidateProfile: {
        create: vi
          .fn()
          .mockResolvedValue({ id: 'profile-id', userId: 'user-id' }),
      },
    };
    const service = new CandidateService(prisma as never);

    await service.createProfile('user-id', {
      readyForShiftWork: true,
      about: 'Looking for a role',
    });

    expect(prisma.candidateProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        readyForShift: true,
        readyForShiftWork: true,
        about: 'Looking for a role',
      },
    });
  });

  it('returns the current profile or creates an empty one for existing candidates', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi
          .fn()
          .mockResolvedValueOnce({ id: 'profile-id', userId: 'user-id' })
          .mockResolvedValueOnce({ id: 'new-profile-id', userId: 'user-2' }),
      },
    };
    const service = new CandidateService(prisma as never);

    await expect(service.getProfile('user-id')).resolves.toMatchObject({
      id: 'profile-id',
      userId: 'user-id',
    });
    await expect(service.getProfile('user-2')).resolves.toMatchObject({
      id: 'new-profile-id',
      userId: 'user-2',
    });
    expect(prisma.candidateProfile.upsert).toHaveBeenLastCalledWith({
      where: { userId: 'user-2' },
      create: { userId: 'user-2' },
      update: {},
      include: {
        experiences: { orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }] },
        educations: { orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }] },
        certifications: { orderBy: { expiresAt: 'asc' } },
        languages: { orderBy: { sortOrder: 'asc' } },
        portfolioLinks: { orderBy: { sortOrder: 'asc' } },
      },
    });
  });

  it('updates only the current user profile', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue({ id: 'profile-id' }),
        update: vi.fn().mockResolvedValue({
          id: 'profile-id',
          readyForShiftWork: false,
        }),
      },
    };
    const service = new CandidateService(prisma as never);

    await service.updateProfile('user-id', {
      readyForShiftWork: false,
    });

    expect(prisma.candidateProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-id' },
      data: {
        readyForShift: false,
        readyForShiftWork: false,
      },
    });
  });

  it('replaces only the profile sections included in the request', async () => {
    const tx = {
      candidateProfileLanguage: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      candidateProfilePortfolioLink: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    };
    const profile = {
      id: 'profile-id',
      languages: [],
      portfolioLinks: [],
    };
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue(profile),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new CandidateService(prisma as never);

    await service.updateProfileSections('user-id', {
      languages: [{ name: 'English', level: 'B2' }],
    });

    expect(tx.candidateProfileLanguage.deleteMany).toHaveBeenCalledWith({
      where: { candidateProfileId: 'profile-id' },
    });
    expect(tx.candidateProfileLanguage.createMany).toHaveBeenCalledWith({
      data: [
        {
          candidateProfileId: 'profile-id',
          name: 'English',
          level: 'B2',
          sortOrder: 0,
        },
      ],
    });
    expect(tx.candidateProfilePortfolioLink.deleteMany).not.toHaveBeenCalled();
  });

  it('saves profile fields and all supplied sections in one transaction', async () => {
    const tx = {
      candidateProfile: {
        update: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-id' }),
      },
      candidateProfileLanguage: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    };
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue({ id: 'profile-id' }),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new CandidateService(prisma as never);

    await service.updateProfile('user-id', {
      about: 'Updated profile',
      languages: [{ name: 'English', level: 'B2' }],
    });

    expect(tx.candidateProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-id' },
      data: { about: 'Updated profile' },
    });
    expect(tx.candidateProfileLanguage.createMany).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('rejects education periods where the end date is before the start date', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue({ id: 'profile-id' }),
      },
      $transaction: vi.fn(),
    };
    const service = new CandidateService(prisma as never);

    await expect(
      service.updateProfileSections('user-id', {
        educations: [
          {
            institution: 'University',
            specialization: 'Engineering',
            startDate: '2024-09-01',
            endDate: '2024-06-30',
          },
        ],
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'INVALID_EDUCATION_DATES',
      },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects completed education without an end date', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue({ id: 'profile-id' }),
      },
      $transaction: vi.fn(),
    };
    const service = new CandidateService(prisma as never);

    await expect(
      service.updateProfileSections('user-id', {
        educations: [
          {
            institution: 'University',
            specialization: 'Engineering',
            startDate: '2024-09-01',
            isIncomplete: false,
          },
        ],
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'INCOMPLETE_COMPLETED_EDUCATION',
      },
    });
  });

  it('rejects duplicate profile language names before changing data', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue({ id: 'profile-id' }),
      },
      $transaction: vi.fn(),
    };
    const service = new CandidateService(prisma as never);

    await expect(
      service.updateProfileSections('user-id', {
        languages: [
          { name: 'English', level: 'B2' },
          { name: ' english ', level: 'C1' },
        ],
      }),
    ).rejects.toMatchObject({
      response: { message: 'Duplicate language names are not allowed' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates current experience without an end date', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue({ id: 'profile-id' }),
      },
      candidateExperience: {
        create: vi.fn().mockResolvedValue({
          id: 'experience-id',
          isCurrent: true,
          endDate: null,
        }),
      },
    };
    const service = new CandidateService(prisma as never);
    await service.createExperience('user-id', {
      companyName: 'Company',
      position: 'Operator',
      startDate: '2025-01-01',
      isCurrent: true,
    });
    expect(prisma.candidateExperience.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ endDate: undefined, isCurrent: true }),
      }),
    );
  });

  it('rejects an experience marked current with an end date', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue({ id: 'profile-id' }),
      },
    };
    const service = new CandidateService(prisma as never);
    await expect(
      service.createExperience('user-id', {
        companyName: 'Company',
        position: 'Operator',
        startDate: '2025-01-01',
        endDate: '2025-02-01',
        isCurrent: true,
      }),
    ).rejects.toMatchObject({
      response: { message: 'Current experience must not have endDate' },
    });
  });
});
