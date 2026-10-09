import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import { createStorageKey } from '../storage/storage-key.js';
import {
  UploadedFileInput,
  validateUploadedFile,
} from '../storage/uploaded-file.js';
import { CreateCandidateDocumentDto } from './dto/create-candidate-document.dto.js';
import { UpdateCandidateDocumentDto } from './dto/update-candidate-document.dto.js';

const safeDocumentSelect = {
  id: true,
  type: true,
  title: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  issuedAt: true,
  expiresAt: true,
  verificationStatus: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const documentStorageSelect = {
  ...safeDocumentSelect,
  storageKey: true,
  userId: true,
  candidateProfileId: true,
} as const;

@Injectable()
export class CandidateDocumentService {
  private readonly logger = new Logger(CandidateDocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config?: ConfigService,
  ) {}

  async list(userId: string) {
    const profile = await this.findCandidateProfile(userId);
    return this.prisma.candidateDocument.findMany({
      where: { userId, candidateProfileId: profile.id },
      select: safeDocumentSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    userId: string,
    dto: CreateCandidateDocumentDto,
    file: UploadedFileInput | undefined,
  ) {
    const uploaded = validateUploadedFile(file);
    const profile = await this.findCandidateProfile(userId);
    this.validateDates(dto.issuedAt, dto.expiresAt);
    const storageKey = createStorageKey(
      'candidate-document',
      userId,
      uploaded.extension,
    );

    try {
      await this.storage.putObject(
        storageKey,
        uploaded.buffer,
        uploaded.mimeType,
        uploaded.sizeBytes,
      );
    } catch {
      throw new InternalServerErrorException({
        code: 'STORAGE_UPLOAD_FAILED',
        message: 'File upload failed',
      });
    }

    try {
      return await this.prisma.candidateDocument.create({
        data: {
          userId,
          candidateProfileId: profile.id,
          type: dto.type,
          title: dto.title.trim(),
          storageKey,
          originalName: uploaded.originalName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
        select: safeDocumentSelect,
      });
    } catch (error) {
      await this.removeUploadedObject(storageKey);
      throw error;
    }
  }

  async get(userId: string, documentId: string) {
    return this.findOwned(userId, documentId);
  }

  async download(userId: string, documentId: string) {
    const document = await this.findOwned(userId, documentId);
    if (!(await this.storage.exists(document.storageKey))) {
      throw new NotFoundException({
        code: 'DOCUMENT_FILE_NOT_FOUND',
        message: 'Document file not found',
      });
    }
    const expiresIn =
      this.config?.get<number>('storage.presignedUrlExpiresSeconds', 300) ??
      300;
    return {
      downloadUrl: await this.storage.createDownloadUrl(
        document.storageKey,
        expiresIn,
      ),
      expiresIn,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
    };
  }

  async update(
    userId: string,
    documentId: string,
    dto: UpdateCandidateDocumentDto,
  ) {
    const current = await this.findOwned(userId, documentId);
    const issuedAt = dto.issuedAt ?? current.issuedAt?.toISOString();
    const expiresAt = dto.expiresAt ?? current.expiresAt?.toISOString();
    this.validateDates(issuedAt, expiresAt);
    return this.prisma.candidateDocument.update({
      where: { id: documentId },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.issuedAt !== undefined
          ? { issuedAt: new Date(dto.issuedAt) }
          : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: new Date(dto.expiresAt) }
          : {}),
      },
      select: safeDocumentSelect,
    });
  }

  async remove(userId: string, documentId: string) {
    const document = await this.findOwned(userId, documentId);
    try {
      if (await this.storage.exists(document.storageKey)) {
        await this.storage.deleteObject(document.storageKey);
      }
    } catch (error) {
      this.logger.warn(
        `Document storage delete failed for ${documentId}: ${this.errorName(error)}`,
      );
      throw new InternalServerErrorException({
        code: 'DOCUMENT_DELETE_FAILED',
        message: 'Document could not be deleted',
      });
    }

    await this.prisma.candidateDocument.delete({ where: { id: documentId } });
    return { success: true };
  }

  private async findCandidateProfile(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile)
      throw new NotFoundException({
        code: 'CANDIDATE_PROFILE_NOT_FOUND',
        message: 'Candidate profile not found',
      });
    return profile;
  }

  private async findOwned(userId: string, documentId: string) {
    const document = await this.prisma.candidateDocument.findFirst({
      where: {
        id: documentId,
        userId,
        candidateProfile: { userId },
      },
      select: documentStorageSelect,
    });
    if (!document)
      throw new NotFoundException({
        code: 'CANDIDATE_DOCUMENT_NOT_FOUND',
        message: 'Candidate document not found',
      });
    return document;
  }

  private validateDates(issuedAt?: string, expiresAt?: string) {
    if (issuedAt && expiresAt && new Date(issuedAt) > new Date(expiresAt))
      throw new BadRequestException('issuedAt must not exceed expiresAt');
  }

  private async removeUploadedObject(storageKey: string) {
    try {
      await this.storage.deleteObject(storageKey);
    } catch (error) {
      this.logger.warn(
        `Storage cleanup failed after document metadata error for key ${storageKey}: ${this.errorName(error)}`,
      );
    }
  }

  private errorName(error: unknown) {
    return error instanceof Error ? error.name : 'UnknownError';
  }
}
