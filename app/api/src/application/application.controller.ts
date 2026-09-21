import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import { ApplicationListQueryDto } from './dto/application-list-query.dto.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { ApplicationService } from './application.service.js';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationController {
  constructor(private readonly service: ApplicationService) {}

  @Post()
  @Roles(UserRole.CANDIDATE)
  create(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Body() dto: CreateApplicationDto,
  ) {
    return this.service.createApplication(user.sub, user.role, dto);
  }

  @Get('my')
  @Roles(UserRole.CANDIDATE)
  myApplications(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Query() query: ApplicationListQueryDto,
  ) {
    return this.service.listCandidateApplications(user.sub, query);
  }

  @Get(':id')
  @Roles(UserRole.CANDIDATE)
  getOne(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getCandidateApplication(user.sub, id);
  }

  @Post(':id/withdraw')
  @Roles(UserRole.CANDIDATE)
  withdraw(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.withdrawApplication(user.sub, id);
  }

  @Get(':id/history')
  @Roles(UserRole.CANDIDATE)
  history(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getCandidateHistory(user.sub, id);
  }
}
