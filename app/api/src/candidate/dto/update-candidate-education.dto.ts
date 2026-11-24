import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
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

  @ApiPropertyOptional({ example: '2018-09-01', format: 'date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2020-06-30', format: 'date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'Тема диплома: рекомендательные системы и персонализация.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'Факультет информатики', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  faculty?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isIncomplete?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
