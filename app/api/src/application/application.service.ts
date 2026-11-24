import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  NotificationType,
  Prisma,
  ResumeStatus,
  UserRole,
  VacancyStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApplicationListQueryDto } from './dto/application-list-query.dto.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { EmployerApplicationListQueryDto } from './dto/employer-application-list-query.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const candidateResumeSelect = {
  id: true,
  title: true,
  desiredPosition: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  isPrimary: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  [ApplicationStatus.NEW]: 'новый',
  [ApplicationStatus.VIEWED]: 'просмотрен',
  [ApplicationStatus.IN_REVIEW]: 'рассматривается',
  [ApplicationStatus.INTERVIEW]: 'собеседование',
  [ApplicationStatus.OFFER]: 'предложение о работе',
  [ApplicationStatus.HIRED]: 'принят на работу',
  [ApplicationStatus.REJECTED]: 'отказ',
  [ApplicationStatus.WITHDRAWN]: 'отозван',
};

const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.NEW]: [
    ApplicationStatus.VIEWED,
    ApplicationStatus.IN_REVIEW,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.VIEWED]: [
    ApplicationStatus.NEW,
    ApplicationStatus.IN_REVIEW,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.IN_REVIEW]: [
    ApplicationStatus.VIEWED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.INTERVIEW]: [
    ApplicationStatus.OFFER,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.OFFER]: [
    ApplicationStatus.HIRED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.HIRED]: [],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  validateStatusTransition(
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
  ) {
    return allowedTransitions[fromStatus]?.includes(toStatus) ?? false;
  }

  async createApplication(
    userId: string,
    userRole: UserRole,
    dto: CreateApplicationDto,
  ) {
    if (userRole !== UserRole.CANDIDATE)
      throw new ForbiddenException({
        code: 'APPLICATION_ROLE_FORBIDDEN',
        message: 'Only candidates can apply for vacancies',
      });

    const vacancy = await this.prisma.vacancy.findUnique({
      where: { id: dto.vacancyId },
      include: {
        employer: {
          select: { members: { select: { userId: true } } },
        },
      },
    });
    if (!vacancy)
      throw new NotFoundException({
        code: 'VACANCY_NOT_FOUND',
        message: 'Vacancy not found',
      });
    if (vacancy.status !== VacancyStatus.PUBLISHED)
      throw new BadRequestException({
        code: 'VACANCY_NOT_PUBLISHED',
        message: 'Only published vacancies can receive applications',
      });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== UserRole.CANDIDATE)
      throw new ForbiddenException({
        code: 'APPLICATION_ROLE_FORBIDDEN',
        message: 'Only candidates can apply for vacancies',
      });

    let resumeId: string | undefined;
    let resumeSnapshot: Prisma.InputJsonObject | null = null;
    if (dto.resumeId) {
      const resume = await this.prisma.resume.findFirst({
        where: {
          id: dto.resumeId,
          userId,
          candidateProfile: { userId },
        },
        include: {
          experiences: {
            orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
          },
          educations: {
            orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
          },
          skills: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
          languages: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
          certifications: {
            orderBy: [{ sortOrder: 'asc' }, { issuedAt: 'desc' }],
          },
          portfolioLinks: { orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] },
        },
      });
      if (!resume)
        throw new NotFoundException({
          code: 'RESUME_NOT_FOUND',
          message: 'Resume not found',
        });
      if (resume.status !== ResumeStatus.PUBLISHED)
        throw new BadRequestException({
          code: 'RESUME_NOT_PUBLISHED',
          message: 'Only published resumes can be attached to applications',
        });
      resumeId = resume.id;
      resumeSnapshot = {
        resumeId: resume.id,
        title: resume.title,
        desiredPosition: resume.desiredPosition,
        specialization: resume.specialization,
        summary: resume.summary,
        experienceYears: resume.experienceYears,
        desiredSalary: resume.desiredSalaryMin ?? resume.desiredSalaryMax,
        employmentType: resume.employmentType,
        workSchedule: resume.workSchedule,
        workFormat: resume.workFormat,
        city: resume.city,
        geoPreferences: resume.geoPreferences as Prisma.JsonObject | null,
        experiences: resume.experiences.map((item) => ({
          companyName: item.companyName,
          position: item.position,
          startDate: item.startDate?.toISOString() ?? null,
          endDate: item.endDate?.toISOString() ?? null,
          isCurrent: item.isCurrent,
          description: item.description,
          achievements: item.achievements,
          technologies: item.technologies,
          sortOrder: item.sortOrder,
        })),
        educations: resume.educations.map((item) => ({
          institution: item.institution,
          faculty: item.faculty,
          specialization: item.specialization,
          degree: item.degree,
          startDate: item.startDate?.toISOString() ?? null,
          endDate: item.endDate?.toISOString() ?? null,
          isIncomplete: item.isIncomplete,
          description: item.description,
          sortOrder: item.sortOrder,
        })),
        skills: resume.skills.map((item) => ({
          name: item.name,
          category: item.category,
          level: item.level,
          sortOrder: item.sortOrder,
        })),
        languages: resume.languages.map((item) => ({
          name: item.name,
          level: item.level,
          sortOrder: item.sortOrder,
        })),
        certifications: resume.certifications.map((item) => ({
          name: item.name,
          issuer: item.issuer,
          issuedAt: item.issuedAt?.toISOString() ?? null,
          expiresAt: item.expiresAt?.toISOString() ?? null,
          url: item.url,
          sortOrder: item.sortOrder,
        })),
        portfolioLinks: resume.portfolioLinks.map((item) => ({
          title: item.title,
          description: item.description,
          url: item.url,
          technologies: item.technologies,
          sortOrder: item.sortOrder,
        })),
      };
    }

    const existing = await this.prisma.application.findFirst({
      where: { vacancyId: dto.vacancyId, candidateId: userId },
    });
    if (existing)
      throw new ConflictException({
        code: 'APPLICATION_ALREADY_EXISTS',
        message: 'Application already exists for this vacancy',
      });

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          vacancyId: dto.vacancyId,
          candidateId: userId,
          ...(resumeId ? { resumeId } : {}),
          ...(resumeSnapshot ? { resumeSnapshot } : {}),
          status: ApplicationStatus.NEW,
          coverLetter: dto.coverLetter?.trim() || null,
          candidateComment: dto.candidateComment?.trim() || null,
        },
      });

      await tx.conversation.create({
        data: { applicationId: created.id },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: created.id,
          actorId: userId,
          actorRole: UserRole.CANDIDATE,
          fromStatus: null,
          toStatus: ApplicationStatus.NEW,
          comment:
            dto.coverLetter?.trim() || dto.candidateComment?.trim() || null,
        },
      });
      await this.notifications.enqueue(tx, {
        eventKey: `application-created:${created.id}`,
        userIds: vacancy.employer?.members.map((member) => member.userId) ?? [],
        type: NotificationType.NEW_APPLICATION,
        title: 'Новый отклик',
        message: vacancy.title
          ? `На вакансию «${vacancy.title}» поступил новый отклик.`
          : 'На вашу вакансию поступил новый отклик.',
        data: {
          entityType: 'application',
          entityId: created.id,
          href: `/employer/applications/${created.id}`,
        },
      });

      return created;
    });
  }

  async listCandidateApplications(
    userId: string,
    query: ApplicationListQueryDto,
  ) {
    const where = {
      candidateId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.vacancyId ? { vacancyId: query.vacancyId } : {}),
    };

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        include: {
          vacancy: {
            select: {
              id: true,
              title: true,
              status: true,
              employer: {
                select: { id: true, legalName: true, shortName: true },
              },
            },
          },
          resume: { select: candidateResumeSelect },
        },
        orderBy: { [query.sort]: query.direction },
        skip,
        take: query.limit,
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getCandidateApplication(userId: string, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        vacancy: true,
        resume: { select: candidateResumeSelect },
      },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.candidateId !== userId)
      throw new ForbiddenException({
        code: 'APPLICATION_ACCESS_DENIED',
        message: 'Application access denied',
      });
    return {
      ...application,
      resumeSnapshot: this.normalizeResumeSnapshot(application.resumeSnapshot),
    };
  }

  async withdrawApplication(userId: string, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.candidateId !== userId)
      throw new ForbiddenException({
        code: 'APPLICATION_ACCESS_DENIED',
        message: 'Application access denied',
      });
    if (this.isFinalStatus(application.status))
      throw new BadRequestException({
        code: 'APPLICATION_WITHDRAW_NOT_ALLOWED',
        message: 'Final application status cannot be withdrawn',
      });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.WITHDRAWN },
      });
      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          actorId: userId,
          actorRole: UserRole.CANDIDATE,
          fromStatus: application.status,
          toStatus: ApplicationStatus.WITHDRAWN,
          comment: 'Candidate withdrew application',
        },
      });
      return updated;
    });
  }

  async getCandidateHistory(userId: string, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { candidateId: true },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.candidateId !== userId)
      throw new ForbiddenException({
        code: 'APPLICATION_ACCESS_DENIED',
        message: 'Application access denied',
      });
    return this.prisma.applicationStatusHistory.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, role: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async listEmployerApplications(
    userId: string,
    userRole: UserRole,
    employerId: string,
    query: EmployerApplicationListQueryDto,
  ) {
    await this.assertEmployerAccess(userId, userRole, employerId);

    const where = {
      vacancy: { employerId },
      ...(query.vacancyId ? { vacancyId: query.vacancyId } : {}),
      ...(query.candidateId ? { candidateId: query.candidateId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              candidateProfile: {
                select: {
                  isPublic: true,
                  hideFromEmployers: true,
                  showContacts: true,
                },
              },
            },
          },
          vacancy: {
            select: {
              id: true,
              title: true,
              employerId: true,
            },
          },
        },
        orderBy: { [query.sort]: query.direction },
        skip,
        take: query.limit,
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      items: items.map((application) => {
        const profile = application.candidate.candidateProfile;
        if (profile?.hideFromEmployers || profile?.isPublic === false) {
          return {
            ...application,
            candidate: {
              ...application.candidate,
              firstName: 'Кандидат',
              lastName: '',
              email: null,
            },
          };
        }
        return {
          ...application,
          candidate: {
            ...application.candidate,
            email:
              profile?.showContacts === false
                ? null
                : application.candidate.email,
          },
        };
      }),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getEmployerApplication(
    userId: string,
    userRole: UserRole,
    employerId: string,
    applicationId: string,
  ) {
    await this.assertEmployerAccess(userId, userRole, employerId);
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        vacancy: true,
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            candidateProfile: {
              select: {
                isPublic: true,
                hideFromEmployers: true,
                showContacts: true,
              },
            },
          },
        },
        resume: { select: candidateResumeSelect },
      },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.vacancy.employerId !== employerId)
      throw new BadRequestException({
        code: 'APPLICATION_EMPLOYER_MISMATCH',
        message: 'Application belongs to another employer',
      });
    const profile = application.candidate.candidateProfile;
    if (profile?.hideFromEmployers || profile?.isPublic === false) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_AVAILABLE',
        message: 'Application candidate is not available',
      });
    }
    return {
      ...application,
      resumeSnapshot: this.normalizeResumeSnapshot(application.resumeSnapshot),
      candidate: {
        ...application.candidate,
        email:
          profile?.showContacts === false ? null : application.candidate.email,
      },
    };
  }

  async getEmployerApplicationResume(
    userId: string,
    userRole: UserRole,
    employerId: string,
    applicationId: string,
  ) {
    await this.assertEmployerAccess(userId, userRole, employerId);
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        resumeSnapshot: true,
        resume: { select: candidateResumeSelect },
        vacancy: { select: { employerId: true } },
        candidate: {
          select: {
            id: true,
            candidateProfile: {
              select: {
                isPublic: true,
                hideFromEmployers: true,
                showContacts: true,
              },
            },
          },
        },
      },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.vacancy.employerId !== employerId)
      throw new BadRequestException({
        code: 'APPLICATION_EMPLOYER_MISMATCH',
        message: 'Application belongs to another employer',
      });
    if (
      application.candidate.candidateProfile?.hideFromEmployers ||
      application.candidate.candidateProfile?.isPublic === false
    ) {
      throw new NotFoundException({
        code: 'RESUME_NOT_AVAILABLE',
        message: 'Resume is not available to employers',
      });
    }
    if (!application.resumeSnapshot) {
      throw new NotFoundException({
        code: 'RESUME_SNAPSHOT_NOT_FOUND',
        message: 'This application has no resume snapshot',
      });
    }
    return {
      resumeSnapshot: this.normalizeResumeSnapshot(application.resumeSnapshot),
      resume: application.resume,
    };
  }

  async updateEmployerComment(
    userId: string,
    userRole: UserRole,
    employerId: string,
    applicationId: string,
    dto: { comment?: string },
  ) {
    await this.assertEmployerAccess(userId, userRole, employerId);
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.vacancy.employerId !== employerId)
      throw new BadRequestException({
        code: 'APPLICATION_EMPLOYER_MISMATCH',
        message: 'Application belongs to another employer',
      });
    const comment = dto.comment?.trim() ?? '';
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { employerComment: comment || null },
    });
  }

  async markViewed(
    userId: string,
    userRole: UserRole,
    employerId: string,
    applicationId: string,
  ) {
    await this.assertEmployerAccess(userId, userRole, employerId);
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.vacancy.employerId !== employerId)
      throw new BadRequestException({
        code: 'APPLICATION_EMPLOYER_MISMATCH',
        message: 'Application belongs to another employer',
      });
    if (application.status === ApplicationStatus.NEW) {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.application.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.VIEWED, viewedAt: new Date() },
        });
        const history = await tx.applicationStatusHistory.create({
          data: {
            applicationId,
            actorId: userId,
            actorRole: userRole,
            fromStatus: ApplicationStatus.NEW,
            toStatus: ApplicationStatus.VIEWED,
            comment: 'Application marked as viewed',
          },
        });
        await this.notifications.enqueue(tx, {
          eventKey: `application-status:${history.id}`,
          userIds: [application.candidateId],
          type: NotificationType.APPLICATION_STATUS_CHANGED,
          title: 'Изменился статус отклика',
          message: application.vacancy.title
            ? `Статус отклика на вакансию «${application.vacancy.title}» изменён: ${applicationStatusLabels[ApplicationStatus.VIEWED]}.`
            : `Статус отклика изменён: ${applicationStatusLabels[ApplicationStatus.VIEWED]}.`,
          data: {
            entityType: 'application',
            entityId: applicationId,
            href: `/candidate/applications/${applicationId}`,
          },
        });
        return updated;
      });
    }
    return application;
  }

  async changeApplicationStatus(
    userId: string,
    userRole: UserRole,
    employerId: string,
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    await this.assertEmployerAccess(userId, userRole, employerId);
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { vacancy: true },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.vacancy.employerId !== employerId)
      throw new BadRequestException({
        code: 'APPLICATION_EMPLOYER_MISMATCH',
        message: 'Application belongs to another employer',
      });

    if (!this.validateStatusTransition(application.status, dto.status))
      throw new BadRequestException({
        code: 'APPLICATION_INVALID_STATUS_TRANSITION',
        message: `Cannot transition application from ${application.status} to ${dto.status}`,
      });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: dto.status,
          ...(dto.status === ApplicationStatus.VIEWED
            ? { viewedAt: new Date() }
            : {}),
        },
      });
      const history = await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          actorId: userId,
          actorRole: userRole,
          fromStatus: application.status,
          toStatus: dto.status,
          comment: dto.comment?.trim() || null,
        },
      });
      await this.notifications.enqueue(tx, {
        eventKey: `application-status:${history.id}`,
        userIds: [application.candidateId],
        type: NotificationType.APPLICATION_STATUS_CHANGED,
        title: 'Изменился статус отклика',
        message: application.vacancy.title
          ? `Статус отклика на вакансию «${application.vacancy.title}» изменён: ${applicationStatusLabels[dto.status]}.`
          : `Статус отклика изменён: ${applicationStatusLabels[dto.status]}.`,
        data: {
          entityType: 'application',
          entityId: applicationId,
          href: `/candidate/applications/${applicationId}`,
        },
      });
      return updated;
    });
  }

  async getEmployerHistory(
    userId: string,
    userRole: UserRole,
    employerId: string,
    applicationId: string,
  ) {
    await this.assertEmployerAccess(userId, userRole, employerId);
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, vacancy: { select: { employerId: true } } },
    });
    if (!application)
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found',
      });
    if (application.vacancy.employerId !== employerId)
      throw new BadRequestException({
        code: 'APPLICATION_EMPLOYER_MISMATCH',
        message: 'Application belongs to another employer',
      });
    return this.prisma.applicationStatusHistory.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, role: true, firstName: true, lastName: true },
        },
      },
    });
  }

  private async assertEmployerAccess(
    userId: string,
    userRole: UserRole,
    employerId: string,
  ) {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR) return;
    if (userRole !== UserRole.EMPLOYER)
      throw new ForbiddenException({
        code: 'EMPLOYER_ACCESS_DENIED',
        message: 'Employer access denied',
      });
    const member = await this.prisma.employerMember.findUnique({
      where: { employerId_userId: { employerId, userId } },
    });
    if (!member)
      throw new ForbiddenException({
        code: 'EMPLOYER_ACCESS_DENIED',
        message: 'Employer access denied',
      });
    if (!['OWNER', 'ADMIN', 'HR', 'RECRUITER'].includes(member.memberRole)) {
      throw new ForbiddenException({
        code: 'EMPLOYER_ACCESS_DENIED',
        message: 'Employer access denied',
      });
    }
  }

  private normalizeResumeSnapshot(
    snapshot: Prisma.JsonValue | null,
  ): Record<string, unknown> | null {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return null;
    }
    const value = snapshot as Record<string, unknown>;
    const desiredSalary =
      typeof value.desiredSalary === 'number'
        ? value.desiredSalary
        : typeof value.desiredSalaryMin === 'number'
          ? value.desiredSalaryMin
          : typeof value.desiredSalaryMax === 'number'
            ? value.desiredSalaryMax
            : null;
    const educations = Array.isArray(value.educations)
      ? value.educations.map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return item;
          }
          const education = item as Record<string, unknown>;
          const normalized = { ...education };
          if (
            !normalized.startDate &&
            typeof normalized.startYear === 'number'
          ) {
            normalized.startDate = `${normalized.startYear}-01-01T00:00:00.000Z`;
          }
          if (!normalized.endDate && typeof normalized.endYear === 'number') {
            normalized.endDate = `${normalized.endYear}-01-01T00:00:00.000Z`;
          }
          return normalized;
        })
      : value.educations;
    return { ...value, desiredSalary, educations };
  }

  private isFinalStatus(status: ApplicationStatus) {
    return (
      status === ApplicationStatus.HIRED ||
      status === ApplicationStatus.REJECTED ||
      status === ApplicationStatus.WITHDRAWN
    );
  }
}
