import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../../generated/prisma/client.js';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: [NotificationChannel.IN_APP] })
  channel!: NotificationChannel;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data!: unknown;

  @ApiPropertyOptional()
  readAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class NotificationPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class NotificationPageResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiProperty({ type: NotificationPaginationDto })
  pagination!: NotificationPaginationDto;
}

export class NotificationPreferenceResponseDto {
  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ enum: [NotificationChannel.IN_APP] })
  channel!: NotificationChannel;

  @ApiProperty()
  enabled!: boolean;
}
