import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus, UserRole } from '../../generated/prisma/client.js';
import { MessageResponseDto } from './message-response.dto.js';

export class ConversationParticipantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: [UserRole.CANDIDATE, UserRole.EMPLOYER] })
  role!: UserRole;
}

export class ConversationSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ApplicationStatus })
  applicationStatus!: ApplicationStatus;

  @ApiProperty()
  vacancyId!: string;

  @ApiProperty()
  vacancyTitle!: string;

  @ApiProperty({ type: ConversationParticipantResponseDto })
  otherParticipant!: ConversationParticipantResponseDto;

  @ApiProperty({ type: MessageResponseDto, nullable: true })
  lastMessage!: MessageResponseDto | null;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty()
  updatedAt!: Date;
}

export class ConversationPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ConversationPageResponseDto {
  @ApiProperty({ type: [ConversationSummaryResponseDto] })
  items!: ConversationSummaryResponseDto[];

  @ApiProperty({ type: ConversationPaginationDto })
  pagination!: ConversationPaginationDto;
}

export class ConversationDetailResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ApplicationStatus })
  applicationStatus!: ApplicationStatus;

  @ApiProperty()
  vacancyId!: string;

  @ApiProperty()
  vacancyTitle!: string;

  @ApiProperty({ type: ConversationParticipantResponseDto })
  otherParticipant!: ConversationParticipantResponseDto;
}
