import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateProfileDto {
  @ApiPropertyOptional({ example: 150000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) desiredSalaryMin?: number;

  @ApiPropertyOptional({ example: 220000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0) desiredSalaryMax?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() readyForShiftWork?: boolean;

  @ApiPropertyOptional({
    example: 'Ищу рабочую позицию в продуктовой команде с гибким графиком.',
    maxLength: 5000,
  })
  @IsOptional() @IsString() @MaxLength(5000) about?: string;
}
