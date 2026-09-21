import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto.js';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto.js';
import { CreateCandidateExperienceDto } from './dto/create-candidate-experience.dto.js';
import { UpdateCandidateExperienceDto } from './dto/update-candidate-experience.dto.js';
import { CreateCandidateEducationDto } from './dto/create-candidate-education.dto.js';
import { UpdateCandidateEducationDto } from './dto/update-candidate-education.dto.js';
import { CreateCandidateCertificationDto } from './dto/create-candidate-certification.dto.js';
import { UpdateCandidateCertificationDto } from './dto/update-candidate-certification.dto.js';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
      include: { experiences: true, educations: true, certifications: true },
    });
    if (!profile)
      throw new NotFoundException({
        code: 'CANDIDATE_PROFILE_NOT_FOUND',
        message: 'Candidate profile not found',
      });
    return profile;
  }

  async createProfile(userId: string, dto: CreateCandidateProfileDto) {
    this.validateSalary(dto.desiredSalaryMin, dto.desiredSalaryMax);
    try {
      return await this.prisma.candidateProfile.create({
        data: { userId, ...dto, readyForShift: dto.readyForShiftWork ?? false },
      });
    } catch (error) {
      if (this.isUniqueError(error))
        throw new ConflictException({
          code: 'CANDIDATE_PROFILE_ALREADY_EXISTS',
          message: 'Candidate profile already exists',
        });
      throw error;
    }
  }

  async updateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    const current = await this.getProfile(userId);
    const min = dto.desiredSalaryMin ?? current.desiredSalaryMin;
    const max = dto.desiredSalaryMax ?? current.desiredSalaryMax;
    this.validateSalary(min, max);
    return this.prisma.candidateProfile.update({
      where: { id: current.id },
      data: {
        ...dto,
        ...(dto.readyForShiftWork === undefined
          ? {}
          : { readyForShift: dto.readyForShiftWork }),
      },
    });
  }

  async listExperiences(userId: string) {
    const profile = await this.getProfile(userId);
    return this.prisma.candidateExperience.findMany({
      where: { candidateProfileId: profile.id },
      orderBy: { startDate: 'desc' },
    });
  }
  async createExperience(userId: string, dto: CreateCandidateExperienceDto) {
    const profile = await this.getProfile(userId);
    this.validateCurrent(dto.isCurrent, dto.endDate);
    return this.prisma.candidateExperience.create({
      data: {
        candidateProfileId: profile.id,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }
  async updateExperience(
    userId: string,
    id: string,
    dto: UpdateCandidateExperienceDto,
  ) {
    const item = await this.findOwnedExperience(userId, id);
    const isCurrent = dto.isCurrent ?? item.isCurrent;
    this.validateCurrent(isCurrent, dto.endDate);
    return this.prisma.candidateExperience.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(isCurrent
          ? { endDate: null }
          : dto.endDate
            ? { endDate: new Date(dto.endDate) }
            : {}),
      },
    });
  }
  async deleteExperience(userId: string, id: string) {
    await this.findOwned('candidateExperience', userId, id);
    await this.prisma.candidateExperience.delete({ where: { id } });
    return { success: true };
  }

  async listEducation(userId: string) {
    const profile = await this.getProfile(userId);
    return this.prisma.candidateEducation.findMany({
      where: { candidateProfileId: profile.id },
      orderBy: { startYear: 'desc' },
    });
  }
  async createEducation(userId: string, dto: CreateCandidateEducationDto) {
    const profile = await this.getProfile(userId);
    this.validateYears(dto.startYear, dto.endYear);
    return this.prisma.candidateEducation.create({
      data: { candidateProfileId: profile.id, ...dto },
    });
  }
  async updateEducation(
    userId: string,
    id: string,
    dto: UpdateCandidateEducationDto,
  ) {
    await this.findOwned('candidateEducation', userId, id);
    this.validateYears(dto.startYear, dto.endYear);
    return this.prisma.candidateEducation.update({ where: { id }, data: dto });
  }
  async deleteEducation(userId: string, id: string) {
    await this.findOwned('candidateEducation', userId, id);
    await this.prisma.candidateEducation.delete({ where: { id } });
    return { success: true };
  }

  async listCertifications(userId: string) {
    const profile = await this.getProfile(userId);
    return this.prisma.candidateCertification.findMany({
      where: { candidateProfileId: profile.id },
      orderBy: { expiresAt: 'asc' },
    });
  }
  async createCertification(
    userId: string,
    dto: CreateCandidateCertificationDto,
  ) {
    const profile = await this.getProfile(userId);
    this.validateDates(dto.issuedAt, dto.expiresAt);
    return this.prisma.candidateCertification.create({
      data: {
        candidateProfileId: profile.id,
        ...dto,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }
  async updateCertification(
    userId: string,
    id: string,
    dto: UpdateCandidateCertificationDto,
  ) {
    await this.findOwned('candidateCertification', userId, id);
    this.validateDates(dto.issuedAt, dto.expiresAt);
    return this.prisma.candidateCertification.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.issuedAt ? { issuedAt: new Date(dto.issuedAt) } : {}),
        ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
    });
  }
  async deleteCertification(userId: string, id: string) {
    await this.findOwned('candidateCertification', userId, id);
    await this.prisma.candidateCertification.delete({ where: { id } });
    return { success: true };
  }

  private async findOwned(
    model:
      'candidateExperience' | 'candidateEducation' | 'candidateCertification',
    userId: string,
    id: string,
  ) {
    const item =
      model === 'candidateExperience'
        ? await this.prisma.candidateExperience.findFirst({
            where: { id, candidateProfile: { userId } },
          })
        : model === 'candidateEducation'
          ? await this.prisma.candidateEducation.findFirst({
              where: { id, candidateProfile: { userId } },
            })
          : await this.prisma.candidateCertification.findFirst({
              where: { id, candidateProfile: { userId } },
            });
    if (!item) {
      const code =
        model === 'candidateExperience'
          ? 'CANDIDATE_EXPERIENCE_NOT_FOUND'
          : model === 'candidateEducation'
            ? 'CANDIDATE_EDUCATION_NOT_FOUND'
            : 'CANDIDATE_CERTIFICATION_NOT_FOUND';
      throw new NotFoundException({
        code,
        message: 'Candidate item not found',
      });
    }
    return item;
  }
  private async findOwnedExperience(userId: string, id: string) {
    const item = await this.prisma.candidateExperience.findFirst({
      where: { id, candidateProfile: { userId } },
    });
    if (!item)
      throw new NotFoundException({
        code: 'CANDIDATE_EXPERIENCE_NOT_FOUND',
        message: 'Candidate experience not found',
      });
    return item;
  }
  private validateSalary(min?: number | null, max?: number | null) {
    if (
      min !== undefined &&
      max !== undefined &&
      min !== null &&
      max !== null &&
      min > max
    )
      throw new BadRequestException(
        'desiredSalaryMin must not exceed desiredSalaryMax',
      );
  }
  private validateCurrent(isCurrent?: boolean, endDate?: string | null) {
    if (isCurrent && endDate)
      throw new BadRequestException('Current experience must not have endDate');
  }
  private validateYears(start?: number, end?: number) {
    if (start !== undefined && end !== undefined && start > end)
      throw new BadRequestException('startYear must not exceed endYear');
  }
  private validateDates(issued?: string, expires?: string) {
    if (issued && expires && new Date(issued) > new Date(expires))
      throw new BadRequestException('issuedAt must not exceed expiresAt');
  }
  private isUniqueError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
