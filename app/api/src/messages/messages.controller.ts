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
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/client.js';
import { ConversationListQueryDto } from './dto/conversation-list-query.dto.js';
import {
  ConversationDetailResponseDto,
  ConversationPageResponseDto,
} from './dto/conversation-response.dto.js';
import { MessageHistoryQueryDto } from './dto/message-history-query.dto.js';
import {
  MessagePageResponseDto,
  MessageResponseDto,
} from './dto/message-response.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { MessagesService } from './messages.service.js';

@ApiTags('Messages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' })
@ApiForbiddenResponse({
  description: 'Messaging is available to participants only.',
})
@Controller('messages')
@Roles(UserRole.CANDIDATE, UserRole.EMPLOYER)
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get('unread-count')
  @ApiOkResponse({ schema: { example: { count: 2 } } })
  unreadCount(@CurrentUser() user: { sub: string; role: UserRole }) {
    return this.service.unreadCount(user.sub, user.role);
  }

  @Get('conversations')
  @ApiOkResponse({ type: ConversationPageResponseDto })
  listConversations(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Query() query: ConversationListQueryDto,
  ) {
    return this.service.listConversations(user.sub, user.role, query);
  }

  @Get('conversations/:id')
  @ApiOkResponse({ type: ConversationDetailResponseDto })
  @ApiNotFoundResponse({
    description: 'Conversation does not exist or is inaccessible.',
  })
  getConversation(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getConversation(user.sub, user.role, id);
  }

  @Get('conversations/:id/messages')
  @ApiOkResponse({ type: MessagePageResponseDto })
  @ApiNotFoundResponse({
    description: 'Conversation does not exist or is inaccessible.',
  })
  getMessages(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MessageHistoryQueryDto,
  ) {
    return this.service.getMessages(user.sub, user.role, id, query);
  }

  @Post('conversations/:id/messages')
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiNotFoundResponse({
    description: 'Conversation does not exist or is inaccessible.',
  })
  sendMessage(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.sendMessage(user.sub, user.role, id, dto);
  }

  @Post('conversations/:id/read')
  @ApiOkResponse({ schema: { example: { updated: 4, unreadCount: 0 } } })
  @ApiNotFoundResponse({
    description: 'Conversation does not exist or is inaccessible.',
  })
  markRead(
    @CurrentUser() user: { sub: string; role: UserRole },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead(user.sub, user.role, id);
  }
}
