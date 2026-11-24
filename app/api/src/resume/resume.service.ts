import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ResumeStatus } from '../generated/prisma/client.js';
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
import { CreateStructuredResumeDto } from './dto/create-structured-resume.dto.js';
import { UpdateStructuredResumeDto } from './dto/update-structured-resume.dto.js';

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
  status: true,
  isPrimary: true,
  desiredPosition: true,
  specialization: true,
  summary: true,
} as const;

const resumeInclude = {
  experiences: { orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }] },
  educations: { orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }] },
  skills: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
  languages: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
  certifications: { orderBy: [{ sortOrder: 'asc' }, { issuedAt: 'desc' }] },
  portfolioLinks: { orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] },
} satisfies Prisma.ResumeInclude;

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
    const resumes = await this.prisma.resume.findMany({
      where: { userId, candidateProfileId: profile.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      include: resumeInclude,
    });
    return resumes.map((resume) => ({
      ...this.withDesiredSalary(resume),
      completion: this.resumeCompletion(resume),
    }));
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
            status: ResumeStatus.PUBLISHED,
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
    await this.findOwned(userId, resumeId);
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: resumeInclude,
    });
    return resume
      ? {
          ...this.withDesiredSalary(resume),
          completion: this.resumeCompletion(resume),
        }
      : resume;
  }

  async download(userId: string, resumeId: string) {
    const resume = await this.findOwned(userId, resumeId);
    if (!resume.storageKey) {
      throw new NotFoundException({
        code: 'RESUME_FILE_NOT_FOUND',
        message: 'Structured resume has no uploaded file',
      });
    }
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
    const updated = await this.prisma.resume.update({
      where: { id: resumeId },
      data: dto.title === undefined ? {} : { title: dto.title.trim() },
    });
    return this.withDesiredSalary(updated);
  }

  async createStructured(userId: string, dto: CreateStructuredResumeDto) {
    const profile = await this.findCandidateProfile(userId);
    this.validateDesiredSalary(dto.desiredSalary);

    return this.prisma.$transaction(async (tx) => {
      const profileContent = await tx.candidateProfile.findUnique({
        where: { id: profile.id },
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
      const resume = await tx.resume.create({
        data: {
          userId,
          candidateProfileId: profile.id,
          title: dto.desiredPosition?.trim() || 'Резюме',
          status: ResumeStatus.DRAFT,
          isPrimary: false,
          desiredPosition: dto.desiredPosition?.trim() || null,
          specialization: dto.specialization?.trim() || null,
          summary: dto.summary?.trim() || null,
          experienceYears: dto.experienceYears ?? null,
          desiredSalaryMin: dto.desiredSalary ?? null,
          desiredSalaryMax: dto.desiredSalary ?? null,
          salaryCurrency: 'RUB',
          employmentType: dto.employmentType ?? null,
          workSchedule: dto.workSchedule?.trim() || null,
          workFormat: dto.workFormat ?? null,
          city: dto.city?.trim() || null,
          geoPreferences:
            dto.geoPreferences && typeof dto.geoPreferences === 'object'
              ? (dto.geoPreferences as Prisma.InputJsonObject)
              : Prisma.JsonNull,
          isPublic: dto.isPublic ?? true,
        },
      });
      await this.replaceNestedData(tx, resume.id, {
        ...dto,
        experiences:
          profileContent?.experiences.map((item) => ({
            companyName: item.companyName,
            position: item.position,
            startDate: item.startDate.toISOString(),
            endDate: item.endDate?.toISOString(),
            isCurrent: item.isCurrent,
            description: item.description ?? undefined,
            achievements: item.achievements ?? undefined,
            technologies: item.technologies,
            sortOrder: item.sortOrder,
          })) ?? [],
        educations:
          profileContent?.educations.map((item) => ({
            institution: item.institution,
            faculty: item.faculty ?? undefined,
            specialization: item.specialization,
            degree: item.degree ?? undefined,
            startDate: item.startDate?.toISOString(),
            endDate: item.endDate?.toISOString(),
            isIncomplete: item.isIncomplete,
            description: item.description ?? undefined,
            sortOrder: item.sortOrder,
          })) ?? [],
        certifications:
          profileContent?.certifications.map((item) => ({
            name: item.name,
            issuer: item.issuer ?? undefined,
            issuedAt: item.issuedAt?.toISOString(),
            expiresAt: item.expiresAt?.toISOString(),
            url: undefined,
            sortOrder: 0,
          })) ?? [],
        languages:
          profileContent?.languages.map((item) => ({
            name: item.name,
            level: item.level,
            sortOrder: item.sortOrder,
          })) ?? [],
        portfolioLinks:
          profileContent?.portfolioLinks.map((item) => ({
            title: item.title,
            description: item.description ?? undefined,
            url: item.url,
            technologies: item.technologies,
            sortOrder: item.sortOrder,
          })) ?? [],
      });
      const result = await tx.resume.findUnique({
        where: { id: resume.id },
        include: resumeInclude,
      });
      return result
        ? {
            ...this.withDesiredSalary(result),
            completion: this.resumeCompletion(result),
          }
        : result;
    });
  }

  async updateStructured(
    userId: string,
    resumeId: string,
    dto: UpdateStructuredResumeDto,
  ) {
    const resume = await this.findOwned(userId, resumeId);
    if (resume.status === ResumeStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'RESUME_ARCHIVED',
        message: 'Archived resume must be returned to draft before editing',
      });
    }
    this.validateDesiredSalary(dto.desiredSalary);
    await this.prisma.$transaction(async (tx) => {
      await tx.resume.update({
        where: { id: resumeId },
        data: {
          ...(dto.desiredPosition !== undefined
            ? {
                desiredPosition: dto.desiredPosition?.trim() || null,
                title: dto.desiredPosition?.trim() || 'Резюме',
              }
            : {}),
          ...(dto.specialization !== undefined
            ? { specialization: dto.specialization?.trim() || null }
            : {}),
          ...(dto.summary !== undefined
            ? { summary: dto.summary?.trim() || null }
            : {}),
          ...(dto.experienceYears !== undefined
            ? { experienceYears: dto.experienceYears }
            : {}),
          ...(dto.desiredSalary !== undefined
            ? {
                desiredSalaryMin: dto.desiredSalary,
                desiredSalaryMax: dto.desiredSalary,
                salaryCurrency: 'RUB',
              }
            : {}),
          ...(dto.employmentType !== undefined
            ? { employmentType: dto.employmentType }
            : {}),
          ...(dto.workSchedule !== undefined
            ? { workSchedule: dto.workSchedule?.trim() || null }
            : {}),
          ...(dto.workFormat !== undefined
            ? { workFormat: dto.workFormat }
            : {}),
          ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
          ...(dto.geoPreferences !== undefined
            ? {
                geoPreferences:
                  dto.geoPreferences && typeof dto.geoPreferences === 'object'
                    ? (dto.geoPreferences as Prisma.InputJsonObject)
                    : Prisma.JsonNull,
              }
            : {}),
          ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
        },
      });
      await this.replaceSkillsIfProvided(tx, resumeId, dto);
    });

    const updated = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: resumeInclude,
    });
    return updated
      ? {
          ...this.withDesiredSalary(updated),
          completion: this.resumeCompletion(updated),
        }
      : updated;
  }

  async publish(userId: string, resumeId: string) {
    const resume = await this.findOwnedWithRelations(userId, resumeId);
    if (resume.status === ResumeStatus.PUBLISHED) {
      return {
        ...this.withDesiredSalary(resume),
      };
    }
    if (resume.status === ResumeStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'RESUME_ARCHIVED',
        message: 'Archived resume must be copied or restored to draft',
      });
    }
    const completion = this.resumeCompletion(resume);
    if (!completion.canPublish) {
      throw new BadRequestException({
        code: 'RESUME_INCOMPLETE',
        message: 'Resume is incomplete and cannot be published',
        missing: completion.missing,
      });
    }
    const updated = await this.prisma.resume.update({
      where: { id: resumeId },
      data: { status: ResumeStatus.PUBLISHED },
      include: resumeInclude,
    });
    return {
      ...this.withDesiredSalary(updated),
      completion: this.resumeCompletion(updated),
    };
  }

  async unpublish(userId: string, resumeId: string) {
    const resume = await this.findOwned(userId, resumeId);
    if (resume.status !== ResumeStatus.PUBLISHED) {
      throw new ConflictException({
        code: 'RESUME_NOT_PUBLISHED',
        message: 'Only published resume can be returned to draft',
      });
    }
    const updated = await this.prisma.resume.update({
      where: { id: resumeId },
      data: { status: ResumeStatus.DRAFT },
      include: resumeInclude,
    });
    return {
      ...this.withDesiredSalary(updated),
      completion: this.resumeCompletion(updated),
    };
  }

  async archive(userId: string, resumeId: string) {
    await this.findOwned(userId, resumeId);
    const updated = await this.prisma.resume.update({
      where: { id: resumeId },
      data: { status: ResumeStatus.ARCHIVED },
      include: resumeInclude,
    });
    return {
      ...this.withDesiredSalary(updated),
      completion: this.resumeCompletion(updated),
    };
  }

  async copy(userId: string, resumeId: string) {
    const resume = await this.findOwnedWithRelations(userId, resumeId);
    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.resume.create({
        data: {
          userId,
          candidateProfileId: resume.candidateProfileId,
          title: `${resume.title} (копия)`.slice(0, 200),
          status: ResumeStatus.DRAFT,
          isPrimary: false,
          desiredPosition: resume.desiredPosition,
          specialization: resume.specialization,
          summary: resume.summary,
          experienceYears: resume.experienceYears,
          desiredSalaryMin: resume.desiredSalaryMin,
          desiredSalaryMax: resume.desiredSalaryMax,
          salaryCurrency: resume.salaryCurrency,
          employmentType: resume.employmentType,
          workSchedule: resume.workSchedule,
          workFormat: resume.workFormat,
          city: resume.city,
          geoPreferences:
            resume.geoPreferences === null
              ? Prisma.JsonNull
              : (resume.geoPreferences as Prisma.InputJsonValue),
          isPublic: resume.isPublic,
        },
      });
      await tx.resumeExperience.createMany({
        data: resume.experiences.map((item) => ({
          resumeId: copy.id,
          companyName: item.companyName,
          position: item.position,
          startDate: item.startDate,
          endDate: item.endDate,
          isCurrent: item.isCurrent,
          description: item.description,
          achievements: item.achievements,
          technologies: item.technologies,
          sortOrder: item.sortOrder,
        })),
      });
      await tx.resumeEducation.createMany({
        data: resume.educations.map((item) => ({
          resumeId: copy.id,
          institution: item.institution,
          faculty: item.faculty,
          specialization: item.specialization,
          degree: item.degree,
          startDate: item.startDate,
          endDate: item.endDate,
          isIncomplete: item.isIncomplete,
          description: item.description,
          sortOrder: item.sortOrder,
        })),
      });
      await tx.resumeSkill.createMany({
        data: resume.skills.map((item) => ({
          resumeId: copy.id,
          name: item.name,
          category: item.category,
          level: item.level,
          sortOrder: item.sortOrder,
        })),
      });
      await tx.resumeLanguage.createMany({
        data: resume.languages.map((item) => ({
          resumeId: copy.id,
          name: item.name,
          level: item.level,
          sortOrder: item.sortOrder,
        })),
      });
      await tx.resumeCertification.createMany({
        data: resume.certifications.map((item) => ({
          resumeId: copy.id,
          name: item.name,
          issuer: item.issuer,
          issuedAt: item.issuedAt,
          expiresAt: item.expiresAt,
          url: item.url,
          sortOrder: item.sortOrder,
        })),
      });
      await tx.resumePortfolioLink.createMany({
        data: resume.portfolioLinks.map((item) => ({
          resumeId: copy.id,
          title: item.title,
          description: item.description,
          url: item.url,
          technologies: item.technologies,
          sortOrder: item.sortOrder,
        })),
      });
      const copied = await tx.resume.findUnique({
        where: { id: copy.id },
        include: resumeInclude,
      });
      return copied
        ? {
            ...this.withDesiredSalary(copied),
            completion: this.resumeCompletion(copied),
          }
        : copied;
    });
  }

  async remove(userId: string, resumeId: string) {
    const resume = await this.findOwned(userId, resumeId);
    if (resume.status !== ResumeStatus.DRAFT) {
      throw new ConflictException({
        code: 'RESUME_DELETE_REQUIRES_DRAFT',
        message: 'Only draft resumes can be deleted',
      });
    }
    const applicationCount = await this.prisma.application.count({
      where: { resumeId },
    });
    if (applicationCount > 0) {
      throw new ConflictException({
        code: 'RESUME_USED_IN_APPLICATION',
        message:
          'Resume cannot be deleted because it is used in application history',
      });
    }
    if (resume.storageKey) {
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
      const updated = await tx.resume.update({
        where: { id: resume.id },
        data: { isPrimary: true },
      });
      return this.withDesiredSalary(updated);
    });
  }

  private withDesiredSalary<
    T extends {
      desiredSalaryMin: number | null;
      desiredSalaryMax: number | null;
      salaryCurrency: string;
    },
  >(
    resume: T,
  ): Omit<T, 'desiredSalaryMin' | 'desiredSalaryMax' | 'salaryCurrency'> & {
    desiredSalary: number | null;
  } {
    const {
      desiredSalaryMin,
      desiredSalaryMax,
      salaryCurrency,
      ...publicResume
    } = resume;
    return {
      ...publicResume,
      desiredSalary:
        salaryCurrency === 'RUB'
          ? (desiredSalaryMin ?? desiredSalaryMax)
          : null,
    };
  }

  private validateDesiredSalary(desiredSalary?: number | null) {
    if (
      desiredSalary !== undefined &&
      desiredSalary !== null &&
      desiredSalary < 1
    ) {
      throw new BadRequestException({
        code: 'INVALID_DESIRED_SALARY',
        message: 'Desired salary must be greater than zero',
      });
    }
  }

  private async findOwnedWithRelations(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId,
        candidateProfile: { userId },
      },
      include: {
        ...resumeInclude,
      },
    });
    if (!resume)
      throw new NotFoundException({
        code: 'RESUME_NOT_FOUND',
        message: 'Resume not found',
      });
    return resume;
  }

  private async replaceNestedData(
    tx: Prisma.TransactionClient,
    resumeId: string,
    dto: CreateStructuredResumeDto,
  ) {
    await tx.resumeExperience.createMany({
      data: (dto.experiences ?? []).map((item) => ({
        resumeId,
        companyName: item.companyName,
        position: item.position,
        startDate: new Date(item.startDate),
        endDate:
          item.endDate && !item.isCurrent ? new Date(item.endDate) : null,
        isCurrent: item.isCurrent ?? false,
        description: item.description?.trim() || null,
        achievements: item.achievements?.trim() || null,
        technologies: item.technologies ?? [],
        sortOrder: item.sortOrder ?? 0,
      })),
    });
    await tx.resumeEducation.createMany({
      data: (dto.educations ?? []).map((item) => ({
        resumeId,
        institution: item.institution,
        faculty: item.faculty?.trim() || null,
        specialization: item.specialization,
        degree: item.degree?.trim() || null,
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate:
          item.isIncomplete || !item.endDate ? null : new Date(item.endDate),
        isIncomplete: item.isIncomplete ?? false,
        description: item.description?.trim() || null,
        sortOrder: item.sortOrder ?? 0,
      })),
    });
    await tx.resumeSkill.createMany({
      data: (dto.skills ?? []).map((item) => ({
        resumeId,
        name: item.name.trim(),
        category: item.category?.trim() || null,
        level: item.level?.trim() || null,
        sortOrder: item.sortOrder ?? 0,
      })),
    });
    await tx.resumeLanguage.createMany({
      data: (dto.languages ?? []).map((item) => ({
        resumeId,
        name: item.name.trim(),
        level: item.level,
        sortOrder: item.sortOrder ?? 0,
      })),
    });
    await tx.resumeCertification.createMany({
      data: (dto.certifications ?? []).map((item) => ({
        resumeId,
        name: item.name,
        issuer: item.issuer?.trim() || null,
        issuedAt: item.issuedAt ? new Date(item.issuedAt) : null,
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
        url: item.url?.trim() || null,
        sortOrder: item.sortOrder ?? 0,
      })),
    });
    await tx.resumePortfolioLink.createMany({
      data: (dto.portfolioLinks ?? []).map((item) => ({
        resumeId,
        title: item.title,
        description: item.description?.trim() || null,
        url: item.url,
        technologies: item.technologies ?? [],
        sortOrder: item.sortOrder ?? 0,
      })),
    });
  }

  private async replaceSkillsIfProvided(
    tx: Prisma.TransactionClient,
    resumeId: string,
    dto: UpdateStructuredResumeDto,
  ) {
    if (dto.skills !== undefined) {
      await tx.resumeSkill.deleteMany({ where: { resumeId } });
      if (dto.skills.length) {
        await tx.resumeSkill.createMany({
          data: dto.skills.map((item) => ({
            resumeId,
            name: item.name.trim(),
            category: item.category?.trim() || null,
            level: item.level?.trim() || null,
            sortOrder: item.sortOrder ?? 0,
          })),
        });
      }
    }
  }

  private resumeCompletion(resume: {
    title: string;
    storageKey?: string | null;
    desiredPosition?: string | null;
    specialization?: string | null;
    summary?: string | null;
    city?: string | null;
    desiredSalaryMin?: number | null;
    desiredSalaryMax?: number | null;
    workFormat?: unknown | null;
    employmentType?: unknown | null;
    experiences?: unknown[];
    educations?: unknown[];
    skills?: unknown[];
    languages?: unknown[];
    certifications?: unknown[];
    portfolioLinks?: unknown[];
  }) {
    const sections = [
      {
        key: 'main',
        title: 'Основная информация',
        complete: Boolean(
          resume.desiredPosition?.trim() &&
          resume.summary?.trim() &&
          resume.city?.trim(),
        ),
      },
      {
        key: 'experience',
        title: 'Опыт работы',
        complete: Boolean(
          resume.experiences?.length &&
          resume.experiences.every((item) => {
            const experience = item as {
              companyName?: string;
              position?: string;
              startDate?: Date | string | null;
              endDate?: Date | string | null;
              isCurrent?: boolean;
            };
            return Boolean(
              experience.companyName?.trim() &&
              experience.position?.trim() &&
              experience.startDate &&
              (experience.isCurrent
                ? !experience.endDate
                : Boolean(experience.endDate)),
            );
          }),
        ),
      },
      {
        key: 'education',
        title: 'Образование',
        complete: Boolean(
          resume.educations?.length &&
          resume.educations.every((item) => {
            const education = item as {
              institution?: string;
              specialization?: string;
              startDate?: Date | string | null;
              endDate?: Date | string | null;
              isIncomplete?: boolean;
            };
            return Boolean(
              education.institution?.trim() &&
              education.specialization?.trim() &&
              education.startDate &&
              (education.isIncomplete
                ? !education.endDate
                : Boolean(education.endDate)),
            );
          }),
        ),
      },
      {
        key: 'skills',
        title: 'Навыки',
        complete: Boolean(resume.skills?.length),
      },
      {
        key: 'languages',
        title: 'Языки',
        complete: Boolean(resume.languages?.length),
      },
      {
        key: 'certifications',
        title: 'Сертификаты',
        complete: Boolean(resume.certifications?.length),
      },
      {
        key: 'portfolio',
        title: 'Портфолио',
        complete: Boolean(resume.portfolioLinks?.length),
      },
    ];
    const completeCount = sections.filter((section) => section.complete).length;
    const isLegacyFile = Boolean(resume.storageKey);
    const missing = isLegacyFile
      ? []
      : sections
          .filter((section) => !section.complete)
          .map((section) => section.title);
    return {
      percent: isLegacyFile
        ? 100
        : Math.round((completeCount / sections.length) * 100),
      sections,
      missing,
      canPublish: isLegacyFile
        ? Boolean(resume.title.trim())
        : sections.slice(0, 5).every((section) => section.complete),
    };
  }

  private async findCandidateProfile(userId: string) {
    return this.prisma.candidateProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true, userId: true },
    });
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
