import {
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
import { CreateResumeDto } from './dto/create-resume.dto.js';
import { UpdateResumeDto } from './dto/update-resume.dto.js';

const safeResumeSelect = {
  id: true,
  title: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
} as const;

const resumeStorageSelect = {
  ...safeResumeSelect,
  storageKey: true,
  userId: true,
  candidateProfileId: true,
} as const;

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config?: ConfigService,
  ) {}

  async list(userId: string) {
    const profile = await this.findCandidateProfile(userId);
    return this.prisma.resume.findMany({
      where: { userId, candidateProfileId: profile.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(
    userId: string,
    dto: CreateResumeDto,
    file: UploadedFileInput | undefined,
  ) {
    const uploaded = validateUploadedFile(file);
    const profile = await this.findCandidateProfile(userId);
    const storageKey = createStorageKey('resume', userId, uploaded.extension);
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
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary)
          await tx.resume.updateMany({
            where: { candidateProfileId: profile.id, isPrimary: true },
            data: { isPrimary: false },
          });
        return tx.resume.create({
          data: {
            userId,
            candidateProfileId: profile.id,
            title: dto.title.trim(),
            storageKey,
            originalName: uploaded.originalName,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
            isPrimary: dto.isPrimary ?? false,
          },
          select: safeResumeSelect,
        });
      });
    } catch (error) {
      await this.removeUploadedObject(storageKey);
      throw error;
    }
  }

  async get(userId: string, resumeId: string) {
    return this.findOwned(userId, resumeId);
  }

  async download(userId: string, resumeId: string) {
    const resume = await this.findOwned(userId, resumeId);
    if (!(await this.storage.exists(resume.storageKey))) {
      throw new NotFoundException({
        code: 'RESUME_FILE_NOT_FOUND',
        message: 'Resume file not found',
      });
    }
    const expiresIn =
      this.config?.get<number>('storage.presignedUrlExpiresSeconds', 300) ??
      300;
    return {
      downloadUrl: await this.storage.createDownloadUrl(
        resume.storageKey,
        expiresIn,
      ),
      expiresIn,
      originalName: resume.originalName,
      mimeType: resume.mimeType,
      sizeBytes: resume.sizeBytes,
    };
  }

  async update(userId: string, resumeId: string, dto: UpdateResumeDto) {
    await this.findOwned(userId, resumeId);
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: dto.title === undefined ? {} : { title: dto.title.trim() },
    });
  }

  async remove(userId: string, resumeId: string) {
    const resume = await this.findOwned(userId, resumeId);
    try {
      if (await this.storage.exists(resume.storageKey)) {
        await this.storage.deleteObject(resume.storageKey);
      }
    } catch (error) {
      this.logger.warn(
        `Resume storage delete failed for ${resumeId}: ${this.errorName(error)}`,
      );
      throw new InternalServerErrorException({
        code: 'RESUME_DELETE_FAILED',
        message: 'Resume could not be deleted',
      });
    }

    await this.prisma.resume.delete({ where: { id: resumeId } });
    return { success: true };
  }

  async setPrimary(userId: string, resumeId: string) {
    const resume = await this.findOwned(userId, resumeId);
    return this.prisma.$transaction(async (tx) => {
      await tx.resume.updateMany({
        where: {
          candidateProfileId: resume.candidateProfileId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
      return tx.resume.update({
        where: { id: resume.id },
        data: { isPrimary: true },
      });
    });
  }

  private async findCandidateProfile(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    if (!profile)
      throw new NotFoundException({
        code: 'CANDIDATE_PROFILE_NOT_FOUND',
        message: 'Candidate profile not found',
      });
    return profile;
  }

  private async findOwned(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
        candidateProfile: { userId },
      },
      select: resumeStorageSelect,
    });
    if (!resume)
      throw new NotFoundException({
        code: 'RESUME_NOT_FOUND',
        message: 'Resume not found',
      });
    return resume;
  }

  private async removeUploadedObject(storageKey: string) {
    try {
      await this.storage.deleteObject(storageKey);
    } catch (error) {
      this.logger.warn(
        `Storage cleanup failed after resume metadata error for key ${storageKey}: ${this.errorName(error)}`,
      );
    }
  }

  private errorName(error: unknown) {
    return error instanceof Error ? error.name : 'UnknownError';
  }
}
