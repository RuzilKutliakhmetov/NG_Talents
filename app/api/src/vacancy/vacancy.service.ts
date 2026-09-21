import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployerMemberRole,
  Prisma,
  RequirementType,
  VacancyModerationAction,
  UserRole,
  VacancyStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateVacancyDto,
  UpdateVacancyDto,
  VacancyQueryDto,
  RejectVacancyDto,
  VacancyRequirementInput,
  VacancyCertificationInput,
} from './dto/index.js';

const publicInclude = {
  employer: { select: { id: true, legalName: true, shortName: true } },
  requirements: { orderBy: { sortOrder: 'asc' as const } },
  certifications: { orderBy: { createdAt: 'asc' as const } },
};

const managementInclude = {
  ...publicInclude,
  createdBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
};

@Injectable()
export class VacancyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    userRole: UserRole,
    employerId: string,
    dto: CreateVacancyDto,
  ) {
    await this.assertCanManageEmployer(userId, userRole, employerId);
    this.validateSalary(dto.salaryMin, dto.salaryMax);
    const data = this.vacancyData(dto);
    try {
      return await this.prisma.$transaction(async (tx) =>
        tx.vacancy.create({
          data: {
            ...data,
            employer: { connect: { id: employerId } },
            createdBy: { connect: { id: userId } },
            slug: this.makeSlug(dto.title),
            requirements: {
              create: this.requirementsData(dto.requirementsList),
            },
            certifications: {
              create: this.certificationsData(dto.certifications),
            },
          } as Prisma.VacancyCreateInput,
          include: managementInclude,
        }),
      );
    } catch (error) {
      if (this.isUniqueError(error))
        throw new ConflictException({
          code: 'VACANCY_SLUG_ALREADY_EXISTS',
          message: 'Vacancy slug already exists',
        });
      throw error;
    }
  }

  async update(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
    dto: UpdateVacancyDto,
  ) {
    await this.assertCanManageEmployer(userId, userRole, employerId);
    const vacancy = await this.findManagementVacancy(employerId, vacancyId);
    if (
      vacancy.status === VacancyStatus.PUBLISHED ||
      vacancy.status === VacancyStatus.PAUSED
    )
      throw new BadRequestException({
        code: 'VACANCY_EDIT_NOT_ALLOWED',
        message: 'Published vacancies must be paused before editing',
      });
    this.validateSalary(
      dto.salaryMin ?? vacancy.salaryMin,
      dto.salaryMax ?? vacancy.salaryMax,
    );
    const data = this.vacancyData(dto);
    return this.prisma.$transaction(async (tx) => {
      if (dto.requirementsList !== undefined)
        await tx.vacancyRequirement.deleteMany({ where: { vacancyId } });
      if (dto.certifications !== undefined)
        await tx.vacancyCertification.deleteMany({ where: { vacancyId } });
      return tx.vacancy.update({
        where: { id: vacancyId },
        data: {
          ...data,
          ...(dto.title ? { slug: this.makeSlug(dto.title) } : {}),
          requirements:
            dto.requirementsList === undefined
              ? undefined
              : { create: this.requirementsData(dto.requirementsList) },
          certifications:
            dto.certifications === undefined
              ? undefined
              : { create: this.certificationsData(dto.certifications) },
        },
        include: managementInclude,
      });
    });
  }

  async remove(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
  ) {
    await this.assertCanManageEmployer(userId, userRole, employerId);
    const vacancy = await this.findManagementVacancy(employerId, vacancyId);
    if (vacancy.status === VacancyStatus.ARCHIVED)
      return this.mapManagement(vacancy);
    if (
      vacancy.status === VacancyStatus.PUBLISHED ||
      vacancy.status === VacancyStatus.PAUSED
    ) {
      await this.prisma.vacancy.update({
        where: { id: vacancyId },
        data: { status: VacancyStatus.CLOSED, closedAt: new Date() },
      });
    }
    return this.prisma.vacancy.update({
      where: { id: vacancyId },
      data: { status: VacancyStatus.ARCHIVED },
      include: managementInclude,
    });
  }

  async getPublic(vacancyId: string) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id: vacancyId, status: VacancyStatus.PUBLISHED },
      include: publicInclude,
    });
    if (!vacancy) throw this.notFound();
    return this.mapPublic(vacancy);
  }

  async listPublic(query: VacancyQueryDto) {
    const where = this.publicWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vacancy.findMany({
        where,
        include: publicInclude,
        orderBy: { [query.sort]: query.direction },
        skip,
        take: query.limit,
      }),
      this.prisma.vacancy.count({ where }),
    ]);
    return {
      items: items.map((item) => this.mapPublic(item)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async listEmployer(
    userId: string,
    userRole: UserRole,
    employerId: string,
    query: VacancyQueryDto,
  ) {
    await this.assertCanAccessEmployer(userId, userRole, employerId);
    const where = {
      ...this.publicWhere(query),
      employerId,
      status: query.status,
    } as Prisma.VacancyWhereInput;
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vacancy.findMany({
        where,
        include: managementInclude,
        orderBy: { [query.sort]: query.direction },
        skip,
        take: query.limit,
      }),
      this.prisma.vacancy.count({ where }),
    ]);
    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getEmployer(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
  ) {
    await this.assertCanAccessEmployer(userId, userRole, employerId);
    return this.findManagementVacancy(employerId, vacancyId);
  }

  submit(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
  ) {
    return this.changeEmployerStatus(
      userId,
      userRole,
      employerId,
      vacancyId,
      VacancyStatus.PENDING_MODERATION,
    );
  }
  pause(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
  ) {
    return this.changeEmployerStatus(
      userId,
      userRole,
      employerId,
      vacancyId,
      VacancyStatus.PAUSED,
    );
  }
  resume(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
  ) {
    return this.changeEmployerStatus(
      userId,
      userRole,
      employerId,
      vacancyId,
      VacancyStatus.PUBLISHED,
    );
  }
  close(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
  ) {
    return this.changeEmployerStatus(
      userId,
      userRole,
      employerId,
      vacancyId,
      VacancyStatus.CLOSED,
    );
  }
  archive(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
  ) {
    return this.changeEmployerStatus(
      userId,
      userRole,
      employerId,
      vacancyId,
      VacancyStatus.ARCHIVED,
    );
  }

  async startModeration(
    actorId: string,
    actorRole: UserRole,
    vacancyId: string,
  ) {
    return this.changeModerationStatus(
      actorId,
      actorRole,
      vacancyId,
      VacancyStatus.MODERATION,
      VacancyModerationAction.START_MODERATION,
    );
  }
  async approve(actorId: string, actorRole: UserRole, vacancyId: string) {
    return this.changeModerationStatus(
      actorId,
      actorRole,
      vacancyId,
      VacancyStatus.PUBLISHED,
      VacancyModerationAction.APPROVE,
      {
        publishedAt: new Date(),
        moderationComment: null,
      },
    );
  }
  async reject(
    actorId: string,
    actorRole: UserRole,
    vacancyId: string,
    dto: RejectVacancyDto,
  ) {
    const comment = dto.comment.trim();
    if (comment.length < 3)
      throw new BadRequestException('Rejection comment is too short');
    return this.changeModerationStatus(
      actorId,
      actorRole,
      vacancyId,
      VacancyStatus.REJECTED,
      VacancyModerationAction.REJECT,
      {
        moderationComment: comment,
        publishedAt: null,
      },
    );
  }

  async listModerationAudit(vacancyId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vacancyModerationAudit.findMany({
        where: { vacancyId },
        include: { actor: { select: { id: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vacancyModerationAudit.count({ where: { vacancyId } }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        comment: item.comment,
        actor: item.actor,
        createdAt: item.createdAt,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private async changeEmployerStatus(
    userId: string,
    userRole: UserRole,
    employerId: string,
    vacancyId: string,
    next: VacancyStatus,
  ) {
    await this.assertCanManageEmployer(userId, userRole, employerId);
    const vacancy = await this.findManagementVacancy(employerId, vacancyId);
    if (!this.allowedTransition(vacancy.status, next, false))
      throw this.invalidTransition(vacancy.status, next);
    const auditAction =
      vacancy.status === VacancyStatus.REJECTED &&
      next === VacancyStatus.PENDING_MODERATION
        ? VacancyModerationAction.RESUBMIT
        : undefined;
    const updateData = {
      status: next,
      ...(next === VacancyStatus.CLOSED ? { closedAt: new Date() } : {}),
      ...(next === VacancyStatus.PUBLISHED
        ? { publishedAt: new Date(), closedAt: null }
        : {}),
    };
    if (!auditAction)
      return this.prisma.vacancy.update({
        where: { id: vacancyId },
        data: updateData,
        include: managementInclude,
      });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vacancy.update({
        where: { id: vacancyId },
        data: updateData,
        include: managementInclude,
      });
      await tx.vacancyModerationAudit.create({
        data: {
          vacancyId,
          actorId: userId,
          actorRole: userRole,
          action: auditAction,
          fromStatus: vacancy.status,
          toStatus: next,
        },
      });
      return updated;
    });
  }

  private async changeModerationStatus(
    actorId: string,
    actorRole: UserRole,
    vacancyId: string,
    next: VacancyStatus,
    action: VacancyModerationAction,
    extra: Prisma.VacancyUpdateInput = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const vacancy = await tx.vacancy.findUnique({ where: { id: vacancyId } });
      if (!vacancy) throw this.notFound();
      if (!this.allowedTransition(vacancy.status, next, true))
        throw this.invalidTransition(vacancy.status, next);
      const updated = await tx.vacancy.update({
        where: { id: vacancyId },
        data: { status: next, ...extra },
        include: managementInclude,
      });
      await tx.vacancyModerationAudit.create({
        data: {
          vacancyId,
          actorId,
          actorRole,
          action,
          fromStatus: vacancy.status,
          toStatus: next,
          comment:
            action === VacancyModerationAction.REJECT &&
            typeof extra.moderationComment === 'string'
              ? extra.moderationComment
              : undefined,
        },
      });
      return updated;
    });
  }

  private async assertCanAccessEmployer(
    userId: string,
    userRole: UserRole,
    employerId: string,
  ) {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR) return;
    await this.findMember(userId, employerId);
  }

  private async assertCanManageEmployer(
    userId: string,
    userRole: UserRole,
    employerId: string,
  ) {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR) return;
    const member = await this.findMember(userId, employerId);
    if (
      ![
        EmployerMemberRole.OWNER,
        EmployerMemberRole.ADMIN,
        EmployerMemberRole.HR,
        EmployerMemberRole.RECRUITER,
      ].includes(member.memberRole)
    )
      throw this.accessDenied();
  }

  private async findMember(userId: string, employerId: string) {
    const member = await this.prisma.employerMember.findUnique({
      where: { employerId_userId: { employerId, userId } },
    });
    if (!member) throw this.accessDenied();
    return member;
  }

  private async findManagementVacancy(employerId: string, vacancyId: string) {
    const vacancy = await this.prisma.vacancy.findFirst({
      where: { id: vacancyId, employerId },
      include: managementInclude,
    });
    if (!vacancy) throw this.notFound();
    return vacancy;
  }

  private publicWhere(query: VacancyQueryDto): Prisma.VacancyWhereInput {
    return {
      status: VacancyStatus.PUBLISHED,
      ...(query.title
        ? { title: { contains: query.title, mode: 'insensitive' } }
        : {}),
      ...(query.employmentType ? { employmentType: query.employmentType } : {}),
      ...(query.locationRegion ? { locationRegion: query.locationRegion } : {}),
      ...(query.locationCity
        ? {
            locationCity: { contains: query.locationCity, mode: 'insensitive' },
          }
        : {}),
      ...(query.workFormat ? { workFormat: query.workFormat } : {}),
      ...(query.salaryMin !== undefined
        ? { salaryMax: { gte: query.salaryMin } }
        : {}),
      ...(query.salaryMax !== undefined
        ? { salaryMin: { lte: query.salaryMax } }
        : {}),
      ...(query.certification
        ? { certifications: { some: { type: query.certification } } }
        : {}),
    };
  }

  private vacancyData(
    dto: CreateVacancyDto | UpdateVacancyDto,
  ): Prisma.VacancyUpdateInput {
    return {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      ...(dto.salaryMin !== undefined ? { salaryMin: dto.salaryMin } : {}),
      ...(dto.salaryMax !== undefined ? { salaryMax: dto.salaryMax } : {}),
      ...(dto.salaryCurrency !== undefined
        ? { currency: dto.salaryCurrency }
        : {}),
      ...(dto.salaryGross !== undefined
        ? { salaryGross: dto.salaryGross }
        : {}),
      ...(dto.employmentType !== undefined
        ? { employmentType: dto.employmentType }
        : {}),
      ...(dto.workFormat !== undefined ? { workFormat: dto.workFormat } : {}),
      ...(dto.locationRegion !== undefined
        ? { locationRegion: dto.locationRegion }
        : {}),
      ...(dto.locationCity !== undefined
        ? { locationCity: dto.locationCity }
        : {}),
      ...(dto.locationAddress !== undefined
        ? { locationAddress: dto.locationAddress }
        : {}),
      ...(dto.schedule !== undefined ? { schedule: dto.schedule } : {}),
      ...(dto.requirements !== undefined
        ? { requirementsText: dto.requirements }
        : {}),
      ...(dto.conditions !== undefined ? { conditions: dto.conditions } : {}),
      ...(dto.housingProvided !== undefined
        ? { housingProvided: dto.housingProvided }
        : {}),
      ...(dto.travelProvided !== undefined
        ? {
            travelProvided: dto.travelProvided,
            flightProvided: dto.travelProvided,
          }
        : {}),
      ...(dto.medicalInsurance !== undefined
        ? { medicalInsurance: dto.medicalInsurance }
        : {}),
    };
  }

  private requirementsData(items: VacancyRequirementInput[] = []) {
    return items.map((item) => ({
      type: RequirementType.OTHER,
      name: item.text,
      required: item.isRequired ?? true,
      sortOrder: item.sortOrder ?? 0,
    }));
  }
  private certificationsData(items: VacancyCertificationInput[] = []) {
    return items.map((item) => ({
      type: item.type,
      name: item.name,
      required: item.isRequired ?? true,
    }));
  }
  private validateSalary(min?: number | null, max?: number | null) {
    if (
      min !== undefined &&
      max !== undefined &&
      min !== null &&
      max !== null &&
      min > max
    )
      throw new BadRequestException('salaryMin must not exceed salaryMax');
  }
  private allowedTransition(
    current: VacancyStatus,
    next: VacancyStatus,
    moderation: boolean,
  ) {
    if (moderation)
      return (
        (current === VacancyStatus.PENDING_MODERATION &&
          next === VacancyStatus.MODERATION) ||
        (current === VacancyStatus.MODERATION &&
          (next === VacancyStatus.PUBLISHED ||
            next === VacancyStatus.REJECTED)) ||
        (current === VacancyStatus.REJECTED &&
          next === VacancyStatus.PENDING_MODERATION)
      );
    return (
      ((current === VacancyStatus.DRAFT ||
        current === VacancyStatus.REJECTED) &&
        next === VacancyStatus.PENDING_MODERATION) ||
      (current === VacancyStatus.PUBLISHED && next === VacancyStatus.PAUSED) ||
      ((current === VacancyStatus.PUBLISHED ||
        current === VacancyStatus.PAUSED) &&
        next === VacancyStatus.CLOSED) ||
      (current === VacancyStatus.PAUSED && next === VacancyStatus.PUBLISHED) ||
      (current === VacancyStatus.CLOSED && next === VacancyStatus.ARCHIVED)
    );
  }
  private invalidTransition(current: VacancyStatus, next: VacancyStatus) {
    return new BadRequestException({
      code: 'VACANCY_INVALID_STATUS_TRANSITION',
      message: `Cannot transition vacancy from ${current} to ${next}`,
    });
  }
  private makeSlug(title: string) {
    const base =
      title
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100) || 'vacancy';
    return `${base}-${Date.now()}`;
  }
  private mapPublic(vacancy: any) {
    const publicVacancy = { ...vacancy };
    delete publicVacancy.createdBy;
    delete publicVacancy.moderationComment;
    delete publicVacancy.status;
    return publicVacancy;
  }
  private mapManagement(vacancy: any) {
    return vacancy;
  }
  private accessDenied() {
    return new ForbiddenException({
      code: 'EMPLOYER_ACCESS_DENIED',
      message: 'Employer access denied',
    });
  }
  private notFound() {
    return new NotFoundException({
      code: 'VACANCY_NOT_FOUND',
      message: 'Vacancy not found',
    });
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
