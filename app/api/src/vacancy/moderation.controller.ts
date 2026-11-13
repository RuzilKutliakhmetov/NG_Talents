import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import {
  ModerationAuditPageResponseDto,
  ModerationAuditQueryDto,
  ModerationQueueQueryDto,
  RejectVacancyDto,
} from './dto/index.js';
import { VacancyService } from './vacancy.service.js';

@ApiTags('Vacancy moderation')
@ApiBearerAuth()
@Controller('moderation/vacancies')
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class ModerationController {
  constructor(private readonly service: VacancyService) {}

  @Get()
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING_MODERATION', 'MODERATION'],
  })
  @ApiQuery({ name: 'search', required: false, maxLength: 200 })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: 50 })
  list(@Query() query: ModerationQueueQueryDto) {
    return this.service.listModerationQueue(query);
  }

  @Post(':vacancyId/start') start(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.startModeration(user.sub, user.role, vacancyId);
  }
  @Post(':vacancyId/approve') approve(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
  ) {
    return this.service.approve(user.sub, user.role, vacancyId);
  }
  @Post(':vacancyId/reject') reject(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
    @Body() dto: RejectVacancyDto,
  ) {
    return this.service.reject(user.sub, user.role, vacancyId, dto);
  }

  @Get(':vacancyId/audit')
  @ApiOkResponse({ type: ModerationAuditPageResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: 50 })
  audit(
    @Param('vacancyId', ParseUUIDPipe) vacancyId: string,
    @Query() query: ModerationAuditQueryDto,
  ) {
    return this.service.listModerationAudit(vacancyId, query.page, query.limit);
  }
}
