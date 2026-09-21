import { describe, expect, it, vi } from 'vitest';
import { CandidateService } from './candidate.service.js';

describe('CandidateService', () => {
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
