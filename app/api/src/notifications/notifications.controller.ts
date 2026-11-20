import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { NotificationListQueryDto } from './dto/notification-list-query.dto.js';
import {
  NotificationPageResponseDto,
  NotificationPreferenceResponseDto,
  NotificationResponseDto,
} from './dto/notification-response.dto.js';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOkResponse({ type: NotificationPageResponseDto })
  list(
    @CurrentUser() user: { sub: string },
    @Query() query: NotificationListQueryDto,
  ) {
    return this.service.list(user.sub, query);
  }

  @Get('unread-count')
  @ApiOkResponse({ schema: { example: { count: 3 } } })
  unreadCount(@CurrentUser() user: { sub: string }) {
    return this.service.unreadCount(user.sub);
  }

  @Patch('read-all')
  @ApiOkResponse({ schema: { example: { updated: 3, unreadCount: 0 } } })
  markAllRead(@CurrentUser() user: { sub: string }) {
    return this.service.markAllRead(user.sub);
  }

  @Get('preferences')
  @ApiOkResponse({ type: NotificationPreferenceResponseDto, isArray: true })
  preferences(@CurrentUser() user: { sub: string }) {
    return this.service.preferences(user.sub);
  }

  @Patch('preferences')
  @ApiOkResponse({ type: NotificationPreferenceResponseDto })
  updatePreference(
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.service.updatePreference(user.sub, dto);
  }

  @Patch(':id/read')
  @ApiOkResponse({ type: NotificationResponseDto })
  markRead(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead(user.sub, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.sub, id);
  }
}
