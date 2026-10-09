import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCandidateEducationDto {
  @ApiPropertyOptional({ example: 'Университет ИТМО', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  institution?: string;

  @ApiPropertyOptional({ example: 'Компьютерные науки', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  specialization?: string;

  @ApiPropertyOptional({ example: 'Магистр', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  degree?: string;

  @ApiPropertyOptional({ example: 2018, minimum: 1900, maximum: 2200 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  startYear?: number;

  @ApiPropertyOptional({ example: 2020, minimum: 1900, maximum: 2200 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  endYear?: number;

  @ApiPropertyOptional({
    example: 'Тема диплома: рекомендательные системы и персонализация.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
