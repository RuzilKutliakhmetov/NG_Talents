import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  UserRole,
  VacancyStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApplicationListQueryDto } from './dto/application-list-query.dto.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { EmployerApplicationListQueryDto } from './dto/employer-application-list-query.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';

const candidateResumeSelect = {
  id: true,
  title: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
  constructor(private readonly prisma: PrismaService) {}

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
    if (dto.resumeId) {
      const resume = await this.prisma.resume.findFirst({
        where: {
          id: dto.resumeId,
          userId,
          candidateProfile: { userId },
        },
        select: { id: true },
      });
      if (!resume)
        throw new NotFoundException({
          code: 'RESUME_NOT_FOUND',
          message: 'Resume not found',
        });
      resumeId = resume.id;
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
          status: ApplicationStatus.NEW,
          coverLetter: dto.coverLetter?.trim() || null,
          candidateComment: dto.candidateComment?.trim() || null,
        },
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
      include: { vacancy: true, resume: { select: candidateResumeSelect } },
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
    return application;
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
      items,
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
    return application;
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
        await tx.applicationStatusHistory.create({
          data: {
            applicationId,
            actorId: userId,
            actorRole: userRole,
            fromStatus: ApplicationStatus.NEW,
            toStatus: ApplicationStatus.VIEWED,
            comment: 'Application marked as viewed',
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
      await tx.applicationStatusHistory.create({
        data: {
          applicationId,
          actorId: userId,
          actorRole: userRole,
          fromStatus: application.status,
          toStatus: dto.status,
          comment: dto.comment?.trim() || null,
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

  private isFinalStatus(status: ApplicationStatus) {
    return (
      status === ApplicationStatus.HIRED ||
      status === ApplicationStatus.REJECTED ||
      status === ApplicationStatus.WITHDRAWN
    );
  }
}
