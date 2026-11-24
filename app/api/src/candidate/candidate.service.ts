import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto.js';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto.js';
import { CreateCandidateExperienceDto } from './dto/create-candidate-experience.dto.js';
import { UpdateCandidateExperienceDto } from './dto/update-candidate-experience.dto.js';
import { CreateCandidateEducationDto } from './dto/create-candidate-education.dto.js';
import { UpdateCandidateEducationDto } from './dto/update-candidate-education.dto.js';
import { CreateCandidateCertificationDto } from './dto/create-candidate-certification.dto.js';
import { UpdateCandidateCertificationDto } from './dto/update-candidate-certification.dto.js';
import { UpdateCandidateProfileSectionsDto } from './dto/update-candidate-profile-sections.dto.js';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.candidateProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        experiences: { orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }] },
        educations: { orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }] },
        certifications: { orderBy: { expiresAt: 'asc' } },
        languages: { orderBy: { sortOrder: 'asc' } },
        portfolioLinks: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async createProfile(userId: string, dto: CreateCandidateProfileDto) {
    try {
      return await this.prisma.candidateProfile.create({
        data: {
          userId,
          ...dto,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          readyForShift: dto.readyForShiftWork ?? false,
        },
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
    const {
      experiences,
      educations,
      certifications,
      languages,
      portfolioLinks,
      ...profileFields
    } = dto;
    const data = {
      ...profileFields,
      ...(dto.birthDate ? { birthDate: new Date(dto.birthDate) } : {}),
      ...(dto.readyForShiftWork === undefined
        ? {}
        : { readyForShift: dto.readyForShiftWork }),
    };
    const sections = {
      experiences,
      educations,
      certifications,
      languages,
      portfolioLinks,
    };

    if (Object.values(sections).every((section) => section === undefined)) {
      return this.prisma.candidateProfile.update({
        where: { id: current.id },
        data,
      });
    }

    this.validateProfileSections(sections);
    return this.prisma.$transaction(async (tx) => {
      await tx.candidateProfile.update({
        where: { id: current.id },
        data,
      });
      await this.replaceProfileSections(tx, current.id, sections);
      const updated = await tx.candidateProfile.findUnique({
        where: { id: current.id },
        include: {
          experiences: {
            orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
          },
          educations: {
            orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
          },
          certifications: { orderBy: { expiresAt: 'asc' } },
          languages: { orderBy: { sortOrder: 'asc' } },
          portfolioLinks: { orderBy: { sortOrder: 'asc' } },
        },
      });
      if (!updated) {
        throw new NotFoundException({
          code: 'CANDIDATE_PROFILE_NOT_FOUND',
          message: 'Candidate profile not found',
        });
      }
      return updated;
    });
  }

  async updateProfileSections(
    userId: string,
    dto: UpdateCandidateProfileSectionsDto,
  ) {
    const profile = await this.getProfile(userId);
    this.validateProfileSections(dto);
    await this.prisma.$transaction((tx) =>
      this.replaceProfileSections(tx, profile.id, dto),
    );

    return this.getProfile(userId);
  }

  private validateProfileSections(dto: UpdateCandidateProfileSectionsDto) {
    dto.experiences?.forEach((item) => {
      this.validateCurrent(item.isCurrent, item.endDate);
      this.validateExperienceDates(item.startDate, item.endDate);
    });
    dto.educations?.forEach((item) => {
      this.validateEducationDates(item.startDate, item.endDate);
      this.validateIncomplete(item.isIncomplete, item.endDate);
      this.validateCompletedEducation(item.isIncomplete, item.endDate);
    });
    dto.certifications?.forEach((item) =>
      this.validateDates(item.issuedAt, item.expiresAt),
    );
    if (dto.languages !== undefined) {
      this.validateUniqueNames(dto.languages.map((item) => item.name));
    }
  }

  private async replaceProfileSections(
    tx: Prisma.TransactionClient,
    profileId: string,
    dto: UpdateCandidateProfileSectionsDto,
  ) {
    if (dto.experiences !== undefined) {
      await tx.candidateExperience.deleteMany({
        where: { candidateProfileId: profileId },
      });
      if (dto.experiences.length) {
        await tx.candidateExperience.createMany({
          data: dto.experiences.map((item, sortOrder) => ({
            candidateProfileId: profileId,
            companyName: item.companyName.trim(),
            position: item.position.trim(),
            startDate: new Date(item.startDate),
            endDate: item.endDate ? new Date(item.endDate) : null,
            isCurrent: item.isCurrent ?? false,
            description: item.description?.trim() || null,
            achievements: item.achievements?.trim() || null,
            technologies: item.technologies ?? [],
            sortOrder: item.sortOrder ?? sortOrder,
          })),
        });
      }
    }

    if (dto.educations !== undefined) {
      await tx.candidateEducation.deleteMany({
        where: { candidateProfileId: profileId },
      });
      if (dto.educations.length) {
        await tx.candidateEducation.createMany({
          data: dto.educations.map((item, sortOrder) => ({
            candidateProfileId: profileId,
            institution: item.institution.trim(),
            faculty: item.faculty?.trim() || null,
            specialization: item.specialization.trim(),
            degree: item.degree?.trim() || null,
            startDate: item.startDate ? new Date(item.startDate) : null,
            endDate: item.isIncomplete
              ? null
              : item.endDate
                ? new Date(item.endDate)
                : null,
            isIncomplete: item.isIncomplete ?? false,
            description: item.description?.trim() || null,
            sortOrder: item.sortOrder ?? sortOrder,
          })),
        });
      }
    }

    if (dto.certifications !== undefined) {
      await tx.candidateCertification.deleteMany({
        where: { candidateProfileId: profileId },
      });
      if (dto.certifications.length) {
        await tx.candidateCertification.createMany({
          data: dto.certifications.map((item) => ({
            candidateProfileId: profileId,
            type: item.type,
            name: item.name.trim(),
            number: item.number?.trim() || null,
            issuedAt: item.issuedAt ? new Date(item.issuedAt) : null,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
            issuer: item.issuer?.trim() || null,
          })),
        });
      }
    }

    if (dto.languages !== undefined) {
      await tx.candidateProfileLanguage.deleteMany({
        where: { candidateProfileId: profileId },
      });
      if (dto.languages.length) {
        await tx.candidateProfileLanguage.createMany({
          data: dto.languages.map((item, sortOrder) => ({
            candidateProfileId: profileId,
            name: item.name.trim(),
            level: item.level,
            sortOrder: item.sortOrder ?? sortOrder,
          })),
        });
      }
    }

    if (dto.portfolioLinks !== undefined) {
      await tx.candidateProfilePortfolioLink.deleteMany({
        where: { candidateProfileId: profileId },
      });
      if (dto.portfolioLinks.length) {
        await tx.candidateProfilePortfolioLink.createMany({
          data: dto.portfolioLinks.map((item, sortOrder) => ({
            candidateProfileId: profileId,
            title: item.title.trim(),
            description: item.description?.trim() || null,
            url: item.url.trim(),
            technologies: item.technologies ?? [],
            sortOrder: item.sortOrder ?? sortOrder,
          })),
        });
      }
    }
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
    this.validateExperienceDates(dto.startDate, dto.endDate);
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
    this.validateExperienceDates(
      dto.startDate ?? item.startDate.toISOString(),
      dto.endDate,
    );
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
      orderBy: { startDate: 'desc' },
    });
  }
  async createEducation(userId: string, dto: CreateCandidateEducationDto) {
    const profile = await this.getProfile(userId);
    this.validateEducationDates(dto.startDate, dto.endDate);
    this.validateIncomplete(dto.isIncomplete, dto.endDate);
    this.validateCompletedEducation(dto.isIncomplete, dto.endDate);
    return this.prisma.candidateEducation.create({
      data: {
        candidateProfileId: profile.id,
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate:
          dto.isIncomplete || !dto.endDate ? null : new Date(dto.endDate),
      },
    });
  }
  async updateEducation(
    userId: string,
    id: string,
    dto: UpdateCandidateEducationDto,
  ) {
    const item = await this.prisma.candidateEducation.findFirst({
      where: { id, candidateProfile: { userId } },
    });
    if (!item) {
      throw new NotFoundException({
        code: 'CANDIDATE_EDUCATION_NOT_FOUND',
        message: 'Candidate education not found',
      });
    }
    const startDate =
      dto.startDate === undefined
        ? item.startDate?.toISOString()
        : dto.startDate;
    const endDate =
      dto.endDate === undefined ? item.endDate?.toISOString() : dto.endDate;
    const isIncomplete = dto.isIncomplete ?? item.isIncomplete;
    this.validateEducationDates(startDate, endDate);
    this.validateIncomplete(isIncomplete, endDate);
    this.validateCompletedEducation(isIncomplete, endDate);
    return this.prisma.candidateEducation.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.endDate !== undefined || isIncomplete
          ? {
              endDate:
                isIncomplete || !dto.endDate ? null : new Date(dto.endDate),
            }
          : {}),
      },
    });
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
  private validateCurrent(isCurrent?: boolean, endDate?: string | null) {
    if (isCurrent && endDate)
      throw new BadRequestException('Current experience must not have endDate');
  }
  private validateDates(issued?: string, expires?: string) {
    if (issued && expires && new Date(issued) > new Date(expires))
      throw new BadRequestException('issuedAt must not exceed expiresAt');
  }
  private validateExperienceDates(start: string, end?: string | null) {
    if (end && new Date(end) < new Date(start))
      throw new BadRequestException(
        'endDate must not be earlier than startDate',
      );
  }
  private validateEducationDates(start?: string | null, end?: string | null) {
    if (start && end && new Date(end) < new Date(start))
      throw new BadRequestException({
        code: 'INVALID_EDUCATION_DATES',
        message: 'Education end date must not be earlier than start date',
      });
  }
  private validateIncomplete(incomplete?: boolean, endDate?: string | null) {
    if (incomplete && endDate)
      throw new BadRequestException(
        'Incomplete education must not have endDate',
      );
  }
  private validateCompletedEducation(
    incomplete?: boolean,
    endDate?: string | null,
  ) {
    if (!incomplete && !endDate) {
      throw new BadRequestException({
        code: 'INCOMPLETE_COMPLETED_EDUCATION',
        message: 'Completed education must have an end date',
      });
    }
  }
  private validateUniqueNames(names: string[]) {
    const normalized = names.map((name) => name.trim().toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length)
      throw new BadRequestException('Duplicate language names are not allowed');
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
