import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../generated/prisma/client.js';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.VIEWED,
  })
  @IsEnum(ApplicationStatus) status!: ApplicationStatus;

  @ApiPropertyOptional({
    example: 'Рассмотрим кандидата на следующем этапе.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
