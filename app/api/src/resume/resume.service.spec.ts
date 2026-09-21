import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CreateResumeDto } from './dto/create-resume.dto.js';
import { ResumeService } from './resume.service.js';

const dto: CreateResumeDto = {
  title: '  Resume  ',
  originalName: ' resume.pdf ',
  mimeType: 'application/pdf',
  sizeBytes: 1000,
  storageKey: ' candidates/user-1/resume.pdf ',
};

function profileMock() {
  return { id: 'profile-1', userId: 'user-1' };
}

function resumeMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'resume-1',
    userId: 'user-1',
    candidateProfileId: 'profile-1',
    title: 'Resume',
    originalName: 'resume.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1000,
    storageKey: 'key',
    isPrimary: false,
    ...overrides,
  };
}

describe('ResumeService', () => {
  it('creates metadata using the current user profile', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue(profileMock()),
      },
      resume: { create: vi.fn().mockResolvedValue(resumeMock()) },
    };
    const service = new ResumeService(prisma as never);

    await service.create('user-1', dto);

    expect(prisma.resume.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        candidateProfileId: 'profile-1',
        title: 'Resume',
        originalName: 'resume.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1000,
        storageKey: 'candidates/user-1/resume.pdf',
      },
    });
  });

  it('lists only the current candidate resumes', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue(profileMock()),
      },
      resume: { findMany: vi.fn().mockResolvedValue([resumeMock()]) },
    };
    const service = new ResumeService(prisma as never);

    await service.list('user-1');

    expect(prisma.resume.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', candidateProfileId: 'profile-1' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it('rejects access to another candidate resume', async () => {
    const prisma = {
      resume: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new ResumeService(prisma as never);

    await expect(service.get('user-1', 'resume-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.resume.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'resume-2',
        userId: 'user-1',
        candidateProfile: { userId: 'user-1' },
      },
    });
  });

  it('updates only owned metadata', async () => {
    const prisma = {
      resume: {
        findFirst: vi.fn().mockResolvedValue(resumeMock()),
        update: vi.fn().mockResolvedValue(resumeMock({ title: 'Updated' })),
      },
    };
    const service = new ResumeService(prisma as never);

    await service.update('user-1', 'resume-1', { title: ' Updated ' });

    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: 'resume-1' },
      data: { title: 'Updated' },
    });
  });

  it('does not update another candidate resume', async () => {
    const prisma = {
      resume: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const service = new ResumeService(prisma as never);

    await expect(
      service.update('user-1', 'resume-2', { title: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.resume.update).not.toHaveBeenCalled();
  });

  it('deletes only owned resume metadata', async () => {
    const prisma = {
      resume: {
        findFirst: vi.fn().mockResolvedValue(resumeMock()),
        delete: vi.fn().mockResolvedValue(resumeMock()),
      },
    };
    const service = new ResumeService(prisma as never);

    await expect(service.remove('user-1', 'resume-1')).resolves.toEqual({
      success: true,
    });
    expect(prisma.resume.delete).toHaveBeenCalledWith({
      where: { id: 'resume-1' },
    });
  });

  it('changes primary resume atomically', async () => {
    const tx = {
      resume: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue(resumeMock({ isPrimary: true })),
      },
    };
    const prisma = {
      resume: { findFirst: vi.fn().mockResolvedValue(resumeMock()) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new ResumeService(prisma as never);

    await service.setPrimary('user-1', 'resume-1');

    expect(tx.resume.updateMany).toHaveBeenCalledWith({
      where: { candidateProfileId: 'profile-1', isPrimary: true },
      data: { isPrimary: false },
    });
    expect(tx.resume.update).toHaveBeenCalledWith({
      where: { id: 'resume-1' },
      data: { isPrimary: true },
    });
  });

  it('rejects users without a candidate profile', async () => {
    const prisma = {
      candidateProfile: { findUnique: vi.fn().mockResolvedValue(null) },
      resume: { create: vi.fn() },
    };
    const service = new ResumeService(prisma as never);

    await expect(service.create('user-1', dto)).rejects.toMatchObject({
      response: { code: 'CANDIDATE_PROFILE_NOT_FOUND' },
    });
    expect(prisma.resume.create).not.toHaveBeenCalled();
  });
});
