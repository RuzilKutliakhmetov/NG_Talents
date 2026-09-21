import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateExperienceDto {
  @ApiProperty({ example: 'ООО Рога и Копыта', maxLength: 200 })
  @IsString() @MaxLength(200) companyName!: string;

  @ApiProperty({ example: 'Frontend Developer', maxLength: 200 })
  @IsString() @MaxLength(200) position!: string;

  @ApiProperty({ example: '2023-01-15' })
  @IsDateString() startDate!: string;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional() @IsDateString() endDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() isCurrent?: boolean;

  @ApiPropertyOptional({
    example: 'Разрабатывал интерфейсы на React и TypeScript.',
    maxLength: 5000,
  })
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
}
