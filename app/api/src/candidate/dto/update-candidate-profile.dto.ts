import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCandidateProfileDto {
  @ApiPropertyOptional({ example: 180000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) desiredSalaryMin?: number;

  @ApiPropertyOptional({ example: 260000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) desiredSalaryMax?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() readyForShiftWork?: boolean;

  @ApiPropertyOptional({
    example: 'Обновлённое описание профиля: готов к релокации и проектной работе.',
    maxLength: 5000,
  })
  @IsOptional() @IsString() @MaxLength(5000) about?: string;
}
