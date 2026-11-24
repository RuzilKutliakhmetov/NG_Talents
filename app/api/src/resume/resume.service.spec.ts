import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CreateResumeDto } from './dto/create-resume.dto.js';
import { ResumeService } from './resume.service.js';

const dto: CreateResumeDto = {
  title: '  Resume  ',
};
const file = {
  buffer: Buffer.from('pdf'),
  originalname: ' resume.pdf ',
  mimetype: 'application/pdf',
};
const storageMock = {
  putObject: vi.fn().mockResolvedValue(undefined),
  deleteObject: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(true),
  createDownloadUrl: vi
    .fn()
    .mockResolvedValue('https://signed.example/download'),
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
    status: 'DRAFT',
    experiences: [],
    educations: [],
    skills: [],
    languages: [],
    certifications: [],
    portfolioLinks: [],
    ...overrides,
  };
}

describe('ResumeService', () => {
  it('creates metadata using the current user profile', async () => {
    const tx = { resume: { create: vi.fn().mockResolvedValue(resumeMock()) } };
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue(profileMock()),
      },
      resume: { create: vi.fn().mockResolvedValue(resumeMock()) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new ResumeService(prisma as never, storageMock as never);

    await service.create('user-1', dto, file);

    expect(tx.resume.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        candidateProfileId: 'profile-1',
        title: 'Resume',
        originalName: 'resume.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 3,
      }),
      select: expect.any(Object),
    });
  });

  it('lists only the current candidate resumes', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue(profileMock()),
      },
      resume: { findMany: vi.fn().mockResolvedValue([resumeMock()]) },
    };
    const service = new ResumeService(prisma as never, storageMock as never);

    await service.list('user-1');

    expect(prisma.resume.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', candidateProfileId: 'profile-1' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      include: expect.any(Object),
    });
  });

  it('returns one salary value and hides legacy range and currency fields', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue(profileMock()),
      },
      resume: {
        findFirst: vi.fn().mockResolvedValue(resumeMock()),
        findUnique: vi.fn().mockResolvedValue(
          resumeMock({
            desiredSalaryMin: 120_000,
            desiredSalaryMax: 150_000,
            salaryCurrency: 'RUB',
          }),
        ),
      },
    };
    const service = new ResumeService(prisma as never, storageMock as never);

    const resume = await service.get('user-1', 'resume-1');

    expect(resume).toMatchObject({ desiredSalary: 120_000 });
    expect(resume).not.toHaveProperty('desiredSalaryMin');
    expect(resume).not.toHaveProperty('desiredSalaryMax');
    expect(resume).not.toHaveProperty('salaryCurrency');
  });

  it('rejects a non-positive desired salary', async () => {
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue(profileMock()),
      },
    };
    const service = new ResumeService(prisma as never, storageMock as never);

    await expect(
      service.createStructured('user-1', { desiredSalary: 0 }),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_DESIRED_SALARY' },
    });
  });

  it('creates profile-section snapshots and ignores resume-side edits to them', async () => {
    const profileContent = {
      experiences: [
        {
          companyName: 'Example LLC',
          position: 'Developer',
          startDate: new Date('2022-01-01T00:00:00.000Z'),
          endDate: null,
          isCurrent: true,
          description: 'Built applications',
          achievements: null,
          technologies: ['TypeScript'],
          sortOrder: 0,
        },
      ],
      educations: [
        {
          institution: 'Example University',
          faculty: null,
          specialization: 'Computer science',
          degree: 'Bachelor',
          startDate: new Date('2018-09-01T00:00:00.000Z'),
          endDate: new Date('2022-06-30T00:00:00.000Z'),
          isIncomplete: false,
          description: null,
          sortOrder: 0,
        },
      ],
      certifications: [
        {
          name: 'Cloud course',
          issuer: 'Example Academy',
          issuedAt: new Date('2023-01-01T00:00:00.000Z'),
          expiresAt: null,
        },
      ],
      languages: [{ name: 'English', level: 'B2', sortOrder: 0 }],
      portfolioLinks: [
        {
          title: 'Project',
          description: null,
          url: 'https://example.com',
          technologies: ['React'],
          sortOrder: 0,
        },
      ],
    };
    const tx = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue(profileContent),
      },
      resume: {
        create: vi.fn().mockResolvedValue({ id: 'resume-new' }),
        findUnique: vi.fn().mockResolvedValue(
          resumeMock({
            id: 'resume-new',
            title: 'Engineer',
            desiredPosition: 'Engineer',
            summary: 'Summary',
            city: 'Ufa',
            storageKey: null,
          }),
        ),
      },
      resumeExperience: { createMany: vi.fn() },
      resumeEducation: { createMany: vi.fn() },
      resumeSkill: { createMany: vi.fn() },
      resumeLanguage: { createMany: vi.fn() },
      resumeCertification: { createMany: vi.fn() },
      resumePortfolioLink: { createMany: vi.fn() },
    };
    const prisma = {
      candidateProfile: {
        upsert: vi.fn().mockResolvedValue(profileMock()),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new ResumeService(prisma as never);

    await service.createStructured('user-1', {
      desiredPosition: 'Engineer',
      desiredSalary: 150_000,
      experiences: [
        {
          companyName: 'Injected company',
          position: 'Injected role',
          startDate: '2024-01-01',
        },
      ],
    });

    expect(tx.resume.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Engineer',
          desiredPosition: 'Engineer',
          desiredSalaryMin: 150_000,
          desiredSalaryMax: 150_000,
          salaryCurrency: 'RUB',
        }),
      }),
    );
    expect(tx.resumeExperience.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          resumeId: 'resume-new',
          companyName: 'Example LLC',
          position: 'Developer',
          startDate: new Date('2022-01-01T00:00:00.000Z'),
        }),
      ],
    });
    expect(tx.resumeEducation.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          resumeId: 'resume-new',
          institution: 'Example University',
          specialization: 'Computer science',
          startDate: new Date('2018-09-01T00:00:00.000Z'),
          endDate: new Date('2022-06-30T00:00:00.000Z'),
        }),
      ],
    });
    expect(tx.resumeLanguage.createMany).toHaveBeenCalledWith({
      data: [
        {
          resumeId: 'resume-new',
          name: 'English',
          level: 'B2',
          sortOrder: 0,
        },
      ],
    });
    expect(tx.resumeCertification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          resumeId: 'resume-new',
          name: 'Cloud course',
          issuer: 'Example Academy',
        }),
      ],
    });
    expect(tx.resumePortfolioLink.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          resumeId: 'resume-new',
          title: 'Project',
          url: 'https://example.com',
        }),
      ],
    });
  });

  it('rejects access to another candidate resume', async () => {
    const prisma = {
      resume: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new ResumeService(prisma as never, storageMock as never);

    await expect(service.get('user-1', 'resume-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.resume.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'resume-2',
        userId: 'user-1',
        candidateProfile: { userId: 'user-1' },
      },
      select: expect.objectContaining({
        id: true,
        storageKey: true,
        userId: true,
        candidateProfileId: true,
      }),
    });
  });

  it('updates only owned metadata', async () => {
    const prisma = {
      resume: {
        findFirst: vi.fn().mockResolvedValue(resumeMock()),
        update: vi.fn().mockResolvedValue(resumeMock({ title: 'Updated' })),
      },
    };
    const service = new ResumeService(prisma as never, storageMock as never);

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
    const service = new ResumeService(prisma as never, storageMock as never);

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
      application: {
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const service = new ResumeService(prisma as never, storageMock as never);

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
    const service = new ResumeService(prisma as never, storageMock as never);

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

  it('rejects publishing an incomplete structured resume', async () => {
    const prisma = {
      resume: {
        findFirst: vi.fn().mockResolvedValue(
          resumeMock({
            status: 'DRAFT',
            storageKey: null,
            title: 'Backend',
            desiredPosition: null,
            summary: null,
            city: null,
            experiences: [],
            educations: [],
            skills: [],
            languages: [],
            certifications: [],
            portfolioLinks: [],
          }),
        ),
        update: vi.fn(),
      },
    };
    const service = new ResumeService(prisma as never, storageMock as never);

    await expect(service.publish('user-1', 'resume-1')).rejects.toMatchObject({
      response: {
        code: 'RESUME_INCOMPLETE',
      },
    });
    expect(prisma.resume.update).not.toHaveBeenCalled();
  });

  it('rejects publishing an archived resume', async () => {
    const prisma = {
      resume: {
        findFirst: vi.fn().mockResolvedValue(
          resumeMock({
            status: 'ARCHIVED',
            storageKey: null,
            experiences: [],
            educations: [],
            skills: [],
            languages: [],
            certifications: [],
            portfolioLinks: [],
          }),
        ),
        update: vi.fn(),
      },
    };
    const service = new ResumeService(prisma as never, storageMock as never);

    await expect(service.publish('user-1', 'resume-1')).rejects.toMatchObject({
      response: {
        code: 'RESUME_ARCHIVED',
      },
    });
  });

  it('creates a candidate profile before listing resumes for an existing candidate', async () => {
    const prisma = {
      candidateProfile: { upsert: vi.fn().mockResolvedValue(profileMock()) },
      resume: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const service = new ResumeService(prisma as never);

    await expect(service.list('user-1')).resolves.toEqual([]);
    expect(prisma.candidateProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1' },
      update: {},
      select: { id: true, userId: true },
    });
  });
});
