import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/client.js';

export class MessageSenderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  firstName!: string | null;

  @ApiPropertyOptional()
  lastName!: string | null;

  @ApiProperty({ enum: [UserRole.CANDIDATE, UserRole.EMPLOYER] })
  role!: UserRole;
}

export class MessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  senderId!: string;

  @ApiProperty({ type: MessageSenderResponseDto })
  sender!: MessageSenderResponseDto;

  @ApiPropertyOptional()
  readAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class MessagePaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class MessagePageResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  items!: MessageResponseDto[];

  @ApiProperty({ type: MessagePaginationDto })
  pagination!: MessagePaginationDto;
}
