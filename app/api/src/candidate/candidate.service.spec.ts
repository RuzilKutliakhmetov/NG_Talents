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
      desiredSalaryMin: 100000,
      desiredSalaryMax: 200000,
      readyForShiftWork: true,
      about: 'Looking for a role',
    });

    expect(prisma.candidateProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        desiredSalaryMin: 100000,
        desiredSalaryMax: 200000,
        readyForShift: true,
        readyForShiftWork: true,
        about: 'Looking for a role',
      },
    });
  });

  it('returns the current candidate profile and rejects missing profile', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: 'profile-id', userId: 'user-id' })
          .mockResolvedValueOnce(null),
      },
    };
    const service = new CandidateService(prisma as never);

    await expect(service.getProfile('user-id')).resolves.toMatchObject({
      id: 'profile-id',
      userId: 'user-id',
    });
    await expect(service.getProfile('user-2')).rejects.toMatchObject({
      response: { code: 'CANDIDATE_PROFILE_NOT_FOUND' },
    });
  });

  it('updates only the current user profile and validates salary ranges', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'profile-id',
          desiredSalaryMin: 100000,
          desiredSalaryMax: 200000,
        }),
        update: vi
          .fn()
          .mockResolvedValue({ id: 'profile-id', desiredSalaryMin: 120000 }),
      },
    };
    const service = new CandidateService(prisma as never);

    await service.updateProfile('user-id', {
      desiredSalaryMin: 120000,
      readyForShiftWork: false,
    });

    expect(prisma.candidateProfile.update).toHaveBeenCalledWith({
      where: { id: 'profile-id' },
      data: {
        desiredSalaryMin: 120000,
        readyForShift: false,
        readyForShiftWork: false,
      },
    });

    await expect(
      service.updateProfile('user-id', {
        desiredSalaryMin: 500000,
        desiredSalaryMax: 250000,
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'desiredSalaryMin must not exceed desiredSalaryMax',
      },
    });
  });

  it('creates current experience without an end date', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-id' }),
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
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-id' }),
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
