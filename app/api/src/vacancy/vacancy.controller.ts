import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import { VacancyService } from './vacancy.service.js';
import {
  CreateVacancyDto,
  UpdateVacancyDto,
  VacancyQueryDto,
} from './dto/index.js';

@ApiTags('Vacancies')
@Controller('vacancies')
export class VacancyController {
  constructor(private readonly service: VacancyService) {}

  @Public()
  @Get()
  @ApiQuery({ name: 'title', required: false })
  @ApiQuery({
    name: 'employmentType',
    required: false,
    enum: ['SHIFT', 'PERMANENT', 'PROJECT', 'PART_TIME', 'TEMPORARY'],
  })
  @ApiQuery({
    name: 'locationRegion',
    required: false,
    enum: ['BASHKORTOSTAN', 'KHMAO', 'YANAO', 'TATARSTAN', 'OTHER'],
  })
  @ApiQuery({
    name: 'workFormat',
    required: false,
    enum: ['ONSITE', 'HYBRID', 'REMOTE'],
  })
  @ApiQuery({ name: 'salaryMin', required: false, type: Number })
  @ApiQuery({ name: 'salaryMax', required: false, type: Number })
  @ApiQuery({
    name: 'certification',
    required: false,
    enum: ['A1', 'B1_1', 'ELECTRICAL_SAFETY', 'NAKS', 'OTHER'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['createdAt', 'salaryMin', 'salaryMax'],
  })
  @ApiQuery({ name: 'direction', required: false, enum: ['asc', 'desc'] })
  listPublic(@Query() query: VacancyQueryDto) {
    return this.service.listPublic(query);
  }

  @Public()
  @Get(':id')
  getPublic(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getPublic(id);
  }
}

@ApiTags('Employer vacancies')
@ApiBearerAuth()
@Controller('employer/:employerId/vacancies')
export class EmployerVacancyController {
  constructor(private readonly service: VacancyService) {}

  @Post()
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  create(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Body() dto: CreateVacancyDto,
  ) {
    return this.service.create(user.sub, user.role, employerId, dto);
  }

  @Get()
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  list(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Query() query: VacancyQueryDto,
  ) {
    return this.service.listEmployer(user.sub, user.role, employerId, query);
  }

  @Get(':vacancyId')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  get(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.getEmployer(user.sub, user.role, employerId, vacancyId);
  }

  @Patch(':vacancyId')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  update(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
    @Body() dto: UpdateVacancyDto,
  ) {
    return this.service.update(user.sub, user.role, employerId, vacancyId, dto);
  }

  @Delete(':vacancyId')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  remove(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.remove(user.sub, user.role, employerId, vacancyId);
  }

  @Post(':vacancyId/submit')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  submit(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.submit(user.sub, user.role, employerId, vacancyId);
  }

  @Post(':vacancyId/pause')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  pause(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.pause(user.sub, user.role, employerId, vacancyId);
  }

  @Post(':vacancyId/resume')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  resume(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.resume(user.sub, user.role, employerId, vacancyId);
  }

  @Post(':vacancyId/close')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  close(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.close(user.sub, user.role, employerId, vacancyId);
  }

  @Post(':vacancyId/archive')
  @Roles(UserRole.EMPLOYER, UserRole.ADMIN, UserRole.MODERATOR)
  archive(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('employerId', ParseUUIDPipe) employerId: string,
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.archive(user.sub, user.role, employerId, vacancyId);
  }
}
