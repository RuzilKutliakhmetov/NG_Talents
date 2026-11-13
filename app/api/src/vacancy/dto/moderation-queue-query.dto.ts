import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VacancyStatus } from '../../generated/prisma/client.js';

const moderationQueueStatuses = [
  VacancyStatus.PENDING_MODERATION,
  VacancyStatus.MODERATION,
] as const;

export class ModerationQueueQueryDto {
  @IsOptional()
  @IsIn(moderationQueueStatuses)
  status?: (typeof moderationQueueStatuses)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
