import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateResumeDto } from './dto/create-resume.dto.js';
import { UpdateResumeDto } from './dto/update-resume.dto.js';

@Injectable()
export class ResumeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const profile = await this.findCandidateProfile(userId);
    return this.prisma.resume.findMany({
      where: { userId, candidateProfileId: profile.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateResumeDto) {
    const profile = await this.findCandidateProfile(userId);
    return this.prisma.resume.create({
      data: {
        userId,
        candidateProfileId: profile.id,
        title: dto.title.trim(),
        originalName: dto.originalName.trim(),
        mimeType: dto.mimeType.trim(),
        sizeBytes: dto.sizeBytes,
        storageKey: dto.storageKey.trim(),
      },
    });
  }

  async get(userId: string, resumeId: string) {
    return this.findOwned(userId, resumeId);
  }

  async update(userId: string, resumeId: string, dto: UpdateResumeDto) {
    await this.findOwned(userId, resumeId);
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.originalName !== undefined
          ? { originalName: dto.originalName.trim() }
          : {}),
        ...(dto.mimeType !== undefined
          ? { mimeType: dto.mimeType.trim() }
          : {}),
        ...(dto.sizeBytes !== undefined ? { sizeBytes: dto.sizeBytes } : {}),
        ...(dto.storageKey !== undefined
          ? { storageKey: dto.storageKey.trim() }
          : {}),
      },
    });
  }

  async remove(userId: string, resumeId: string) {
    await this.findOwned(userId, resumeId);
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
    });
    if (!resume)
      throw new NotFoundException({
        code: 'RESUME_NOT_FOUND',
        message: 'Resume not found',
      });
    return resume;
  }
}
