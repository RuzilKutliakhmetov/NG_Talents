import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployerMemberRole,
  EmployerVerificationStatus,
  UserRole,
  VerificationStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEmployerDto } from './dto/create-employer.dto.js';
import { UpdateEmployerDto } from './dto/update-employer.dto.js';
import { CreateEmployerMemberDto } from './dto/create-employer-member.dto.js';
import { UpdateEmployerMemberDto } from './dto/update-employer-member.dto.js';
import { CreateEmployerVerificationDto } from './dto/create-employer-verification.dto.js';

@Injectable()
export class EmployerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateEmployerDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const employer = await tx.employer.create({
          data: { ...dto, inn: dto.inn.trim() },
        });
        await tx.employerMember.create({
          data: {
            employerId: employer.id,
            userId,
            role: 'OWNER',
            memberRole: EmployerMemberRole.OWNER,
          },
        });
        return employer;
      });
    } catch (error) {
      if (this.isUniqueError(error))
        throw new ConflictException({
          code: 'EMPLOYER_INN_ALREADY_EXISTS',
          message: 'Employer INN already exists',
        });
      throw error;
    }
  }

  async get(userId: string, userRole: UserRole, employerId: string) {
    await this.assertAccess(userId, userRole, employerId);
    const employer = await this.prisma.employer.findUnique({
      where: { id: employerId },
    });
    if (!employer)
      throw new NotFoundException({
        code: 'EMPLOYER_NOT_FOUND',
        message: 'Employer not found',
      });
    return employer;
  }

  async update(
    userId: string,
    userRole: UserRole,
    employerId: string,
    dto: UpdateEmployerDto,
  ) {
    await this.assertManagement(userId, userRole, employerId);
    try {
      return await this.prisma.employer.update({
        where: { id: employerId },
        data: dto,
      });
    } catch (error) {
      if (this.isNotFoundError(error)) throw this.notFound();
      throw error;
    }
  }

  async listMembers(userId: string, userRole: UserRole, employerId: string) {
    await this.assertAccess(userId, userRole, employerId);
    return this.prisma.employerMember.findMany({
      where: { employerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(
    userId: string,
    userRole: UserRole,
    employerId: string,
    dto: CreateEmployerMemberDto,
  ) {
    await this.assertManagement(userId, userRole, employerId);
    try {
      return await this.prisma.employerMember.create({
        data: {
          employerId,
          userId: dto.userId,
          role:
            dto.role === EmployerMemberRole.OWNER
              ? 'OWNER'
              : dto.role === EmployerMemberRole.ADMIN
                ? 'MANAGER'
                : dto.role,
          memberRole: dto.role,
        },
      });
    } catch (error) {
      if (this.isUniqueError(error))
        throw new ConflictException({
          code: 'EMPLOYER_MEMBER_ALREADY_EXISTS',
          message: 'User is already a member',
        });
      throw error;
    }
  }

  async updateMember(
    userId: string,
    userRole: UserRole,
    employerId: string,
    memberId: string,
    dto: UpdateEmployerMemberDto,
  ) {
    await this.assertManagement(userId, userRole, employerId);
    const member = await this.findMember(employerId, memberId);
    if (
      member.memberRole === EmployerMemberRole.OWNER &&
      dto.role !== EmployerMemberRole.OWNER
    )
      await this.ensureOwnerRemains(employerId, memberId);
    return this.prisma.employerMember.update({
      where: { id: memberId },
      data: {
        memberRole: dto.role,
        role:
          dto.role === EmployerMemberRole.OWNER
            ? 'OWNER'
            : dto.role === EmployerMemberRole.ADMIN
              ? 'MANAGER'
              : dto.role,
      },
    });
  }

  async removeMember(
    userId: string,
    userRole: UserRole,
    employerId: string,
    memberId: string,
  ) {
    await this.assertManagement(userId, userRole, employerId);
    const member = await this.findMember(employerId, memberId);
    if (member.memberRole === EmployerMemberRole.OWNER)
      await this.ensureOwnerRemains(employerId, memberId);
    await this.prisma.employerMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  listVerifications(employerId: string) {
    return this.prisma.employerVerification.findMany({
      where: { employerId },
      orderBy: { createdAt: 'desc' },
    });
  }
  async createVerification(
    userId: string,
    employerId: string,
    dto: CreateEmployerVerificationDto,
  ) {
    const employer = await this.prisma.employer.findUnique({
      where: { id: employerId },
    });
    if (!employer) throw this.notFound();
    const verified = dto.status === EmployerVerificationStatus.VERIFIED;
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.employerVerification.create({
        data: {
          employerId,
          status: verified
            ? VerificationStatus.VERIFIED
            : (dto.status as unknown as VerificationStatus),
          verificationStatus: dto.status,
          method: dto.method,
          verificationMethod: dto.method,
          comment: dto.comment,
          verifiedById: userId,
          verifiedAt: verified ? new Date() : null,
        },
      });
      await tx.employer.update({
        where: { id: employerId },
        data: {
          verificationStatus: verified
            ? VerificationStatus.VERIFIED
            : (dto.status as unknown as VerificationStatus),
          verifiedAt: verified ? new Date() : null,
          verifiedById: userId,
        },
      });
      return record;
    });
  }

  private async assertAccess(
    userId: string,
    userRole: UserRole,
    employerId: string,
  ) {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR) return;
    await this.findMemberByUser(employerId, userId);
  }
  private async assertManagement(
    userId: string,
    userRole: UserRole,
    employerId: string,
  ) {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR) return;
    const member = await this.findMemberByUser(employerId, userId);
    if (
      member.memberRole !== EmployerMemberRole.OWNER &&
      member.memberRole !== EmployerMemberRole.ADMIN
    )
      throw this.accessDenied();
  }
  private async findMemberByUser(employerId: string, userId: string) {
    const member = await this.prisma.employerMember.findUnique({
      where: { employerId_userId: { employerId, userId } },
    });
    if (!member) throw this.accessDenied();
    return member;
  }
  private async findMember(employerId: string, memberId: string) {
    const member = await this.prisma.employerMember.findFirst({
      where: { id: memberId, employerId },
    });
    if (!member)
      throw new NotFoundException({
        code: 'EMPLOYER_MEMBER_NOT_FOUND',
        message: 'Employer member not found',
      });
    return member;
  }
  private async ensureOwnerRemains(employerId: string, memberId: string) {
    const owners = await this.prisma.employerMember.count({
      where: {
        employerId,
        memberRole: EmployerMemberRole.OWNER,
        NOT: { id: memberId },
      },
    });
    if (!owners)
      throw new ForbiddenException({
        code: 'EMPLOYER_LAST_OWNER',
        message: 'Cannot remove the last owner',
      });
  }
  private accessDenied() {
    return new ForbiddenException({
      code: 'EMPLOYER_ACCESS_DENIED',
      message: 'Employer access denied',
    });
  }
  private notFound() {
    return new NotFoundException({
      code: 'EMPLOYER_NOT_FOUND',
      message: 'Employer not found',
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
  private isNotFoundError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    );
  }
}
