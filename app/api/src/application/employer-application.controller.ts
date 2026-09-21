import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import { EmployerApplicationListQueryDto } from './dto/employer-application-list-query.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
import { ApplicationService } from './application.service.js';

@ApiTags('Employer Applications')
@ApiBearerAuth()
@Controller('employer/:employerId/applications')
export class EmployerApplicationController {
  constructor(private readonly service: ApplicationService) {}

  @Get()
  @Roles(UserRole.EMPLOYER)
  list(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Query() query: EmployerApplicationListQueryDto,
  ) {
    return this.service.listEmployerApplications(
      user.sub,
      user.role,
      employerId,
      query,
    );
  }

  @Get(':applicationId')
  @Roles(UserRole.EMPLOYER)
  getOne(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.service.getEmployerApplication(
      user.sub,
      user.role,
      employerId,
      applicationId,
    );
  }

  @Post(':applicationId/view')
  @Roles(UserRole.EMPLOYER)
  view(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.service.markViewed(
      user.sub,
      user.role,
      employerId,
      applicationId,
    );
  }

  @Post(':applicationId/status')
  @Roles(UserRole.EMPLOYER)
  changeStatus(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.service.changeApplicationStatus(
      user.sub,
      user.role,
      employerId,
      applicationId,
      dto,
    );
  }

  @Patch(':applicationId/comment')
  @Roles(UserRole.EMPLOYER)
  comment(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: { comment: string },
  ) {
    return this.service.updateEmployerComment(
      user.sub,
      user.role,
      employerId,
      applicationId,
      dto,
    );
  }

  @Get(':applicationId/history')
  @Roles(UserRole.EMPLOYER)
  history(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.service.getEmployerHistory(
      user.sub,
      user.role,
      employerId,
      applicationId,
    );
  }
}
