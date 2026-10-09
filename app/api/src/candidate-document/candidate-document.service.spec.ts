import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  DocumentType,
  VerificationStatus,
} from '../generated/prisma/client.js';
import { CreateCandidateDocumentDto } from './dto/create-candidate-document.dto.js';
import { CandidateDocumentService } from './candidate-document.service.js';

const input = {
  type: DocumentType.CERTIFICATE,
  title: '  Сертификат  ',
  issuedAt: '2024-01-10',
  expiresAt: '2029-01-10',
};
const file = {
  buffer: Buffer.from('pdf'),
  originalname: ' certificate.pdf ',
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

function documentMock(overrides: Record<string, unknown> = {}) {
  return {
    id: 'document-1',
    type: DocumentType.CERTIFICATE,
    title: 'Certificate',
    originalName: 'certificate.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 3,
    issuedAt: new Date('2024-01-10'),
    expiresAt: new Date('2029-01-10'),
    verificationStatus: VerificationStatus.NOT_VERIFIED,
    verifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CandidateDocumentService', () => {
  it('uploads metadata with current user and profile ownership', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-1' }),
      },
      candidateDocument: { create: vi.fn().mockResolvedValue(documentMock()) },
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storageMock as never,
    );

    await service.create('user-1', input, file);

    expect(storageMock.putObject).toHaveBeenCalledWith(
      expect.stringMatching(
        /^candidates\/user-1\/candidate-document\/.*\.pdf$/,
      ),
      file.buffer,
      'application/pdf',
      3,
    );
    expect(prisma.candidateDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          candidateProfileId: 'profile-1',
          title: 'Сертификат',
          originalName: 'certificate.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 3,
          storageKey: expect.stringMatching(
            /^candidates\/user-1\/candidate-document\//,
          ),
        }),
      }),
    );
  });

  it('lists only documents owned by the current candidate', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-1' }),
      },
      candidateDocument: {
        findMany: vi.fn().mockResolvedValue([documentMock()]),
      },
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storageMock as never,
    );
    await service.list('user-1');
    expect(prisma.candidateDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', candidateProfileId: 'profile-1' },
      }),
    );
  });

  it('rejects another candidate document', async () => {
    const prisma = {
      candidateDocument: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storageMock as never,
    );
    await expect(service.get('user-1', 'document-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates and deletes only owned metadata', async () => {
    const prisma = {
      candidateDocument: {
        findFirst: vi.fn().mockResolvedValue(documentMock()),
        update: vi.fn().mockResolvedValue(documentMock({ title: 'Updated' })),
        delete: vi.fn().mockResolvedValue(documentMock()),
      },
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storageMock as never,
    );
    await service.update('user-1', 'document-1', { title: ' Updated ' });
    await service.remove('user-1', 'document-1');
    expect(prisma.candidateDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { title: 'Updated' } }),
    );
    expect(
      prisma.candidateDocument.update.mock.calls[0][0].data,
    ).not.toHaveProperty('storageKey');
  });

  it('cleans uploaded object when DB create fails', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-1' }),
      },
      candidateDocument: {
        create: vi.fn().mockRejectedValue(new Error('db failed')),
      },
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storageMock as never,
    );
    await expect(service.create('user-1', input, file)).rejects.toThrow(
      'db failed',
    );
    expect(storageMock.deleteObject).toHaveBeenCalledWith(
      expect.stringMatching(/^candidates\/user-1\/candidate-document\//),
    );
  });

  it('rejects storage upload failure', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-1' }),
      },
      candidateDocument: { create: vi.fn() },
    };
    const storage = {
      putObject: vi.fn().mockRejectedValue(new Error('storage down')),
      deleteObject: vi.fn(),
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storage as never,
    );
    await expect(service.create('user-1', input, file)).rejects.toMatchObject({
      response: { code: 'STORAGE_UPLOAD_FAILED' },
    });
    expect(prisma.candidateDocument.create).not.toHaveBeenCalled();
  });

  it('rejects creation without a candidate profile', async () => {
    const prisma = {
      candidateProfile: { findUnique: vi.fn().mockResolvedValue(null) },
      candidateDocument: { create: vi.fn() },
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storageMock as never,
    );
    await expect(service.create('user-1', input, file)).rejects.toMatchObject({
      response: { code: 'CANDIDATE_PROFILE_NOT_FOUND' },
    });
  });

  it('does not expose system fields in the DTO', () => {
    const dto = new CreateCandidateDocumentDto();
    expect(dto).not.toHaveProperty('storageKey');
    expect(dto).not.toHaveProperty('userId');
    expect(dto).not.toHaveProperty('candidateProfileId');
    expect(dto).not.toHaveProperty('verificationStatus');
  });

  it.each([
    ['invalid MIME', { ...file, mimetype: 'image/png' }],
    ['empty file', { ...file, buffer: Buffer.alloc(0) }],
    ['oversized file', { ...file, buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }],
  ])('rejects %s', async (_name, invalidFile) => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-1' }),
      },
      candidateDocument: { create: vi.fn() },
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storageMock as never,
    );
    await expect(
      service.create('user-1', input, invalidFile),
    ).rejects.toThrow();
  });

  it('rejects invalid date range', async () => {
    const prisma = {
      candidateProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: 'profile-1' }),
      },
      candidateDocument: { create: vi.fn() },
    };
    const service = new CandidateDocumentService(
      prisma as never,
      storageMock as never,
    );
    await expect(
      service.create(
        'user-1',
        { ...input, issuedAt: '2029-01-10', expiresAt: '2024-01-10' },
        file,
      ),
    ).rejects.toMatchObject({
      response: { message: 'issuedAt must not exceed expiresAt' },
    });
  });
});
