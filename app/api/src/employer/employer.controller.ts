import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import { EmployerService } from './employer.service.js';
import { CreateEmployerDto } from './dto/create-employer.dto.js';
import { UpdateEmployerDto } from './dto/update-employer.dto.js';
import { CreateEmployerMemberDto } from './dto/create-employer-member.dto.js';
import { UpdateEmployerMemberDto } from './dto/update-employer-member.dto.js';
import { CreateEmployerVerificationDto } from './dto/create-employer-verification.dto.js';

@ApiTags('Employer')
@ApiBearerAuth()
@Controller('employer')
export class EmployerController {
  constructor(private readonly service: EmployerService) {}
  @Post() @Roles(UserRole.EMPLOYER) create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateEmployerDto,
  ) {
    return this.service.create(user.sub, dto);
  }
  @Get(':id') @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR) get(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(user.sub, user.role, id);
  }
  @Patch(':id')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployerDto,
  ) {
    return this.service.update(user.sub, user.role, id, dto);
  }
  @Get(':id/members')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  members(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listMembers(user.sub, user.role, id);
  }
  @Post(':id/members')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  addMember(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEmployerMemberDto,
  ) {
    return this.service.addMember(user.sub, user.role, id, dto);
  }
  @Patch(':id/members/:memberId')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  updateMember(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateEmployerMemberDto,
  ) {
    return this.service.updateMember(user.sub, user.role, id, memberId, dto);
  }
  @Delete(':id/members/:memberId')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  removeMember(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.removeMember(user.sub, user.role, id, memberId);
  }
  @Get(':id/verification')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  verification(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listVerifications(id);
  }
  @Post(':id/verification')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  createVerification(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEmployerVerificationDto,
  ) {
    return this.service.createVerification(user.sub, id, dto);
  }
}
