import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationType } from '../../generated/prisma/client.js';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
