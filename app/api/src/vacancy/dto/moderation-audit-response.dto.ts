import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  UserRole,
  VacancyModerationAction,
  VacancyStatus,
} from '../../generated/prisma/client.js';

export class ModerationAuditActorDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
}

export class VacancyModerationAuditResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: VacancyModerationAction })
  action!: VacancyModerationAction;
  @ApiPropertyOptional({ enum: VacancyStatus, nullable: true })
  fromStatus!: VacancyStatus | null;
  @ApiPropertyOptional({ enum: VacancyStatus, nullable: true })
  toStatus!: VacancyStatus | null;
  @ApiPropertyOptional({ nullable: true }) comment!: string | null;
  @ApiProperty({ type: ModerationAuditActorDto })
  actor!: ModerationAuditActorDto;
  @ApiProperty() createdAt!: Date;
}

export class ModerationAuditPageResponseDto {
  @ApiProperty({ type: [VacancyModerationAuditResponseDto] })
  items!: VacancyModerationAuditResponseDto[];

  @ApiProperty({ example: { page: 1, limit: 20, total: 1, totalPages: 1 } })
  meta!: { page: number; limit: number; total: number; totalPages: number };
}
